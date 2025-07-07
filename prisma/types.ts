import { News as BdPratidinNews } from "@/lib/scraper/bd-pratidin"

declare global {
  namespace PrismaJson {
    type BdPratidinPayload = BdPratidinNews["data"]
    type NewsPayload = BdPratidinPayload
  }
}

export {}
