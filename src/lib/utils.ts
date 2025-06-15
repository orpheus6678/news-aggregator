import * as cheerio from "cheerio"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function loadPage(url: string | URL): Promise<cheerio.CheerioAPI> {
  // prettier-ignore
  return fetch(url).then((res) => res.text()).then(cheerio.load)
}
