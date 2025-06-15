import * as cheerio from "cheerio"
import { z } from "zod/v4"

export async function collectLinks({ limit }: { limit?: number }) {
  if (limit && limit <= 0) throw new Error("invalid limit")

  const url = "https://www.prothomalo.com"
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load)

  const unparsed = $("#static-page").html()!
  const unvalidated = JSON.parse(unparsed)
  const parsed = await HomeSP.parseAsync(unvalidated)

  return parsed.qt.data.collection.items
    .flatMap(({ items }) => flattenCollectLinks(items))
    .slice(0, limit)
}

export const BaseStory = z.looseObject({
  "author-name": z.string(),
  tags: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
    }),
  ),
  headline: z.string(),
  slug: z.string(),
  "last-published-at": z.number(),
  subheadline: z.string().nullable(),
  sections: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
    }),
  ),

  "hero-image-metadata": z.nullable(
    z.looseObject({
      width: z.number(),
      height: z.number(),
      "mime-type": z.string().optional(),
    }),
  ),

  "hero-image-attribution": z.string().nullable(),
  "hero-image-caption": z.string().nullable(),
  url: z.string(),
  authors: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
      "avatar-url": z.string().nullable(),
      "twitter-handle": z.string().nullable(),
    }),
  ),
  metadata: z.looseObject({
    excerpt: z.string().optional(),
  }),
})

export const Collection = z.looseObject({
  type: z.literal("collection"),
  get items(): z.ZodType<(StoryType | Collection)[]> {
    return z.array(
      z.discriminatedUnion("type", [
        z.looseObject({ type: z.literal("story"), story: BaseStory }),
        Collection,
      ]),
    )
  },
})

export const HomeSP = z.looseObject({
  qt: z.looseObject({
    data: z.looseObject({
      collection: z.looseObject({
        items: z.array(Collection),
      }),
    }),
  }),
})

export const NewsSP = z.looseObject({
  qt: z.looseObject({
    data: z.looseObject({
      story: BaseStory,
    }),
  }),
})

const flattenCollectLinks = (items: (StoryType | Collection)[]) =>
  items.reduce((acc: string[], item) => {
    if (item.type === "story") acc.push(item.story.url)
    else acc.push(...flattenCollectLinks(item.items))
    return acc
  }, [])

export type StoryType = {
  type: "story"
  story: z.infer<typeof BaseStory>
  [key: string]: unknown
}

export type Collection = {
  type: "collection"
  items: (StoryType | Collection)[]
}

export type HomeSP = z.infer<typeof HomeSP>
export type NewsSP = z.infer<typeof NewsSP>
