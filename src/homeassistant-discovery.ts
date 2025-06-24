import mqtt, { MqttClient } from "mqtt";

const lastPublishedConfigs = new Map<string, string>();

export function publishDiscoveryConfig(
  client: MqttClient,
  serverName: string,
  options: { enabled: boolean } = { enabled: false }
) {
  if (!options.enabled) return;

  const baseTopic = `homeassistant/sensor/komodo/${serverName}`;

  const sensors = [
    {
      name: `${serverName} CPU Usage`,
      object_id: `${serverName}_cpu`,
      value_template: "{{ value_json.cpu }}",
      unit_of_measurement: "%",
    },
    {
      name: `${serverName} RAM Usage`,
      object_id: `${serverName}_ram`,
      value_template: "{{ value_json.memPercentage }}",
      unit_of_measurement: "%",
    },
    {
      name: `${serverName} Network In`,
      object_id: `${serverName}_net_in`,
      value_template: "{{ value_json.networkIn }}",
      unit_of_measurement: "MB",
    },
    {
      name: `${serverName} Network Out`,
      object_id: `${serverName}_net_out`,
      value_template: "{{ value_json.networkOut }}",
      unit_of_measurement: "MB",
    },
  ];

  sensors.forEach(sensor => {
    const suffix = sensor.object_id.split("_").pop();
    const topic = `${baseTopic}_${suffix}/config`;

    const payload = {
      name: sensor.name,
      object_id: sensor.object_id,
      state_topic: `komodo/servers/${serverName}`,
      value_template: sensor.value_template,
      unique_id: sensor.object_id,
      device: {
        identifiers: [`komodo_${serverName}`],
        name: `komodo_${serverName}`,
      },
      unit_of_measurement: sensor.unit_of_measurement,
    };

    const payloadStr = JSON.stringify(payload);
    const lastPayload = lastPublishedConfigs.get(topic);

    if (lastPayload !== payloadStr) {
      client.publish(topic, payloadStr, { retain: true, qos: 0 });
      lastPublishedConfigs.set(topic, payloadStr);
      console.log(`🔄 Published discovery config to ${topic}`);
    } 
  });
}
