import chalk from "chalk"
import { NextRequest, NextResponse } from "next/server"

import {
  collectLinks as collectLinksFromBangladeshPratidin,
  collectNewsFromLink as collectNewsFromBangladeshPratidinLink,
} from "@/lib/scraper/bd-pratidin"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lim = searchParams.get("limit")

  try {
    let limit: number | undefined
    if (lim !== null && (isNaN((limit = Number(lim))) || limit <= 0))
      throw new Error("invalid limit")

    const newsLinks = await collectLinksFromBangladeshPratidin({ limit })

    const news = (
      await Promise.all(
        newsLinks.map((url) =>
          collectNewsFromBangladeshPratidinLink(url).catch((_err) => {
            /* TODO: add better logging */
            console.error(`${new URL(url).pathname} ${chalk.red("throwed")}`)
            return undefined
          }),
        ),
      )
    ).filter((item) => item !== undefined)

    return NextResponse.json(news, req)
  } catch (error) {
    console.error(error)

    return new Response(
      error instanceof Error ? error.message : "unknown error",
      { status: 500 },
    )
  }
}
