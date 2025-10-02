#!/usr/bin/env bun
import plugin from "bun-plugin-tailwind"
import { cpSync, rmSync } from "fs"
import { relative } from "path"

const cachePath = `./node_modules/.cache/@virgin-engine/wdwh`

const config: Config = {
  outdir: `./dist`,
  bundleCss: true,
}

const metadata: Metadata = {
  iconPath: `./react.svg`,
  title: `Example`,
}

const files: Record<string, string> = {
  [`${cachePath}/frontend.tsx`]: `import { createRoot } from "react-dom/client"
import "../../../../src/app/index.css"
import App from "../../../../src/app/App.tsx"

createRoot(document.getElementsByTagName("body")[0]).render(<App />)`,
  [`${cachePath}/server.ts`]: `import index from "./index.html"

const server = Bun.serve({
  routes: { "/*": index },
  development: { hmr: true },
})

console.log(\`> Server running at \${server.url}\`)
`,
}

switch (process.argv.at(2)) {
  case `init`:
    await init()
    break
  case `dev`:
    await dev()
    break
  case `build`:
    await build()
    break
  default: {
    console.log(`wrong command: "${process.argv.at(2)}"\ntry "init" | "dev" | "build"`)
    process.exit()
  }
}

export async function init() {
  console.log(`Init blank project...`)

  if (await Bun.file(`./package.json`).exists())
    await new Promise<void>((resolve) => {
      console.log(`For init new project type "Y", it will overrite all ./ files`)
      const p = process.stdin.on(`data`, (e) => {
        if (e[0] === `Y`.charCodeAt(0)) {
          p.destroy()
          return resolve()
        }
        process.exit()
      })
    })

  const glob = new Bun.Glob(`**/*`)
  for (const path of glob.scanSync(`.`)) {
    if (!path.startsWith(`node_modules`)) await Bun.file(path).delete()
  }

  const example: Record<string, string> = {}
  for (const [path, text] of Object.entries(example)) {
    await Bun.write(path, text)
  }

  cpSync(`./node_modules/@virgin-engine/wdwh/dist/react.svg`, `./src/app/react.svg`)
}

export async function dev() {
  await readMetadata()

  await createFiles()

  // @ts-ignore
  await import(`../../../.cache/@virgin-engine/wdwh/server.ts`)
}

