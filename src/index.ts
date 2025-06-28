import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createMqttClient, publishMqttNotification, startStatsPublisher, type NotifyData } from './mqtt-client.js';
import type { Alert } from 'komodo_client/dist/types.js';

const app = new Hono()
const client = createMqttClient();

app.post('/', async (c) => {
  const alert: Alert = await c.req.json()

  const type = alert.data.type;  
  const data = alert.data.data as Record<string, any>;

  const level = alert.level;
  const resolved = alert.resolved;
  const resolved_ts = alert.resolved_ts;
  
  const notify: NotifyData = {
    type,
    level,
    resolved,
    resolved_ts,
    data, 
  };

  publishMqttNotification(client, notify)

  return c.json({ status: 'notification sent to mqtt' })
})


const server = serve({
  fetch: app.fetch,
  port: 3434,
  hostname: '0.0.0.0'
}, (info) => {
  startStatsPublisher(client);
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