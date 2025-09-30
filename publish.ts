const file = Bun.file(`./package.json`)
const text = await file.text()
const start = text.indexOf(`"version"`) + 12
let end = start

for (; ; end++) if (text[end] === `"`) break

const oldVersion = text.slice(start, end)
const arr = oldVersion.split(`.`)
arr[2] = String(Number(arr[2]) + 1)
const newVersion = arr.join(`.`)
file.write(text.replaceAll(oldVersion, newVersion))
const file2 = Bun.file(`./example/package.json`)
file2.write((await file2.text()).replaceAll(oldVersion, newVersion))

await Bun.$`bun run build`

await Bun.$`bun publish`
