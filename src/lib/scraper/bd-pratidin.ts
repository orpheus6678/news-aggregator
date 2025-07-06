import * as fs from "fs/promises"

import { NewsSource } from "@prisma/client"
import * as cheerio from "cheerio"
import { z } from "zod/v4"

import { banglaDateTimetoEnglish } from "@/lib/datetime"
import prisma from "@/lib/prisma"

const NewsSchema = z.object({
  url: z.url().nonempty(),
  source: z.literal(NewsSource.BdPratidin),
  headline: z.string().nonempty(),
  author: z.string().nonempty(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  section: z.string().nonempty(),
  tags: z.string().array(),

  data: z.object({
    img: z.object({
      src: z.url().nonempty(),
      alt: z.string().nonempty(),
      footer: z.string().nullable(),
    }),

    text: z.array(z.string().nonempty()).nonempty(),
  }),
})

export type News = z.infer<typeof NewsSchema>

export async function collectLinks({ limit }: { limit?: number }) {
  if (limit && limit <= 0) throw new Error("invalid limit")

  const url = "https://www.bd-pratidin.com"
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load)

  const $anchors = $("a")

  const newsLinks = new Set(
    $anchors
      .toArray()
      .filter((el) => {
        try {
          const { pathname } = new URL($(el).attr("href") ?? "")
          const pathComponents = decodeURIComponent(pathname)
            .split("/")
            .filter(Boolean)

          if (pathComponents.length !== 5) return false

          let [_cat, year, month, date, _time] = pathComponents
          let [yy, mm, dd] = [year, month, date].map((s) => parseInt(s))

          if (isNaN(new Date(yy, mm, dd).valueOf())) return false
        } catch (e) {
          if (e instanceof TypeError) return false
          throw e
        }

        return true
      })
      .map((el) => `${$(el).attr("href")}`),
  )
    .values()
    .toArray()
    .slice(0, limit)

  if (newsLinks.length === 0) throw new Error("zero links found")
  return newsLinks
}

export async function collectNewsFromLink(url: string | URL) {
  // TODO: cheerio sucks ass replace with htmlparser2 asap

  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load)

  const $detailsArea = $(".detailsArea")

  const newsData = $detailsArea.extract({
    headline: { selector: ".n_head" },
    author: {
      selector: "article>p:last-child",
      value: (el) => $(el).text().trim(),
    },

    section: {
      selector: ".row>.col-2>a:nth-child(2)",
      value: (el) => $(el).text().trim(),
    },

    publishedAt: {
      selector: ":has(>.bi.bi-stopwatch)",
      value: (el) => {
        let [_, __, dateText] = $(el).text().split("\n")
        dateText = dateText.trim()
        return banglaDateTimetoEnglish(dateText).toISOString()
      },
    },

    updatedAt: {
      selector: ".updNews",
      value: (el) => {
        let [_, __, dateText] = $(el).text().split("\n")
        dateText = dateText.trim()
        return banglaDateTimetoEnglish(dateText).toISOString()
      },
    },

    tags: [
      {
        selector: ".tagArea>ul>li>a",
        value: (el) => $(el).text().trim(),
      },
    ],

    img: {
      selector: "#adf-overlay",
      value: (el) => ({
        src: $(el).attr("src"),
        alt: $(el).attr("alt"),
        footer: $(el).next("blockquote").text().trim() || null,
      }),
    },

    text: {
      selector: "article",
      value: (el) => {
        const lines = $(el)
          .text()
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

        lines.pop()
        return lines
      },
    },
  })

  return NewsSchema.safeParse({
    url: url.toString(),
    source: NewsSource.BdPratidin,
    headline: newsData.headline,
    author: newsData.author,
    publishedAt: newsData.publishedAt,
    updatedAt: newsData.updatedAt ?? newsData.publishedAt,
    section: newsData.section,
    tags: newsData.tags,
    data: {
      img: newsData.img,
      text: newsData.text,
    },
  })
}

export async function insertNewsToDatabase(news: News[]) {
  prisma.news.createMany({
    data: news,
  })
}
