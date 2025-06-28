import { parse, SyntaxKind, walk, WalkOptions } from "html5parser"
import { z } from "zod/v4"

import { _TypeStory, Collection, HomeSP, NewsSP, Story } from "./in-schema"

export async function collectLinks({ limit }: { limit?: number }) {
  if (limit && limit <= 0) throw new Error("invalid limit")

  const url = "https://www.prothomalo.com"
  const rawHome = getPayload(url)
  const parsed = await HomeSP.parseAsync(rawHome)

  return flattenCollectLinks(parsed.qt.data.collection.items).slice(0, limit)
}

function flattenCollectLinks(items: (_TypeStory | Collection)[]) {
  const stack = [...items]
  const urls: string[] = []
  let item: _TypeStory | Collection | undefined

  while ((item = stack.pop()))
    if (item.type === "story") urls.push(item.story.url)
    else stack.push(...item.items)

  return urls
}

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

export { HomeSP, NewsSP, Story }
