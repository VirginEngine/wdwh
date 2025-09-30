import index from "./index.html"

const server = Bun.serve({
  routes: { "/*": index },
  development: { hmr: true },
})

console.log(`> Server running at ${server.url}`)
