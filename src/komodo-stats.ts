import { KomodoClient } from "komodo_client";
import mqtt from "mqtt";
import { env } from "./env.js";

const komodo = KomodoClient(env.komodoUrl, {
  type: "api-key",
  params: {
    key: env.komodoKey,
    secret: env.komodoSecret,
  },
});

const client = mqtt.connect(env.mqttUrl, {
  username: env.mqttUser,
  password: env.mqttPass,
  reconnectPeriod: 5_000,
  connectTimeout: 5_000,
});


function formatStats(stackName: string, res: any) {
  const cpu = Number.isFinite(res.cpu_perc) ? parseFloat(res.cpu_perc.toFixed(2)) : null;
  const memPercentage =
    Number.isFinite(res.mem_used_gb) && Number.isFinite(res.mem_total_gb) && res.mem_total_gb !== 0
      ? parseFloat(((res.mem_used_gb / res.mem_total_gb) * 100).toFixed(2))
      : null;
  const networkIn = Number.isFinite(res.network_ingress_bytes)
    ? res.network_ingress_bytes / 1_000_000
    : null;
  const networkOut = Number.isFinite(res.network_egress_bytes)
    ? res.network_egress_bytes / 1_000_000
    : null;

  return {
    name: stackName,
    cpu,
    memPercentage,
    networkIn,
    networkOut,
  };
}

async function publishServerStats() {
  const servers = await komodo.read("ListServers", {});
  const results = await Promise.all(
    servers.map(async (server) => {
      try {
        const systemStats = await komodo.read("GetSystemStats", { server: server.id });
        const serverStates = await komodo.read("GetServerState", { server: server.id });
        const stat = { 
          ...formatStats(server.name, systemStats),
          state: serverStates.status
        }
        const serverName = server.name.split(" ")[0];
        client.publish(`komodo/servers/${serverName}`, JSON.stringify(stat), {
          qos: 0,
          retain: false,
        });
        return stat;
      } catch (err) {
        console.error(`❌ Failed to fetch stats for server ${server.name}:`, err);
        return null;
      }
    })
  );
  console.table(results)
  return results;
}

async function publishAlertCount() {
  const alerts = await komodo.read("ListAlerts", {});
  const unresolvedAlerts = alerts.alerts.filter(alert => !alert.resolved)
  const alertCount = unresolvedAlerts.length;

  if(alertCount > 0) { 
    console.table(alerts.alerts.filter(alert => !alert.resolved))
  }

  client.publish(`komodo/activeAlerts`, JSON.stringify(alertCount), {
        qos: 0,
        retain: false,
      });
    
  console.log(`Unresolved alert count: ${alertCount}`);
  return alertCount;
}

export function startStatsPublisher() {
  client.on("reconnect", () => console.log("🔄 Reconnecting…"));
  client.on("error",   err => {
    console.error("❌ MQTT Error:", err.message);
    client.end()
  });
  client.on("connect", () => {
    console.log("✅ Connected to MQTT broker");

    setInterval(async () => {
      try {
        await publishServerStats();
        await publishAlertCount();
      } catch (err) {
        console.error("❌ Error during stats fetch or publish:", err);
      }
    }, 10_000);
  });
}
