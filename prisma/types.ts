import { NewsSource } from "@prisma/client"

declare global {
  namespace PrismaJson {
    type Section = {
      name: string
      displayName: string
    }

    type Tag = {
      name: string
      displayName: string
    }

    type Image = {
      src: string
      width: number
      height: number
      alt?: string
    }

    type Data = {
      discriminator: "bdpratidin"
      imageFooter?: string
      signature: string

      body: {
        type: "plain"
        text: string
      }[]
    }
  }
}

export {}
