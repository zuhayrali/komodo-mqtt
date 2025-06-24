import dotenv from "dotenv";
dotenv.config();

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  // Required
  komodoUrl: getRequiredEnvVar("KOMODO_URL"),
  komodoKey: getRequiredEnvVar("KOMODO_KEY"),
  komodoSecret: getRequiredEnvVar("KOMODO_SECRET"),
  mqttUrl: getRequiredEnvVar("MQTT_URL"),
  mqttUser: getRequiredEnvVar("MQTT_USER"),
  mqttPass: getRequiredEnvVar("MQTT_PASS"),

  // Optional
  updateInterval: parseInt(getOptionalEnvVar("UPDATE_INTERVAL", "30"), 10),
  updateHomeAssistant: getOptionalEnvVar("UPDATE_HOME_ASSISTANT", "false") === "true"
};
