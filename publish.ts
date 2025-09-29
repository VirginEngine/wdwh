await Bun.$`bun run build`

const file = Bun.file(`./package.json`)
let text = await file.text()
const start = text.indexOf(`"version"`) + 12
let end = start

for (; ; end++) if (text[end] === `"`) break

const orgSlice = text.slice(start, end)
const arr = orgSlice.split(`.`)
arr[2] = String(Number(arr[2]) + 1)
const endSlice = arr.join(`.`)
text = text.replaceAll(orgSlice, endSlice)

file.write(text)

await Bun.$`bun publish`
