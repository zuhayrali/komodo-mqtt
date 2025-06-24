import { createMqttClient } from "./mqtt-client.js";
import { publishServerStats } from "./servers.js";
import { checkAlertsAndNotify } from "./alerts.js"
import { env } from "./env.js";

export function startStatsPublisher() {
  const client = createMqttClient();
  const interval = Number(env.updateInterval) || 10;

  client.on("connect", () => {
    console.log("✅ Connected to MQTT broker");

    setInterval(async () => {
      try {
        await publishServerStats(client);
        await checkAlertsAndNotify(client);
      } catch (err) {
        console.error("❌ Error during stats fetch or publish:", err);
      }
    }, interval * 1000);
  });
}
