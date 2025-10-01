import { cpSync, rmSync } from "fs"

console.log(`Building...`)

rmSync(`./dist`, { recursive: true, force: true })

const glob = new Bun.Glob(`**/*`)
for (const filePath of glob.scanSync(`./src`)) {
  const text = await Bun.file(`./src/${filePath}`).text()
  await Bun.write(`./dist/${filePath}`, optymalize(text))
}
cpSync(`./example`, `./dist/example`, { recursive: true })

// TODO Bundle example folder to json { path: fileText }

console.log(`Done.`)

// Helper functions

function optymalize(js: string) {
  return js
    .replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, ``) // Remove comments
    .replaceAll("${libPath}", `./node_modules/@virgin-engine/wdwh`)
    .replaceAll("${appPath}", `./src/app`)
    .replaceAll("${basePath}", `.`)
    .split(`\n`)
    .map((line) => line.trim())
    .filter(
      (line) => line && !line.includes(`libPath`) && !line.includes(`appPath`) && !line.includes(`basePath`)
    )
    .join(`\n`)
}
