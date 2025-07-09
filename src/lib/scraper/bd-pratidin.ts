import assert from "assert"

import { NewsSource } from "@prisma/client"
import * as cssEngine from "css-select"
import * as dtf from "date-fns"
import { enUS } from "date-fns/locale/en-US"
import * as domutils from "domutils"
import * as htmlparser2 from "htmlparser2"
import { z } from "zod/v4"

const DateTimeSchema = z.custom<string>((data) =>
  (typeof data === "object" && !(data instanceof Date)) ||
  typeof data !== "string"
    ? false
    : !Number.isNaN(parseDate(data)),
)

export const InSchema = z.looseObject({
  "@type": z.literal("NewsArticle"),
  url: z.url({ hostname: /^www\.bd-pratidin\.com$/ }),
  headline: z.string().nonempty(),
  articleBody: z.string().nonempty(),
  keywords: z.string(),

  image: z.looseObject({
    "@type": z.literal("ImageObject"),
    url: z.url(),
    height: z.int(),
    width: z.int(),
  }),

  datePublished: DateTimeSchema,
  dateModified: DateTimeSchema,

  // articles with no author considered invalid for now
  author: z.strictObject({
    "@type": z.literal("Person"),
    name: z.string().nonempty(),
  }),
})

const NewsSchema = z.object({
  url: z.url().nonempty(),
  source: z.literal(NewsSource.BdPratidin),
  headline: z.string().nonempty(),
  author: z.object({ name: z.string() }),
  publishedAt: z.date(),
  updatedAt: z.date(),

  section: z.object({
    name: z.string().nonempty(),
    displayName: z.string().nonempty(),
  }),

  tags: z.array(
    z.object({
      name: z.string().nonempty(),
      displayName: z.string().nonempty(),
    }),
  ),

  image: z.object({
    src: z.url().nonempty(),
    width: z.int().nonnegative(),
    height: z.int().nonnegative(),
    alt: z.string().optional(),
  }),

  data: z.object({
    discriminator: z.literal("bdpratidin"),
    imageFooter: z.string().optional(),

    // ignore articles with no signature for now
    signature: z.string().nonempty(),

    // prettier-ignore
    body: z.array(
      z.object({
        type: z.literal("plain"),
        text: z.string().nonempty(),
      }),
    ).nonempty(),
  }),
})

export type News = z.infer<typeof NewsSchema>

export async function collectLinks(params?: { limit: number }) {
  if (params && params.limit <= 0) throw new Error("invalid limit")

  let isNewsLink = false
  const newsLinks = new Set<string>()

  const parser = new htmlparser2.Parser({
    onattribute(name, value) {
      if (name === "class" && value.includes("stretched-link"))
        isNewsLink = true

      if (isNewsLink && name === "href") {
        newsLinks.add(value)
        isNewsLink = false
      }
    },
  })

  const url = "https://www.bd-pratidin.com"
  const response = await fetch(url)
  const html = await response.text()
  parser.write(html)
  parser.end()

  if (newsLinks.size === 0) throw new Error("zero links found")
  return Array.from(newsLinks)
}

export let collectNewsFromLink: (url: string | URL) => Promise<CollectResult>

