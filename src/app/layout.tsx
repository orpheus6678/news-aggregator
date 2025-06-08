import { Inter } from "next/font/google"

import "./globals.css"

const inter = Inter()

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body className={inter.className}>{children}</body>
  </html>
)

export default RootLayout
