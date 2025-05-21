import { Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google"
import Image from "next/image"

import { cn } from "@/lib/utils"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card"

type NewsCardProps = {
  title: string
  body: string
  imgSrc: string
  imgAlt: string
  link: string
} & React.ComponentProps<"div">

const banglaSerif = Noto_Serif_Bengali()
const banglaSans = Noto_Sans_Bengali()

const NewsCard = ({
  className,
  title,
  body,
  imgSrc,
  imgAlt,
  link,
  ...props
}: NewsCardProps) => (
  <Card
    className={cn("max-w-md py-8 text-xl", banglaSerif.className, className)}
    {...props}
  >
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col items-center space-y-6">
      <CardDescription className={`text-base ${banglaSans.className}`}>
        {body}
      </CardDescription>
      <Image width={375} height={250} alt={imgAlt} src={imgSrc} />
    </CardContent>
  </Card>
)

export default NewsCard
export type { NewsCardProps }
