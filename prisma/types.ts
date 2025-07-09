import { News } from "@/lib/scraper/bd-pratidin"

declare global {
  namespace PrismaJson {
    type Section = News["section"]
    type Tags = News["tags"]
    type Image = News["image"]
    type Data = News["data"]
  }
}

export {}
