import mqtt from "mqtt";
import { env } from "./env.js";

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
