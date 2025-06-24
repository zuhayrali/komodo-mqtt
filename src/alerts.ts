import { komodo } from "./komodo-client.js";

type AlertSummary = {
  id: string;
  level: string;
  timestamp: string;
  type?: string;
  data?: any;
};

type CachedAlert = {
  id: string;
  resolved: boolean;
};

const alertCache = new Map<string, CachedAlert>();

function getAlertId(alert: any): string {
  return alert._id?.$oid ?? "";
}

function getUnresolvedAlertIds(alerts: any[]): string[] {
  return alerts.map(getAlertId);
}

function getNewAlertIds(currentIds: string[]): string[] {
  return currentIds.filter(id => !alertCache.has(id));
}

function getResolvedAlertIds(currentUnresolvedIds: string[]): string[] {
  return Array.from(alertCache.entries())
    .filter(([id, entry]) => !currentUnresolvedIds.includes(id) && entry.resolved === false)
    .map(([id]) => id);
}

export async function checkAlertsAndNotify(client: any): Promise<void> {
  const all = await komodo.read("ListAlerts", {});
  const unresolved = all.alerts.filter((a: any) => !a.resolved);
  const unresolvedIds = getUnresolvedAlertIds(unresolved);

  const newIds = getNewAlertIds(unresolvedIds);
  const resolvedIds = getResolvedAlertIds(unresolvedIds);

  console.log(`🆕 New alerts: ${newIds.length}, ✅ Resolved alerts: ${resolvedIds.length}`);

  const newSummaries = await Promise.all(
    newIds.map(async (id) => {
      try {
        const alert = await komodo.read("GetAlert", { id });
        alertCache.set(id, { id, resolved: false });
        return {
          id,
          level: alert.level,
          timestamp: new Date(alert.ts).toLocaleString(),
          type: alert.data?.type,
          data: alert.data?.data,
        };
      } catch (err) {
        console.error(`❌ Failed to fetch new alert ${id}:`, err);
        return null;
      }
    })
  );

  const resolvedSummaries = await Promise.all(
    resolvedIds.map(async (id) => {
      try {
        const alert = await komodo.read("GetAlert", { id });
        alertCache.set(id, { id, resolved: true });
        return {
          id,
          level: 'RESOLVED',
          timestamp: new Date(alert.ts).toLocaleString(),
          type: alert.data?.type,
          data: alert.data?.data,
          resolved: true,
        };
      } catch (err) {
        console.error(`❌ Failed to fetch resolved alert ${id}:`, err);
        return null;
      }
    })
  );

  const batch = [...newSummaries, ...resolvedSummaries].filter(Boolean) as AlertSummary[];

  if (batch.length > 0) {
    client.publish("komodo/alerts/batch", JSON.stringify(batch), {
      qos: 0,
      retain: false,
    });
    console.log(`📣 Published ${batch.length} alert(s) to komodo/alerts/batch`);
  } else {
    console.log("📭 No new or resolved alerts to publish.");
  }
}
