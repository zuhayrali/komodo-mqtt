import type { MqttClient } from "mqtt";

const lastPublishedConfigs = new Map<string, string>();

export function publishDiscoveryConfig(
  client: MqttClient,
  serverName: string,
  options: { enabled: boolean } = { enabled: false }
) {
  if (!options.enabled) return;

  const baseTopic = `homeassistant/sensor/komodo_${serverName}`;
  const stateTopic = `komodo/servers/${serverName}`;

  const deviceInfo = {
    identifiers: [`komodo_${serverName}`],
    name: `Komodo ${serverName}`,
    manufacturer: "Komodo",
    model: "Server Monitor",
    sw_version: "1.0.0",
  };

  const sensors = [
    {
      name: "CPU Usage",
      key: "cpu",
      value_template: "{{ value_json.cpu }}",
      unit: "%",
    },
    {
      name: "RAM Usage",
      key: "ram",
      value_template: "{{ value_json.memPercentage }}",
      unit: "%",
    },
    {
      name: "Network In",
      key: "netin",
      value_template: "{{ value_json.networkIn }}",
      unit: "MB",
    },
    {
      name: "Network Out",
      key: "netout",
      value_template: "{{ value_json.networkOut }}",
      unit: "MB",
    },
  ];

  sensors.forEach(sensor => {
    const topic = `${baseTopic}/${sensor.key}/config`;
    const objectId = `komodo_${serverName}_${sensor.key}`;

    const payload = {
      name: `${serverName} ${sensor.name}`,
      object_id: objectId,
      state_topic: stateTopic,
      value_template: sensor.value_template,
      unique_id: objectId,
      unit_of_measurement: sensor.unit,
      device: deviceInfo,
    };

    const payloadStr = JSON.stringify(payload);
    const lastPayload = lastPublishedConfigs.get(topic);

    if (payloadStr !== lastPayload) {
      client.publish(topic, payloadStr, { retain: true, qos: 0 });
      lastPublishedConfigs.set(topic, payloadStr);
      console.log(`✅ Published discovery config for ${sensor.name}`);
    }
  });
}
