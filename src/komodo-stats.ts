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
});

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

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

async function getKomodoServerSystemStats() {
  const stacks = await komodo.read("ListServers", {});
  const results = await Promise.all(
    stacks.map(async (stack) => {
      try {
        const res = await komodo.read("GetSystemStats", { server: stack.id });
        return formatStats(stack.name, res);
      } catch (err) {
        console.error(`❌ Failed to fetch stats for server ${stack.name}:`, err);
        return null;
      }
    })
  );

  return results.filter(isNotNull); // remove nulls
}

export function startStatsPublisher() {
  client.on("connect", () => {
    console.log("✅ Connected to MQTT broker");

    setInterval(async () => {
      try {
        const stats = await getKomodoServerSystemStats();
        console.table(stats);

        stats.filter(isNotNull).forEach((stat) => {
          const serverName = stat.name.split(" ")[0];
          client.publish(`komodo/servers/${serverName}`, JSON.stringify(stat), {
            qos: 0,
            retain: false,
          });
        });
      } catch (err) {
        console.error("❌ Error during stats fetch or publish:", err);
      }
    }, 10_000);
  });
}
