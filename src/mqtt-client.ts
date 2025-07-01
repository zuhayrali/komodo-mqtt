import mqtt, { MqttClient } from "mqtt";
import { publishServerStats } from "./servers.js";
import { env } from "./env.js";
import type { Alert } from "komodo_client/dist/types.js";

export type NotifyData = {
  type: string
  level: string
  resolved: boolean
  resolved_ts: number | undefined
  data: Record<string, any>
  alertMessage: string
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


export function alertSummary(alert: Alert): string {
  const { type, data } = alert.data;
  switch (type) {
    case "Test":
      return `Test alert for ${data.name} (ID: ${data.id})`;
    case "ServerUnreachable":
      return `Server "${data.name}" is unreachable${data.region ? ` in region ${data.region}` : ""}${data.err ? `: ${data.err}` : ""}`;
    case "ServerCpu":
      return `High CPU usage on "${data.name}"${data.region ? ` (${data.region})` : ""}: ${data.percentage?.toFixed(2) ?? "?"}%`;
    case "ServerMem":
      return `High memory usage on "${data.name}"${data.region ? ` (${data.region})` : ""}: ${data.used_gb ?? "?"}GB/${data.total_gb ?? "?"}GB`;
    case "ServerDisk":
      return `Disk usage alert on "${data.name}"${data.region ? ` (${data.region})` : ""} at ${data.path}: ${data.used_gb ?? "?"}GB/${data.total_gb ?? "?"}GB`;
    case "ContainerStateChange":
      return `Container "${data.name}" on server "${data.server_name}" changed state: ${data.from} → ${data.to}`;
    case "DeploymentImageUpdateAvailable":
      return `Image update available for "${data.name}" on server "${data.server_name}": ${data.image}`;
    case "DeploymentAutoUpdated":
      return `Deployment "${data.name}" on server "${data.server_name}" auto-updated to image ${data.image}`;
    case "StackStateChange":
      return `Stack "${data.name}" on server "${data.server_name}" changed state: ${data.from} → ${data.to}`;
    case "StackImageUpdateAvailable":
      return `Stack "${data.name}" on server "${data.server_name}" service "${data.service}" has image update: ${data.image}`;
    case "StackAutoUpdated":
      return `Stack "${data.name}" on server "${data.server_name}" auto-updated images: ${Array.isArray(data.images) ? data.images.join(", ") : data.images}`;
    case "AwsBuilderTerminationFailed":
      return `AWS builder termination failed for instance ${data.instance_id}: ${data.message}`;
    case "ResourceSyncPendingUpdates":
      return `Resource "${data.name}" has pending sync updates.`;
    case "BuildFailed":
      return `Build failed for "${data.name}" (version: ${data.version ?? "?"})`;
    case "RepoBuildFailed":
      return `Repo build failed for "${data.name}"`;
    case "ProcedureFailed":
      return `Procedure failed for "${data.name}"`;
    case "ActionFailed":
      return `Action failed for "${data.name}"`;
    case "ScheduleRun":
      return `Scheduled run for ${data.resource_type ?? "resource"} "${data.name}" (ID: ${data.id})`;
    case "None":
      return `No alert data.`;
    default:
      return `Unknown alert type: ${type}`;
  }
}

export function publishMqttNotification(client: MqttClient, alert: NotifyData) { 
  client.publish("komodo/alerts", JSON.stringify(alert), {
      qos: 0,
      retain: false,
  });
  console.log(`📣 Published alert to komodo/alerts`)
}