import { NewsSource } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

import prisma from "@/lib/prisma"
import {
  collectLinks,
  collectNewsFromLink,
  News,
} from "@/lib/scraper/bd-pratidin"

export async function GET(req: NextRequest) {
  type ParsingError = {
    issues: z.ZodError<News>["issues"]
    url: string
  }

  let payload = {
    info: [] as string[],
    errors: {
      critical: null as string | null,
      parsing: [] as Array<ParsingError>,
    },
  }

  const newsLinks: string[] = []

  const limit = z.coerce
    .number()
    .int()
    .nonnegative()
    .nullable()
    .transform((val) => (val === null ? undefined : val))
    .parse(req.nextUrl.searchParams.get("limit"))

  // prettier-ignore
  try {
    newsLinks.push(...await collectLinks({ limit }))
  } catch (e) {
    if (e instanceof Error)
      console.error(`CRITICAL FAIL on ${collectLinks.name}:`, e.message)
    
    payload.errors = { ...payload.errors, critical: `CRITICAL FAIL on ${collectLinks.name}` }
    
    return NextResponse.json(
      payload,
      { status: 500 }
    )
  }

  const results = [] as (z.ZodSafeParseResult<News> & { url: string })[]

  // prettier-ignore
  await Promise.all(newsLinks.map((url) =>
    collectNewsFromLink(url)
      .then((result) => results.push({ ...result, url }))
      .catch(() => console.error(`UNEXPECTED ERROR from ${new URL(url).pathname}`)),
  ))

  const { news, errors } = results.reduce(
    (
      group: { news: News[]; errors: Array<ParsingError> },
      { url, success, data, error },
    ) => {
      if (success) group.news.push(data)
      else group.errors.push({ issues: error.issues, url })
      return group
    },
    { news: [], errors: [] },
  )

  if (errors.length > 0) payload.errors = { ...payload.errors, parsing: errors }

  if (news.length === 0) {
    console.error("zero news parsed")
    payload.errors = { ...payload.errors, critical: "zero news parsed" }
    return NextResponse.json(payload, { status: 500 })
  }

  const existingLinks = (
    await prisma.news.findMany({
      where: {
        source: NewsSource.BdPratidin,
        url: { in: news.map((n) => n.url) },
      },
      select: { url: true },
    })
  ).map((ob) => ob.url)

  // prettier-ignore
  if (existingLinks.length > 0) {
    console.log(`skipped over ${existingLinks.length} entries`)
    payload = { ...payload, info: [`skipped over ${existingLinks.length} entries`] }
  }

  try {
    await prisma.news.createMany({
      data: news.filter(({ url }) => !existingLinks.includes(url)),
    })
  } catch (error) {
    console.error("INSERT FAILED", error)
    payload.errors = { ...payload.errors, critical: "INSERT FAILED" }
    return NextResponse.json(payload, { status: 500 })
  }

  return NextResponse.json(payload)
}
