import { cpSync, rmSync } from "fs"

console.log(`Building...`)

rmSync(`./dist`, { recursive: true, force: true })

const files: Record<string, string> = {}
const glob = new Bun.Glob(`**/*`)
for (const filePath of glob.scanSync(`./example`)) {
  const path = `./example/${filePath}`
  if (filePath.includes(`.svg`)) {
    cpSync(path, `./dist/${filePath.split(`/`)[2]}`)
  } else {
    const text = await Bun.file(path).text()
    files[filePath] = text
  }
}

const example = `const example = ${JSON.stringify(files)}`

for (const filePath of glob.scanSync(`./src`)) {
  let text = await Bun.file(`./src/${filePath}`).text()
  if (filePath.endsWith(`main.ts`)) {
    text = text
      .split(`\n`)
      .map((line) => (line.includes(`const example`) ? `const example` : line))
      .join(`\n`)
      .replace(`const example`, example)
  }
  await Bun.write(`./dist/${filePath}`, optymalize(text))
}

console.log(`Done.`)

// Helper functions

function optymalize(js: string) {
  return (
    js
      // .replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, ``) // Remove comments
      .replaceAll("${libPath}", `./node_modules/@virgin-engine/wdwh`)
      .replaceAll("${appPath}", `./src/app`)
      .split(`\n`)
      .map((line) => line.trim())
      .filter((line) => line && !line.includes(`libPath`) && !line.includes(`appPath`))
      .join(`\n`)
  )
}
