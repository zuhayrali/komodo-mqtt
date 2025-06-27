import { createMqttClient } from "./mqtt-client.js";
import { publishServerStats } from "./servers.js";
import { initializeResolvedAlertCache, getAlertsAndNotify } from "./alerts.js"
import { env } from "./env.js";

export function startStatsPublisher() {
  const client = createMqttClient();

  client.on("connect", () => {
    console.log("✅ Connected to MQTT broker");
    initializeResolvedAlertCache();
    setInterval(async () => {
      try {
        await publishServerStats(client);
        await getAlertsAndNotify(client);
      } catch (err) {
        console.error("❌ Error during stats fetch or publish:", err);
      }
    }, env.updateInterval * 1000);
  });
}
