import type { Connection } from "home-assistant-js-websocket";

export interface DeviceRegistryEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  manufacturer: string | null;
  model: string | null;
  area_id: string | null;
  disabled_by: string | null;
  labels: string[];
  identifiers: [string, string][];
  connections: [string, string][];
  config_entries: string[];
  entry_type: string | null;
  via_device_id: string | null;
  hw_version: string | null;
  serial_number: string | null;
  sw_version: string | null;
  configuration_url: string | null;
}

export function subscribeDeviceRegistry(
  conn: Connection,
  onChange: (entries: DeviceRegistryEntry[]) => void
): () => void {
  let unsub: (() => void) | undefined;
  let active = true;

  conn
    .sendMessagePromise<DeviceRegistryEntry[]>({
      type: "config/device_registry/list",
    })
    .then((entries) => {
      if (active) onChange(entries);
    });

  const handler = (event: { action: string }) => {
    if (event.action) {
      conn
        .sendMessagePromise<DeviceRegistryEntry[]>({
          type: "config/device_registry/list",
        })
        .then((entries) => {
          if (active) onChange(entries);
        });
    }
  };

  conn
    .subscribeEvents<{ action: string }>(handler, "device_registry_updated")
    .then((u) => {
      unsub = u;
    });

  return () => {
    active = false;
    Promise.resolve(unsub?.()).catch(() => {});
  };
}
