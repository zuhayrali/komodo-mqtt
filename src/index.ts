import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { startStatsPublisher } from "./komodo-stats.js";

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const server = serve({
  fetch: app.fetch,
  port: 3002
}, (info) => {
  startStatsPublisher();
  console.log(`Server is running on http://localhost:${info.port}`)

})

process.on("SIGINT", () => {
  server.close()
  process.exit(0)
})
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})