import * as fs from "fs/promises"

import * as cheerio from "cheerio"

import { banglaDateTimetoEnglish } from "@/lib/datetime"

type News = {
  url: string
  title: string
  author: string
  category: string
  publishedAt: string
  updatedAt: string
  topics: string[]
  img: {
    src: string
    alt: string
    footer: string
  }
  text: string[]
}

export async function collectLinks({ limit }: { limit?: number }) {
  if (limit && limit <= 0) throw new Error("invalid limit")

  const url = "https://www.bd-pratidin.com"
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load)

  const $anchors = $("a")

  const newsLinks = $anchors
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
    .map((el) => `${$(el).attr("href")}`)
    .slice(0, limit)

  if (process.env.NODE_ENV === "development") {
    await fs.mkdir("dump", { recursive: true })
    await fs.writeFile("dump/bdPratidinLinks.txt", newsLinks.join("\n"))
  }

  return newsLinks
}

export async function collectNewsFromLink(url: string | URL) {
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load)

  const $detailsArea = $(".detailsArea")

  const newsWithoutURL = $detailsArea.extract({
    title: { selector: ".n_head" },
    author: {
      selector: "article>p:last-child",
      value: (el) => $(el).text().trim(),
    },

    category: {
      selector: ".row > .col-2 > a:nth-child(2)",
      value: (el) => $(el).text().trim(),
    },

    publishedAt: {
      selector: ".pubNews",
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

    topics: [
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

  const news = { url: url.toString(), ...newsWithoutURL } as News
  return news
}
