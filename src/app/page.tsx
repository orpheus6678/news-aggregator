import * as fs from "fs/promises"

import * as cheerio from "cheerio"

import FilterCard from "@/components/filtercard"
import NewsCard, { NewsProps } from "@/components/newscard"

export default async function Home() {
  const $ = await cheerio.fromURL("https://www.bd-pratidin.com/")
  const $newLead3rd = $(".newLeadArea")
    .children()
    .eq(0)
    .children()
    .eq(1)
    .children()
    .eq(1)
    .children()
    .eq(0)

  if (process.env.NODE_ENV === "development") {
    const prettier = await import("prettier")
    const formattedHtml = await prettier.format($newLead3rd.html()!, {
      parser: "html",
    })
    await fs.mkdir("dump", { recursive: true })
    await fs.writeFile("dump/newLead3rd.html", formattedHtml)
  }

  // prettier-ignore
  const news = $newLead3rd.children().map((_, el) =>
    $(el).extract({
      imgAlt: { selector: "img", value: "alt" },
      imgSrc: { selector: "img", value: "data-cfsrc" },
      link: { selector: "a", value: "href" },
      title: "h5",
      body: "p",
    }) as NewsProps,
  )

  return (
    <div className="m-4 flex items-start space-x-4">
      <FilterCard className="sticky top-4" />
      <div className="space-y-4">
        {news.map((i, el) => (
          <NewsCard key={i} {...el} />
        ))}
      </div>
    </div>
  )
}
