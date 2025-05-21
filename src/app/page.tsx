import * as fs from "fs/promises"

import * as cheerio from "cheerio"
import prettier from "prettier"

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

  const formattedHtml = await prettier.format($newLead3rd.html()!, {
    parser: "html",
  })
  await fs.mkdir("dump", { recursive: true })
  await fs.writeFile("dump/newLead3rd.html", formattedHtml)

  const news = $newLead3rd.children().map((_, el) =>
    $(el).extract({
      imgSrc: { selector: "img", value: "data-cfsrc" },
      link: { selector: "a", value: "href" },
      title: "h5",
      body: "p",
    }),
  )

  return news.map((i, el) => (
    <div key={i}>
      <a href={el.link}>
        <img src={el.imgSrc} />
        <h1 className="font-bold">{el.title}</h1>
        <p>{el.body}</p>
      </a>
    </div>
  ))
}
