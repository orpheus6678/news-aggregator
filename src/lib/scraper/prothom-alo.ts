import { parse, SyntaxKind, walk, WalkOptions } from "html5parser"
import { z } from "zod/v4"

export async function collectLinks({ limit }: { limit?: number }) {
  if (limit && limit <= 0) throw new Error("invalid limit")

  const url = "https://www.prothomalo.com"
  const rawHome = getPayload(url)
  const parsed = await HomeSP.parseAsync(rawHome)

  return flattenCollectLinks(parsed.qt.data.collection.items).slice(0, limit)
}

const Base = z.looseObject({
  headline: z.string(),
  slug: z.string(),
  authors: z.array(z.looseObject({ name: z.string() })),
  "author-name": z.string(),

  alternative: z.looseObject({
    home: z.optional(
      z.looseObject({
        default: z.looseObject({
          headline: z.string().nullable(),
          "hero-image": z.nullable(
            z.looseObject({
              "hero-image-metadata": z.optional(
                z.nullable(
                  z.looseObject({
                    width: z.number(),
                    height: z.number(),
                  }),
                ),
              ),

              source: z.string().nullable().optional(),
              "hero-image-attribution": z.string().nullable().optional(),
              "hero-image-alt-text": z.string().nullable().optional(),
              "hero-image-s3-key": z.string(),
              "hero-image-caption": z.string().nullable().optional(),
              "hero-image-url": z.string(),
            }),
          ),
        }),
      }),
    ),
  }),
})

const TextElement = z.discriminatedUnion("subtype", [
  z.looseObject({
    type: z.literal("text"),
    text: z.string(),

    subtype: z.nullable(
      z.literal(["summary", "blurb", "quote", "blockquote", "bigfact", "cta"]),
    ),
  }),

  z.looseObject({
    type: z.literal("text"),
    subtype: z.literal("also-read"),
    text: z.string(),

    metadata: z.looseObject({
      "linked-story-id": z.string(),

      "linked-story": z.looseObject({
        ...Base.shape,
        "frontend-url": z.string(),
        authors: z.array(
          z.looseObject({
            name: z.string(),
            email: z.string().optional(),
          }),
        ),
      }),
    }),
  }),
])

const ImageElement = z.looseObject({
  type: z.literal("image"),
  title: z.string(),
  "image-s3-key": z.string(),
  "image-attribution": z.string(),
  "alt-text": z.string().nullable(),

  "image-metadata": z.looseObject({
    width: z.number(),
    height: z.number(),
    "mime-type": z.string().optional(),
  }),
})

const TitleElement = z.looseObject({
  type: z.literal("title"),
  text: z.string(),
})

const EmbedElement = z.discriminatedUnion("subtype", [
  z.looseObject({
    type: z.literal("jsembed"),
    "embed-js": z.string(),
    subtype: z.literal("tiktok-video"),

    metadata: z.looseObject({
      "tiktok-video-id": z.string(),
      "tiktok-video-url": z.string(),
      provider: z.literal("tiktok"),
    }),
  }),

  z.looseObject({
    type: z.literal("jsembed"),
    "embed-js": z.string(),
    subtype: z.literal("tweet"),

    metadata: z.looseObject({
      "tweet-url": z.string(),
      provider: z.literal("twitter"),
      "tweet-id": z.string(),
    }),
  }),

  z.looseObject({
    type: z.literal("jsembed"),
    "embed-js": z.string(),
    subtype: z.null(),
  }),
])

const CompositeElement = z.discriminatedUnion("subtype", [
  z.looseObject({
    type: z.literal("composite"),
    title: z.string(),
    metadata: z.looseObject({}),
    subtype: z.literal("references"),

    // contains StoryElements
    "story-elements": z.looseObject({}).array(),
  }),

  z.looseObject({
    type: z.literal("composite"),
    title: z.string(),
    subtype: z.literal("image-gallery"),
    "story-elements": z.array(ImageElement),

    metadata: z.looseObject({
      type: z.literal(["gallery", "slideshow"]),
    }),
  }),
])

