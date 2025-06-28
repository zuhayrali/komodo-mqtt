import mqtt, { MqttClient } from "mqtt";
import { publishServerStats } from "./servers.js";
import { env } from "./env.js";

export type NotifyData = {
  type: string
  level: string
  resolved: boolean
  resolved_ts: number | undefined
  data: Record<string, any>
}

export function createMqttClient() {
  const client = mqtt.connect(env.mqttUrl, {
    username: env.mqttUser,
    password: env.mqttPass,
    reconnectPeriod: 5000,
    connectTimeout: 5000,
  });

  client.on("reconnect", () => console.log("🔄 Reconnecting…"));
  client.on("error", (err) => {
    console.error("❌ MQTT Error:", err);
    client.end();
  });

  return client;
}

export function startStatsPublisher(client: MqttClient) {
  client.on("connect", () => {
    console.log("✅ Connected to MQTT broker");
    setInterval(async () => {
      try {
        await publishServerStats(client);
      } catch (err) {
        console.error("❌ Error during stats fetch or publish:", err);
      }
    }, env.updateInterval * 1000);
  });
}


export function publishMqttNotification(client: MqttClient, alert: NotifyData) { 
  client.publish("komodo/alerts/batch", JSON.stringify(alert), {
      qos: 0,
      retain: false,
  });
  console.log(`📣 Published alert to komodo/alerts/batch`)
}