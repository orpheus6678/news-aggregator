import * as fs from "fs/promises"

import * as cheerio from "cheerio"
import prettier from "prettier"

import {
  Collection,
  HomeSP,
  NewsSP,
  StoryType,
} from "@/lib/scraper/prothom-alo"

export default async function Home() {
  const $home = await loadPage("https://www.prothomalo.com")
  const homeUnparsed = $home("#static-page").html()!
  const homeUnvalidated = JSON.parse(homeUnparsed)
  const homeParsed = HomeSP.parse(homeUnvalidated)

  const stories = homeParsed.qt.data.collection.items.flatMap(({ items }) =>
    flattenCollected(items),
  )

  const { url } = stories.find((s) => s["story-template"] === "live-blog")!

  const $news = await loadPage(url)
  const newsUnparsed = $news("#static-page").html()!
  const newsUnvalidated = JSON.parse(newsUnparsed)
  const newsParsed = NewsSP.parse(newsUnvalidated)

  return <pre className="text-sm">{JSON.stringify(newsParsed, null, 2)}</pre>
}

const loadPage = (url: string | URL): Promise<cheerio.CheerioAPI> =>
  fetch(url)
    .then((res) => res.text())
    .then(cheerio.load)

const flattenCollected = (items: (StoryType | Collection)[]) =>
  items.reduce((acc: StoryType["story"][], item) => {
    if (item.type === "story") acc.push(item.story)
    else acc.push(...flattenCollected(item.items))
    return acc
  }, [])
