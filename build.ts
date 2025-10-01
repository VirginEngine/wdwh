import { cpSync, rmSync } from "fs"

console.log(`Building...`)

rmSync(`./dist`, { recursive: true, force: true })

cpSync(`./src`, `./dist`, { recursive: true })
cpSync(`./example`, `./dist/example`, { recursive: true })

// TODO Bundle example folder to json { path: fileText }

console.log(`Done.`)
