const file = Bun.file(`./package.json`)
const text = await file.text()
const start = text.indexOf(`"version"`) + 12
let end = start

for (; ; end++) if (text[end] === `"`) break

const oldVersion = text.slice(start, end)
const arr = oldVersion.split(`-dev.`)
if (arr[1]) {
  arr[1] = String(Number(arr[1]) + 1)
  const newVersion = arr.join(`-dev.`)
  await file.write(text.replaceAll(oldVersion, newVersion))

  await Bun.$`bun publish --tag=dev`
} else {
  await Bun.$`bun publish`
}
