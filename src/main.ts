#!/usr/bin/env bun

/// <reference path="../index.d.ts" />

import plugin from "bun-plugin-tailwind"
import { rmSync } from "fs"
import { relative } from "path"

const cachePath = `./node_modules/.cache/wdwh`

const files: Record<string, string> = {
  [`${cachePath}/frontend.tsx`]: `import { createRoot } from "react-dom/client"
import "../../../src/app/index.css"
import App from "../../../src/app/App.tsx"

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
  case `dev`:
    await dev()
    break
  case `build`:
    await build()
    break
  default: {
    console.log(`wrong command: "${process.argv.at(2)}"\ntry "dev" | "build"`)
    process.exit()
  }
}

export async function dev() {
  await createFiles()

  // @ts-ignore
  await import(`../../.cache/wdwh/server.ts`)
}

export async function build() {
  const { config } = await readMetadata()

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
  const { metadata } = await readMetadata()

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

  const config = getOBjFromJsString(text, `export const config`) as Config

  const metadata = getOBjFromJsString(text, `export const metadata`) as Metadata
  if (metadata.iconPath && metadata.iconPath[0] === `.`)
    metadata.iconPath = `../../../src/app${metadata.iconPath.slice(1)}`

  return { config, metadata }
}

function getOBjFromJsString(text: string, id: string) {
  const i = text.indexOf(`{`, text.indexOf(id)) + 1
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
    }, {})
}