export const StoryElement = z.discriminatedUnion("type", [
  TextElement,
  ImageElement,
  TitleElement,
  EmbedElement,
  CompositeElement,

  z.looseObject({
    type: z.literal("youtube-video"),
    url: z.string(),
    "embed-url": z.string(),
  }),

  z.looseObject({
    type: z.literal("data"),
    title: z.string(),
    metadata: z.looseObject({ "has-header": z.boolean() }),
    subtype: z.literal("table"),

    data: z.looseObject({
      content: z.string(),
      "content-type": z.literal("csv"),
    }),
  }),
])

export const HomeStory = z.looseObject({
  ...Base.shape,
  url: z.string(),
  subheadline: z.string().nullable(),
  "last-published-at": z.number(),

  authors: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
      "avatar-url": z.string().nullable(),
      "twitter-handle": z.string().nullable(),
      "avatar-s3-key": z.string().nullable(),
    }),
  ),

  tags: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
    }),
  ),

  sections: z.array(
    z.looseObject({
      slug: z.string(),
      name: z.string(),
      "section-url": z.string(),
      "display-name": z.string(),
    }),
  ),

  "hero-image-s3-key": z.string().nullable(),
  "hero-image-attribution": z.string().nullable(),
  "hero-image-caption": z.string().nullable(),

  "hero-image-metadata": z.nullable(
    z.looseObject({
      width: z.number(),
      height: z.number(),
      "mime-type": z.string().optional(),
    }),
  ),

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
    }),
  }),
})

const BaseStory = z.looseObject({
  ...HomeStory.shape,

  seo: z.looseObject({
    "meta-keywords": z.array(z.string()).optional(),
    "meta-description": z.string().optional(),
  }),

  "updated-at": z.number(),

  "linked-stories": z.optional(
    z.record(
      z.string(),
      z.looseObject({
        ...Base.shape,
        url: z.string(),
        "hero-image-s3-key": z.string().nullable(),

        authors: z.array(
          z.looseObject({
            slug: z.string(),
            name: z.string(),
            "avatar-url": z.string().nullable(),
            "twitter-handle": z.string().nullable(),
            "avatar-s3-key": z.string().nullable(),
          }),
        ),

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
      }),
    ),
  ),

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
})

// not designed to handle story-template: visual-story
export const Story = z.discriminatedUnion("story-template", [
  z.looseObject({ "story-template": z.literal("visual-story") }),

  z.looseObject({
    ...BaseStory.shape,
    cards: z.array(NewsCard),
    "story-template": z.literal(["live-blog", "text", "video", "photo"]),
  }),

  z.looseObject({
    ...BaseStory.shape,
    "story-template": z.literal("listicle"),

    // prettier-ignore
    cards: z.tuple([
      z.looseObject({
        ...NewsCard.shape,
        "card-type": z.literal("introduction"),
      }),
    ])
      .rest(
        z.looseObject({
          ...NewsCard.shape,
          listicleTitle: z.looseObject({
            type: z.literal("title"),
            text: z.string(),
          }),
        }),
      ),
  }),

  z.looseObject({
    ...BaseStory.shape,
    "story-template": z.literal("interview"),

    cards: z.array(
      z.looseObject({
        ...NewsCard.shape,

        "story-elements": z.array(
          z.discriminatedUnion("type", [
            TitleElement,
            ImageElement,

            // TextElement with three more subtypes
            z.discriminatedUnion("subtype", [
              ...TextElement.options,

              z.looseObject({
                type: z.literal("text"),
                subtype: z.literal(["question", "answer", "q-and-a"]),
                text: z.string(),
              }),
            ]),
          ]),
        ),
      }),
    ),
  }),
])

export const Collection = z.looseObject({
  type: z.literal("collection"),

  get items(): z.ZodType<(_TypeStory | Collection)[]> {
    return z.array(
      z.discriminatedUnion("type", [
        z.looseObject({ type: z.literal("story"), story: HomeStory }),
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

const flattenCollectLinks = (items: (_TypeStory | Collection)[]) =>
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

type _TypeStory = {
  type: "story"
  story: z.infer<typeof HomeStory>
  [key: string]: unknown
}

type Collection = {
  type: "collection"
  items: (_TypeStory | Collection)[]
}

export type HomeSP = z.infer<typeof HomeSP>
export type NewsSP = z.infer<typeof NewsSP>
