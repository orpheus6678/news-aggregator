import * as fs from "fs/promises"

import * as cheerio from "cheerio"

type News = {
  url: string
  title: string
  author: string | null
  category: string | null
  publishedAt: string | null
  updatedAt: string | null
  topics: string[]
  img: {
    src: string | null
    alt: string | null
    footer: string | null
  }
  text: string[]
}

/**
 *  Collects the latest article URLs from the homepage.
 */
export async function collectLinks({ limit }: { limit?: number }) {
  if (limit !== undefined && limit <= 0) {
    throw new Error("invalid limit")
  }

  const baseUrl = "https://www.thedailystar.net"
  const html = await fetch(baseUrl).then((r) => r.text())
  const $ = cheerio.load(html)
  const allowedCategories = [
    "opinion",
    "business",
    "sports",
    "news",
    "entertainment",
    "life-living",
    "campus",
    "tech-startup",
    "star-multimedia",
    "books-literature",
    "environment",
  ]

  const links = $("a")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((href): href is string => {
      if (!href) return false

      const url = new URL(href, baseUrl)
      const pathParts = url.pathname.split("/").filter(Boolean)

      // Must have at least 3 parts: category/subcategory/article-slug
      if (pathParts.length < 3) return false

      // First part must be in allowed categories
      return allowedCategories.includes(pathParts[0])
    })
    .map((href) => new URL(href, baseUrl).toString())
    .filter((url, i, arr) => arr.indexOf(url) === i)
    .slice(0, limit)
  // pick only internal "/news/..." links

  if (process.env.NODE_ENV === "development") {
    await fs.mkdir("dump", { recursive: true })
    await fs.writeFile("dump/dailyStarLinks.txt", links.join("\n"))
  }

  return links
}

/**
 *  Fetches a single article page and extracts all the fields.
 */
export async function collectNewsFromLink(rawUrl: string | URL) {
  const url = rawUrl.toString()
  const html = await fetch(url).then((r) => r.text())
  const $ = cheerio.load(html)

  // title
  const title = $(".article-title").first().text().trim()

  // author
  let author = $("span.author, .byline, .node-header .author")
    .first()
    .text()
    .trim()
  author = author ? author.replace(/^By\s*/i, "") : ""

  // category (from breadcrumb)
  let category = null
  const match = url.match(/thedailystar\.net\/([^/]+)\//)
  if (match) {
    category = match[1]
  }

  // publishedAt & updatedAt
  // The Daily Star puts the date in <span class="date">Jun 14, 2025, 7:30 pm</span>

  let date = $(".pane-news-details-left .content>.date").contents()

  const publishedAt = $(date[0]).text().trim()
  const updatedAt = $(date[2]).text().trim()
  console.log(publishedAt)
  console.log(updatedAt)

  // topics/tags
  const topics = $(".tags a, .news-tags a")
    .map((_, el) => $(el).text().trim())
    .get()

  // main image

  const footer = $(".caption").text()
  const $img = $(".lg-gallery>picture>img")
  const img = {
    src: $img.attr("data-srcset") || null,
    alt: $img.attr("alt") || null,
    footer: footer || null,
  }

  // article text
  const text = $("article p")
    .map((_, el) => $(el).text().trim())
    .get()

  const news: News = {
    url,
    title,
    author,
    publishedAt,
    updatedAt,
    category,
    topics,
    img,
    text,
  }
  await fs.writeFile(
    `dump/news${url.slice(-7)}.json`,
    JSON.stringify(news, null, 2),
  )
  return news
}
