import { existsSync } from "fs"
import { rm } from "fs/promises"
import "./build"
import { init } from "./src/main"

if (existsSync(`./test`)) {
  await rm(`./test`, { recursive: true, force: true })
}

const glob = new Bun.Glob(`*`)
for (const path of glob.scanSync(`./dist`)) {
  const text = await Bun.file(`./dist/${path}`).text()
  Bun.write(`./test/node_modules/@virgin-engine/wdwh/${path}`, text)
}

await init(`./test`)
