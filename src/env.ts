import dotenv from "dotenv";
dotenv.config();

export const env = {
  komodoUrl: process.env.KOMODO_URL!,
  komodoKey: process.env.KOMODO_KEY!,
  komodoSecret: process.env.KOMODO_SECRET!,
  mqttUrl: process.env.MQTT_URL!,
  mqttUser: process.env.MQTT_USER!,
  mqttPass: process.env.MQTT_PASS!,
  updateInterval: process.env.UPDATE_INTERVAL!
};
