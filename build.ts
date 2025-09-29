import { existsSync, cpSync } from "fs"
import { rm } from "fs/promises"

console.log(`Building...`)

if (existsSync(`./dist`)) {
  await rm(`./dist`, { recursive: true, force: true })
}

Bun.write(`./dist/main.ts`, await Bun.file(`./src/main.ts`).text())

cpSync(`./example`, `./dist/example`, { recursive: true })

console.log(`Done.`)
