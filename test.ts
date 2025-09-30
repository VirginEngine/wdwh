import { cpSync, mkdirSync, rmSync } from "fs"
import "./build"
import { dev, init } from "./src/main"

rmSync(`./test`, { recursive: true, force: true })

mkdirSync(`./test`)

cpSync(`./example`, `./test`, { recursive: true })

await copyLib()

await init()
await Bun.$`cd test && bun i`
await copyLib()
await dev()

async function copyLib() {
  const glob = new Bun.Glob(`**/*`)
  for (const path of glob.scanSync(`./dist`)) {
    const text = await Bun.file(`./dist/${path}`).text()
    await Bun.write(`./test/node_modules/@virgin-engine/wdwh/dist/${path}`, text)
  }

  cpSync(`./index.ts`, `./test/node_modules/@virgin-engine/wdwh/index.ts`)
  cpSync(`./bunfig.toml`, `./test/node_modules/@virgin-engine/wdwh/bunfig.toml`)
}
