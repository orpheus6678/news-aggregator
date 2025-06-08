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

type NewsProps = {
  title: string
  body: string
  imgSrc: string
  imgAlt: string
  link: string
}

type NewsCardProps = NewsProps & React.ComponentProps<typeof Card>

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
    className={cn(
      "max-w-sm min-w-xs py-8 text-xl sm:max-w-md",
      banglaSerif.className,
      className,
    )}
    {...props}
  >
    <CardHeader>
      <CardTitle>
        <a className="hover:text-blue-500" href={link}>
          {title}
        </a>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col items-center space-y-6">
      <CardDescription
        className={`text-base ${banglaSans.className} hover:text-gray-600`}
      >
        {body}
      </CardDescription>
      <div className="h-[250px] w-[375px] overflow-hidden rounded-lg">
        <Image
          className="transition-transform duration-300 ease-out hover:scale-110"
          width={375}
          height={250}
          alt={imgAlt}
          src={imgSrc}
        />
      </div>
    </CardContent>
  </Card>
)

export default NewsCard
export type { NewsProps, NewsCardProps }
