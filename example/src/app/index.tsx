import App from "./App.tsx"

export const config: Config = {
  outdir: `./dist`,
  bundleCss: true,
}

export const metadata: Metadata = {
  iconPath: `./react.svg`,
  title: `Example`,
}

export default function Page() {
  return (
    <html>
      <head></head>
      <body className="bg-black text-white">
        <App />
      </body>
    </html>
  )
}

// Types

type Config = {
  outdir: string
  bundleCss: boolean
}

type Metadata = {
  iconPath: string
  title: string
  description?: string
  author?: string
  keywords?: string
  themeColor?: string
  [name: string]: string | undefined
}
