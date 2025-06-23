import { parse, SyntaxKind, walk, WalkOptions } from "html5parser"
import { z } from "zod/v4"

export async function collectLinks({ limit }: { limit?: number }) {
  if (limit && limit <= 0) throw new Error("invalid limit")

  const url = "https://www.prothomalo.com"
  const rawHome = getPayload(url)
  const parsed = await HomeSP.parseAsync(rawHome)

  return flattenCollectLinks(parsed.qt.data.collection.items).slice(0, limit)
}

const BaseStory = z.looseObject({
  url: z.string(),
  headline: z.string(),
  slug: z.string(),

  alternative: z.looseObject({
    home: z.optional(
      z.looseObject({
        default: z.looseObject({
          headline: z.string().nullable(),
          "hero-image": z.nullable(
            z.looseObject({
              "hero-image-metadata": z.optional(
                z.looseObject({
                  width: z.number(),
                  height: z.number(),
                }),
              ),
              source: z.string().nullable().optional(),
              "hero-image-attribution": z.string().optional(),
              "hero-image-alt-text": z.string().optional(),
              "hero-image-s3-key": z.string(),
              "hero-image-caption": z.string().optional(),
              "hero-image-url": z.string(),
            }),
          ),
        }),
      }),
    ),
  }),

  "author-name": z.string(),
  "hero-image-s3-key": z.string().nullable(),

  sections: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
      "section-url": z.string(),
      "display-name": z.string(),
    }),
  ),

  "hero-image-metadata": z.nullable(
    z.looseObject({
      width: z.number(),
      height: z.number(),
      "mime-type": z.string().optional(),
    }),
  ),

  authors: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
      "avatar-url": z.string().nullable(),
      "twitter-handle": z.string().nullable(),
      "avatar-s3-key": z.string().nullable(),
    }),
  ),
})

// prettier-ignore
export const StoryElement = z.discriminatedUnion("type", [
  z.looseObject({
    type: z.literal("text"),
    text: z.string(),
    get subtype() {
      return z.nullable(
      z.literal([
        "summary",
        "blurb",
        "quote",
        "blockquote",
        "also-read",
        "bigfact",
        "cta",

        // these only occur in story-template: interview
        // but kept regardless for simplification's sake
        "question",
        "answer"
      ]),
    )},
  }),

  z.looseObject({
    type: z.literal("image"),
    "image-s3-key": z.string(),
    "alt-text": z.string().nullable(),

    "image-metadata": z.looseObject({
      width: z.number(),
      height: z.number(),
      "mime-type": z.string().optional(),
    }),
  }),

  z.looseObject({
    type: z.literal("youtube-video"),
    url: z.string(),
    "embed-url": z.string(),
  }),

  z.looseObject({
    type: z.literal("jsembed"),
    "embed-js": z.string(),
  }),

  z.looseObject({
    type: z.literal("title"),
    text: z.string(),
  }),

  z.looseObject({
    type: z.literal("data"),
    subtype: z.literal("table"),
    data: z.looseObject({
      content: z.string(),
      "content-type": z.literal("csv"),
    }),
  }),

  z.discriminatedUnion("subtype", [
    z.looseObject({
      type: z.literal("composite"),
      subtype: z.literal("references"),

      // contains StoryElements
      "story-elements": z.looseObject({}).array(),
    }),

    // known only to exist in story-template: interview
    // but kept regardless for simplification's sake
    z.looseObject({
      type: z.literal("composite"),
      subtype: z.literal("image-gallery"),
      "story-elements": z.looseObject({}).array(),
    }),
  ])
]).and(
  z.looseObject({
    title: z.string(),
    metadata: z.looseObject({}),
  }),
)

export const HomeCard = z.looseObject({
  ...BaseStory.shape,

  tags: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
    }),
  ),

  "last-published-at": z.number(),
  subheadline: z.string().nullable(),

  sections: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
      "section-url": z.string(),
      "display-name": z.string(),
    }),
  ),

  "hero-image-attribution": z.string().nullable(),
  "hero-image-caption": z.string().nullable(),

  metadata: z.looseObject({
    excerpt: z.string().optional(),
  }),

  "story-template": z.literal([
    "live-blog",
    "text",
    "video",
    "photo",
    "visual-story",
    "listicle",
    "interview",
  ]),
})

export const NewsCard = z.looseObject({
  "story-elements": z.array(StoryElement),
  "card-updated-at": z.number(),
  "card-added-at": z.number(),
  status: z.literal("draft"),
  metadata: z.looseObject({
    "social-share": z.looseObject({
      title: z.string(),
      message: z.string().nullable(),
      image: z.nullable(
        z.looseObject({
          key: z.string(),
          url: z.string().nullable(),
          attribution: z.string().nullable(),
          caption: z.string().nullable(),
          "alt-text": z.string().nullable(),
          metadata: z.looseObject({
            width: z.number(),
            height: z.number(),
            "mime-type": z.string().optional(),
          }),
        }),
      ),
    }),
  }),
})

export const Story = z.looseObject({
  ...HomeCard.shape,

  seo: z.looseObject({
    "meta-keywords": z.array(z.string()),
    "meta-description": z.string().optional(),
  }),

  "updated-at": z.number(),
  "linked-stories": z.optional(z.record(z.string(), BaseStory)),
  "content-created-at": z.number(),
  "published-at": z.number(),
  "is-live-blog": z.boolean(),
  "storyline-title": z.string().nullable(),
  summary: z.string().nullable(),
  "hero-image-hyperlink": z.string().nullable(),
  status: z.literal("published"),
  "hero-image-alt-text": z.string().nullable(),
  "content-type": z.literal("story"),
  "content-updated-at": z.number(),
  "first-published-at": z.number(),
  "created-at": z.number(),
  "publish-at": z.number().nullable(),
  "last-correction-published-at": z.number().optional(),
  cards: z.array(NewsCard),
})

export const Collection = z.looseObject({
  type: z.literal("collection"),
  get items(): z.ZodType<(StoryVariant | Collection)[]> {
    return z.array(
      z.discriminatedUnion("type", [
        z.looseObject({ type: z.literal("story"), story: HomeCard }),
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
      story: Story,
    }),
  }),
})

const flattenCollectLinks = (items: (StoryVariant | Collection)[]) =>
  items.reduce((acc: string[], item) => {
    if (item.type === "story") acc.push(item.story.url)
    else acc.push(...flattenCollectLinks(item.items))
    return acc
  }, [])

export async function getPayload(url: string | URL) {
  let payload = null

  const walkOpts = {
    enter(node) {
      if (
        node.type === SyntaxKind.Tag &&
        node.name === "script" &&
        node.body &&
        // prettier-ignore
        node.attributes.some(({ name, value }) => name.value === "id" && value?.value === "static-page")
      ) {
        const [body] = node.body
        if (body.type === SyntaxKind.Text) payload = body.value
      }
    },
  } satisfies WalkOptions

  await fetch(url)
    .then((res) => res.text())
    .then((rawHtml) => walk(parse(rawHtml), walkOpts))

  return JSON.parse(payload ?? "null")
}

export type StoryElement = z.infer<typeof StoryElement>
export type HomeCard = z.infer<typeof HomeCard>
export type NewsCard = z.infer<typeof NewsCard>
export type Story = z.infer<typeof Story>

type StoryVariant = {
  type: "story"
  story: HomeCard
  [key: string]: unknown
}

export type Collection = {
  type: "collection"
  items: (StoryVariant | Collection)[]
}

export type HomeSP = z.infer<typeof HomeSP>
export type NewsSP = z.infer<typeof NewsSP>
