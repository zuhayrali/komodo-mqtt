import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

function readDockerSecret(key: string): string | undefined {
  const secretPath = path.join("/run/secrets", key);
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, "utf8").trim();
  }
  return undefined;
}

function getRequiredEnvVar(key: string): string {
  const value = process.env[key] || readDockerSecret(key);
  if (!value) {
    throw new Error(`Missing required environment variable or secret: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || readDockerSecret(key) || defaultValue;
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
  updateInterval: parseInt(getOptionalEnvVar("UPDATE_INTERVAL", "60"), 10),
  updateHomeAssistant: getOptionalEnvVar("UPDATE_HOME_ASSISTANT", "false") === "true"
};
