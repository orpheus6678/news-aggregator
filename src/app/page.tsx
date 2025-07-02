import * as fs from "fs/promises"

import * as cheerio from "cheerio"
import prettier from "prettier"

export default async function Home() {
  if (process.env.NODE_ENV === "development") {
    const prettier = await import("prettier")
    const formattedHtml = await prettier.format("<html></html>", {
      parser: "html",
    })
    await fs.mkdir("dump", { recursive: true })
    await fs.writeFile("dump/newLead3rd.html", formattedHtml)
  }
}
