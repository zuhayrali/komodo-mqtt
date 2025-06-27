import type { Alert } from "komodo_client/dist/types.js";
import { komodo } from "./komodo-client.js";

type AlertSummary = {
  id: string;
  level: string;
  timestamp: string;
  type?: string;
  data?: any;
  resolved?: boolean;
};

type CachedAlert = {
  id: string;
  resolved: boolean;
};

type NotificationData = {
  type: string;
  id: string;
  level: string;
  data: {
    name: string;
  };
};

const alertCache = new Map<string, CachedAlert>();
const notifiedResolvedAlertIds = new Set<string>();

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

export async function initializeResolvedAlertCache(): Promise<void> {
  const all = await komodo.read("ListAlerts", {});
  const resolved = all.alerts.filter((a: any) => a.resolved);

  resolved.forEach((alert: any) => {
    const id = getAlertId(alert);
    if (id) {
      notifiedResolvedAlertIds.add(id);
    }
  });

  console.log(`✅ Initialized resolved alert cache with ${notifiedResolvedAlertIds.size} items`);
}

function extractNotificationData(alerts: Alert[], cache: Set<string>): NotificationData[] {
  const allowedTypes = [
    "StackAutoUpdated",
    "StackImageUpdateAvailable",
    "DeploymentAutoUpdated",
    "DeploymentImageUpdateAvailable"
  ];

  const notifyData: NotificationData[] = [];

  for (const alert of alerts) {
    const id = getAlertId(alert);
    if (!id || cache.has(id)) continue;

    if (allowedTypes.includes(alert.data?.type)) {
      const data = alert.data.data as { id: string; name: string };
      notifyData.push({
        type: alert.data.type,
        id: data?.id ?? "",
        level: "INFO",
        data: {
          name: data?.name ?? "",
        },
      });
      cache.add(id);
    }
  }

  return notifyData;
}

async function fetchAlertSummary(id: string, resolved: boolean): Promise<AlertSummary | null> {
  try {
    const alert = await komodo.read("GetAlert", { id });
    alertCache.set(id, { id, resolved });

    return {
      id,
      level: resolved ? "RESOLVED" : alert.level,
      timestamp: new Date(alert.ts).toLocaleString(),
      type: alert.data?.type,
      data: alert.data?.data,
      resolved,
    };
  } catch (err) {
    console.error(`❌ Failed to fetch alert ${id}:`, err);
    return null;
  }
}

export async function getAlertsAndNotify(client: any): Promise<void> {
  const all = await komodo.read("ListAlerts", {});

  const resolvedAlerts = all.alerts.filter((a: any) => a.resolved);
  const unresolvedAlerts = all.alerts.filter((a: any) => !a.resolved);

  const resolvedNotificationData = extractNotificationData(resolvedAlerts, notifiedResolvedAlertIds);

  const unresolvedIds = getUnresolvedAlertIds(unresolvedAlerts);
  const newUnresolvedIds = getNewAlertIds(unresolvedIds);
  const resolvedIds = getResolvedAlertIds(unresolvedIds);

  const numAlert = newUnresolvedIds.length + resolvedNotificationData.length;
  console.log(`🆕 New alerts: ${numAlert}, ✅ Resolved alerts: ${resolvedIds.length}`);

  const newSummaries = await Promise.all(newUnresolvedIds.map(id => fetchAlertSummary(id, false)));
  const resolvedSummaries = await Promise.all(resolvedIds.map(id => fetchAlertSummary(id, true)));

  const batch = [...newSummaries, ...resolvedSummaries, ...resolvedNotificationData].filter(Boolean) as AlertSummary[];

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