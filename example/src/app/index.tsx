import App from "./App.tsx"

type Metadata = {
  title?: string | undefined
  description?: string | undefined
  author?: string | undefined
  keywords?: string | undefined
  themeColor?: string | undefined
  iconPath?: string
  [name: string]: string | undefined
}

export const metadata: Metadata = {
  title: ``,
  iconPath: `./react.svg`,
}

export default function Page() {
  return (
    <html>
      <head>
        <meta name="" content="" />
      </head>
      <body className="bg-black text-white">
        <App />
      </body>
    </html>
  )
}