export async function build() {
  await readMetadata()

  await createFiles()

  const buildConfig: Bun.BuildConfig = {
    entrypoints: [`${cachePath}/index.html`],
    outdir: config.outdir,
    plugins: [plugin],
    minify: true,
    target: `browser`,
    sourcemap: `none`,
    define: {
      "process.env.NODE_ENV": `"production"`,
    },
  }

  console.log(`Building...`)

  rmSync(config.outdir, { recursive: true, force: true })

  const start = performance.now()

  // Build all the HTML files
  const result = await Bun.build(buildConfig)

  // Minify html code
  const htmlFile = Bun.file(`${config.outdir}/index.html`)
  let html = minifyHtml(await htmlFile.text())

  // Bundle css into html
  if (config.bundleCss) {
    const cssArtefact = result.outputs.find((e) => e.path.endsWith(`.css`))
    if (cssArtefact?.path) {
      const cssFile = Bun.file(cssArtefact.path)

      const cssStart = html.indexOf(`<link rel="stylesheet"`)

      let cssEnd = cssStart
      for (; cssEnd < html.length; cssEnd++) {
        if ([`/>`, `">`].includes(html.slice(cssEnd, cssEnd + 2))) {
          cssEnd += 2
          break
        }
      }

      const slice = html.slice(cssStart, cssEnd)
      const cssCode = `<style>${minifyHtml(await cssFile.text())}</style>`

      html = html.replace(slice, cssCode)
      cssFile.delete()
      result.outputs.splice(result.outputs.indexOf(cssArtefact), 1)
    }
  }

  htmlFile.write(html)

  // Print the results
  const buildTime = (performance.now() - start).toFixed(2)

  const [outputSize, maxPathLength] = result.outputs.reduce(
    (prev, e) => [prev[0] + e.size, Math.max(prev[1], relative(process.cwd(), e.path).length)],
    [0, 0]
  )

  const outputTable = result.outputs.reduce(
    (prev, output) => prev + `  ${formatPath(output.path)}   ${formatFileSize(output.size)}\n`,
    ``
  )
  console.log(`\nOutput:
${outputTable}
All size: ${formatFileSize(outputSize)}
Done in ${buildTime}ms\n`)

  // Helper function to format file sizes
  function formatFileSize(size: number): string {
    const units = [`B`, `KB`, `MB`, `GB`]
    let unitIndex = 0

    for (; size >= 1024 && unitIndex < units.length - 1; unitIndex++) {
      size /= 1024
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  function minifyHtml(text: string) {
    return text
      .replaceAll(`\n`, ` `)
      .replaceAll(/\s{2,}/g, ` `)
      .replaceAll(/ > | >|> /g, `>`)
      .replaceAll(/ < | <|< /g, `<`)
      .replaceAll(/ ; | ;|; /g, `;`)
      .replaceAll(/ { | {|{ /g, `{`)
      .replaceAll(/ } | }|} /g, `}`)
      .replaceAll(/ " | "|" /g, `"`)
      .replaceAll(/ , | ,|, /g, `,`)
  }

  function formatPath(path: string) {
    path = relative(process.cwd(), path)

    while (path.length < maxPathLength) path += ` `

    return path
  }
}

async function createFiles() {
  for (const path in files) {
    await Bun.write(path, files[path] as any)
  }

  const { headContent, body } = await getPropsFromIndexTSX()

  // write html
  const { title, iconPath, ...rest } = metadata

  const buf = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    headContent,
    Object.keys(rest).map((key) => `<meta name="${key}" content="${rest[key]}" />`),
    `<link rel="icon" href="${iconPath}" />`,
    `<title>${title}</title>`,
    `<script src="./frontend.tsx"></script>`,
    `</head>`,
    body,
    `</html>`,
  ]

  await Bun.write(`${cachePath}/index.html`, buf.join(`\n`))
}

async function getPropsFromIndexTSX() {
  const text = await Bun.file(`./src/app/index.tsx`).text()

  const headContent = getHtmlElement(text, `head`).slice(6, -7)
  let body = getHtmlElement(text, `body`).replaceAll(`className`, `class`)

  const bodyStart = body.indexOf(`>`) + 1
  const bodyEnd = body.lastIndexOf(`<`)
  body = body.replace(body.slice(bodyStart, bodyEnd), ``)

  return {
    headContent,
    body,
  }
}

function getHtmlElement(text: string, name: string) {
  for (let sliceStart, sliceEnd = text.indexOf(`export default`); ; sliceEnd++) {
    if (!sliceStart && text.startsWith(`<${name}`, sliceEnd)) sliceStart = sliceEnd
    if (sliceStart && text.startsWith(`</${name}>`, sliceEnd)) {
      return text
        .slice(sliceStart, sliceEnd + name.length + 3)
        .replaceAll(`\n`, ` `)
        .replaceAll(/\s{2,}/g, ` `)
        .trim()
    }
  }
}

async function readMetadata() {
  const text = await Bun.file(`./src/app/index.tsx`).text()

  const conf = getOBjFromJsString(text, `export const config`) as Config

  const meta = getOBjFromJsString(text, `export const metadata`)
  if (meta.iconPath && meta.iconPath[0] === `.`)
    meta.iconPath = `../../../../src/app${meta.iconPath.slice(1)}`

  Object.assign(config, conf)
  Object.assign(metadata, meta)
}

function getOBjFromJsString(text: string, id: string) {
  let i = text.indexOf(id)
  i = text.indexOf(`{`, i) + 1
  const j = text.indexOf(`}`, i)

  return text
    .slice(i, j)
    .replaceAll(/`|'/g, `"`)
    .split(`,`)
    .map((line) => line.trim())
    .filter((line) => line)
    .reduce((prev, line) => {
      let [a, b] = line.split(`:`) as [string, any]
      b = b.trim()

      if (b.at(0) === `"`) b = b.slice(1, -1)
      else if (!Number.isNaN(Number(b))) b = Number(b)
      else if (b === `false`) b = false
      else if (b === `true`) b = true

      return { ...prev, [a]: b }
    }, {} as Record<string, any>)
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
