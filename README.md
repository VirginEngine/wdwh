# WDWH (Easyer web dev without html and reduced css)

Works only with Bun runtime

## Init new project

1. Init blank bun

```sh
bun init
```

2. Install `@virgin-engine/wdwh`

```sh
bun i @virgin-engine/wdwh
```

3. Add script init to `package.json`

```json
{
  "private": true,
  "scripts": {
    "init": "wdwh init"
  }
  // ...
}
```

4. Run init

```sh
bun run init
```

## Adding to project

1. Install `@virgin-engine/wdwh`

```sh
bun i @virgin-engine/wdwh
```

2. Add script `dev` `build` to `package.json`

```json
{
  "private": true,
  "scripts": {
    "dev": "wdwh dev",
    "build": "wdwh build"
  }
  // ...
}
```

3. Add files

create file structure like example

https://github.com/VirginEngine/wdwh/tree/main/example

`src/app/index.tsx` (contains only `html` (tag) `head` (tag) `metadata` `body` (tag))
`src/app/App.tsx` (app entry point)
`src/app/react.svg` (favicon, can be any other image, bun path must be specify in `src/app/index.tsx`)
`src/app/index.css` (must import taiwindcss)
`.gitignore` (optional)
`bunfig.toml` (for tailwindcss)
`package.json` (with scripts `dev` `build`)
`README.md` (optional)
`tsconfig.json` (for `typescript`)

## TODO

- Bundle example folder to json { path: fileText }
