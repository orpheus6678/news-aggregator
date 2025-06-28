import * as fs from "fs/promises"

import * as cheerio from "cheerio"
import pLimit from "p-limit"
import prettier from "prettier"
import { z } from "zod/v4"

import * as ProthomAlo from "@/lib/scraper/prothom-alo/main"

export default async function Home() {
  const limiter = pLimit(10)

  let behold: string
  const localFetch = false
  const storeLocation = "junk/prothomalo.json"

  if (localFetch) behold = await fs.readFile(storeLocation, "utf-8")
  else {
    const rawHome = await ProthomAlo.getPayload("https://www.prothomalo.com")
    const homeSP = ProthomAlo.HomeSP.parse(rawHome)

    const rawNewsArray = await Promise.all(
      flattenToHomeCards(homeSP.qt.data.collection.items)
        .filter((s) => s["story-template"] !== "visual-story")
        .map((card) =>
          limiter(() => ProthomAlo.getPayload(card.url)).then((pl) => {
            if (pl === null) console.warn(`no #static-page in ${card.url}`)
            return pl
          }),
        )
        .filter((pl) => pl !== null),
    )

    const rawStories = rawNewsArray.map((rawNews) => rawNews.qt.data.story)
    behold = JSON.stringify(rawStories, null, 2)
    await fs.writeFile(storeLocation, behold)
  }

  const selectedStories = JSON.parse(behold)
    // .filter((s: any) => Object.keys(s.alternative).length > 0)
    // .filter((s: any) => s["story-template"] === "live-blog")
    .filter((s: any) =>
      s.cards.some((c: any) =>
        c["story-elements"].some(
          (se: any) => se.type === "composite" && se.subtype === "references",
        ),
      ),
    )

  const url = "https://www.prothomalo.com/video/v0brel0t8v"
  const stories = z.array(ProthomAlo.Story).parse(selectedStories)

  // const story = await ProthomAlo.getPayload(url)
  //   .then(ProthomAlo.NewsSP.parse)
  //   .then((s) => s.qt.data.story)

  const story = stories.find(
    (s) =>
      s["story-template"] !== "visual-story" &&
      s.cards.some((c) => c.metadata["social-share"].shareable),
  )

  return (
    <pre className="text-sm">
      selected {stories.length} stories {JSON.stringify(stories, null, 2)}
    </pre>
  )
}

// prettier-ignore
type Collection = z.infer<typeof ProthomAlo.HomeSP>["qt"]["data"]["collection"]["items"][number]
type StoryOrCollection = Collection["items"][number]
type Story = Exclude<StoryOrCollection, Collection>["story"]

function flattenToHomeCards(items: StoryOrCollection[]) {
  const stack = [...items]
  const stories: Story[] = Array()
  let item: StoryOrCollection | undefined

  while ((item = stack.pop()))
    if (item.type === "story") stories.push(item.story)
    else stack.push(...item.items)

  return stories
}
