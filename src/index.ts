import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { startStatsPublisher } from "./stats-publisher.js";

const app = new Hono()

const server = serve({
  fetch: app.fetch,
  port: 3434
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