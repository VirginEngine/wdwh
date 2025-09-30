#!/usr/bin/env bun
import plugin from "bun-plugin-tailwind"
import { rmSync } from "fs"
import { relative } from "path"

const libPath = `${process.env.BASE_PATH || `.`}/node_modules/@virgin-engine/wdwh`
const appPath = `${process.env.BASE_PATH || `.`}/src/app`
const basePath = process.env.BASE_PATH || `.`

const metadata: Record<string, string> = {}

const buildDef = {
  outdir: `./dist`,
  bundleCss: true,
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
  console.log(`Init blanc project...`)
  const path = `${libPath}/dist/example`

  const glob = new Bun.Glob(`**/*`)
  for (const filePath of glob.scanSync(path)) {
    const text = await Bun.file(`${path}/${filePath}`).text()
    await Bun.write(`${basePath}/${filePath}`, text)
  }

  await Bun.write(
    `${basePath}/bunfig.toml`,
    `
[serve.static]
plugins = ["bun-plugin-tailwind"]
env = "BUN_PUBLIC_*"`
  )
}

export async function dev() {
  await readMetadata()

  await createJs()
  await createCss()
  await createHtml()

  await import(`./serve.ts`)
}
export async function build(config = buildDef) {
  await readMetadata()

  await createJs()
  await createCss()
  await createHtml()

  const mod = import(`${process.cwd()}${appPath}/index.tsx`)
  console.log(mod)

  const buildConfig: Bun.BuildConfig = {
    entrypoints: [`.${appPath}/index.html`],
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

    htmlFile.write(html)
  }

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
    // .replaceAll(/\/\*[\s\S]*?\*\//g, ``) // Remove comments
  }

  function formatPath(path: string) {
    path = relative(process.cwd(), path)

    while (path.length < maxPathLength) path += ` `

    return path
  }
}

async function createJs() {
  const jsText = `import { createRoot } from "react-dom/client"
import "./index.css"
import App from "../../../.${appPath}/App.tsx"

createRoot(document.getElementsByTagName("body")[0]).render(<App />)`

  await Bun.write(`${libPath}/dist/frontend.tsx`, jsText)
}

async function createCss() {
  const cssFile = Bun.file(`${appPath}/index.css`)
  let cssText = `@import "tailwindcss";\n`
  if (await cssFile.exists()) cssText += await cssFile.text()

  await Bun.write(`${libPath}/dist/index.css`, cssText)
}

async function createHtml() {
  const htmlFile = Bun.file(`${appPath}/index.tsx`)

  const json = getPropsFromIndexTSX(await htmlFile.text(), `${appPath}`)

  // write html
  const { title, iconPath, ...rest } = metadata

  const buf = [`<!DOCTYPE html>`]
  buf.push(`<html lang="en">`)

  buf.push(
    `<head>`,
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
  )

  buf.push(json.headContent)

  for (const key in rest) {
    buf.push(`<meta name="${key}" content="${rest[key]}" />`)
  }

  buf.push(`<link rel="icon" href="${iconPath}" />`)
  buf.push(`<title>${title}</title>`)

  buf.push(`<script src="./frontend.tsx"></script>`)

  buf.push(`</head>`)

  buf.push(json.body)

  buf.push(`</html>`)

  await Bun.write(`${libPath}/dist/index.html`, buf.join(`\n`))
}

function getPropsFromIndexTSX(text: string, path: string) {
  const headContent = getHtmlElement(text, `head`).slice(6, -7)
  let body = getHtmlElement(text, `body`).replaceAll(`className`, `class`)

  const bodyStart = body.indexOf(`>`) + 1
  const bodyEnd = body.lastIndexOf(`<`)
  body = body.replace(body.slice(bodyStart, bodyEnd), ``)

  let importPath = text.split(`\n`).at(0)!

  const importStart = importPath.indexOf(`"`) + 2
  const importEnd = importPath.lastIndexOf(`"`)
  importPath = importPath.slice(importStart, importEnd)

  return {
    importPath: `${path}${importPath}`,
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
  const text = await Bun.file(`${appPath}/index.tsx`).text()

  let i = text.indexOf(`export const metadata`)
  i = text.indexOf(`{`, i) + 1
  const j = text.indexOf(`}`, i)

  const obj = text
    .slice(i, j)
    .replaceAll(/`|'/g, `"`)
    .split(`,`)
    .map((line) => line.trim())
    .filter((line) => line)
    .reduce((prev, line) => {
      const [a, b] = line.split(`:`) as [string, string]
      return { ...prev, [a]: b.slice(2, -1) }
    }, {} as Record<string, string>)

  if (obj.iconPath) obj.iconPath = `../../../.${appPath}${obj.iconPath.slice(1)}`

  for (const key in obj) {
    metadata[key] = obj[key]!
  }
}
