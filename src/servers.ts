import { komodo } from "./komodo-client.js";
import { publishDiscoveryConfig } from "./homeassistant-discovery.js";
import { env } from "./env.js";

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

export async function publishServerStats(client: any) {
  const servers = await komodo.read("ListServers", {});
  const results = await Promise.all(
    servers.map(async (server) => {
      try {
        const [systemStats, serverStates] = await Promise.all([
          komodo.read("GetSystemStats", { server: server.id }),
          komodo.read("GetServerState", { server: server.id }),
        ]);

        const stat = {
          ...formatStats(server.name, systemStats),
          state: serverStates.status,
        };

        const serverName = server.name.split(" ")[0];

        client.publish(`komodo/servers/${serverName}`, JSON.stringify(stat), {
          qos: 0,
          retain: false,
        });

        publishDiscoveryConfig(client, serverName, {enabled: env.updateHomeAssistant})

        return stat;
      } catch (err) {
        console.error(`❌ Failed to fetch stats for server ${server.name}:`, err);
        return null;
      }
    })
  );

  if (process.env.DEBUG === "true") {
    console.table(results);
  }

  console.log(`✅ Sent server status summary to MQTT at ${new Date().toISOString()}`);

  if(!env.updateHomeAssistant) { 
    console.log('❌ No updates made through Home Assistant MQTT Discovery');
  }

  return results;
}