collectNewsFromLink = async (url) => {
  // ignores video links for now
  url = new URL(url)

  if (url.pathname.includes("/video/"))
    return {
      success: false,
      error: {
        type: "general",
        reason: "is a video",
        url,
      },
    }

  const response = await fetch(url)
  const html = await response.text()
  const doc = htmlparser2.parseDocument(html)

  const dataNode = cssEngine.selectOne("script[type='application/json']", doc)
  assert.ok(dataNode)

  // the use of String.replaceAll potentially fixes broken JSONs
  const rawData = domutils.textContent(dataNode).replaceAll("\r\n", "")
  const rawJson = JSON.parse(rawData)
  let inParseResult = InSchema.safeParse(rawJson)

  // prettier-ignore
  if (!inParseResult.success) return {
    success: false,
    error: {
      type: "inParse",
      zodError: inParseResult.error,
      url,
    }
  }

  const {
    headline,
    datePublished,
    dateModified,
    keywords,
    image: __image,
    author: { name: authorName },
  } = inParseResult.data

  const textBody = cssEngine.selectAll("article > p", doc)
  assert.ok(textBody)

  let maybeSig: string | undefined
  let sigExists = false

  while (textBody.length > 0) {
    maybeSig = domutils.textContent(textBody.pop()!).trim()

    if (
      maybeSig.startsWith("বিডি প্রতিদিন") ||
      maybeSig.startsWith("বিডি-প্রতিদিন") ||
      maybeSig.startsWith("বিডিপ্রতিদিন") ||
      maybeSig.startsWith("লেখক") ||
      maybeSig.startsWith("সৌজন্যে")
    ) {
      sigExists = true
      break
    }

    if (maybeSig.length > 0) break
  }

  // ignore articles with no signature for now
  // prettier-ignore
  if (!sigExists) return {
    success: false,
    error: {
      type: "general",
      reason: "has no signature",
      url,
    }
  }

  assert.ok(maybeSig)
  const signature = maybeSig

  if (domutils.findOne((node) => node.tagName !== "br", doc.childNodes))
    return {
      success: false,
      error: {
        type: "general",
        reason: "has non-plain body",
        url,
      },
    }

  // prettier-ignore
  const body = textBody.map(domutils.textContent)
    .map((s) => ({
      type: "plain" as const,
      text: s.trim(),
    }))

  const blockquoteFooter = cssEngine.selectOne(".blockquote-footer", doc)

  // prettier-ignore
  const imageFooter = (blockquoteFooter &&
    domutils.textContent(blockquoteFooter).trim()) ?? undefined

  const secName = url.pathname.split("/").at(1)
  assert.ok(secName)

  const secNode = cssEngine.selectOne(":has(>.bi.bi-house)+a", doc.childNodes)

  assert.ok(secNode)
  const secDispName = domutils.textContent(secNode).trim()
  assert.ok(secDispName)

  const section = {
    name: secName,
    displayName: secDispName,
  }

  const author = { name: authorName }
  const publishedAt = parseDate(datePublished)
  const updatedAt = parseDate(dateModified)
  const tags = [] as z.infer<typeof NewsSchema>["tags"]

  if (keywords.length > 0)
    keywords
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => tags.push({ name, displayName: name }))

  const img = domutils.getElementById("adf-overlay", doc)
  assert.ok(img)
  const alt = domutils.getAttributeValue(img, "alt")
  assert.ok(alt)

  const image = {
    src: __image.url,
    height: __image.height,
    width: __image.width,
    alt,
  }

  const data = {
    discriminator: "bdpratidin" as const,
    imageFooter,
    signature,
    body,
  }

  const outParseResult = NewsSchema.safeParse({
    source: NewsSource.BdPratidin,
    url: url.toString(),
    headline,
    publishedAt,
    updatedAt,
    image,
    author,
    section,
    tags,
    data,
  } satisfies z.infer<typeof NewsSchema>)

  // prettier-ignore
  if (!outParseResult.success) return {
    success: false,
    error: {
      type: "outParse",
      zodError: outParseResult.error,
      url,
    }
  }

  return { success: true, news: outParseResult.data }
}

function parseDate(date: string) {
  return dtf.parse(date, "p, MMMM yyyy, EEEE", new Date(), { locale: enUS })
}

type CollectResult =
  | {
      success: true
      news: z.infer<typeof NewsSchema>
    }
  | {
      success: false
      error: {
        type: "general"
        reason: string
        url: URL
      }
    }
  | {
      success: false
      error: {
        type: "inParse"
        zodError: z.ZodError<z.infer<typeof InSchema>>
        url: URL
      }
    }
  | {
      success: false
      error: {
        type: "outParse"
        zodError: z.ZodError<z.infer<typeof NewsSchema>>
        url: URL
      }
    }
