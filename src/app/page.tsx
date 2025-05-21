import * as fs from "fs/promises"

import * as cheerio from "cheerio"

import NewsCard from "@/components/newscard"

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

  const news = $newLead3rd.children().map((_, el) =>
    $(el).extract({
      imgAlt: { selector: "img", value: "alt" },
      imgSrc: { selector: "img", value: "data-cfsrc" },
      link: { selector: "a", value: "href" },
      title: "h5",
      body: "p",
    }),
  )

  return (
    <div className="mx-auto w-max">
      {news.map((i, el) => (
        <NewsCard
          key={i}
          className="my-4"
          title={el.title!}
          body={el.body!}
          imgSrc={el.imgSrc!}
          imgAlt={el.imgAlt!}
          link={el.link!}
        />
      ))}
    </div>
  )
}
