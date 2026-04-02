import type { Connection } from "home-assistant-js-websocket";

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  icon: string | null;
  labels: string[];
  aliases: string[];
  floor_id: string | null;
  picture: string | null;
}

export function subscribeAreaRegistry(
  conn: Connection,
  onChange: (entries: AreaRegistryEntry[]) => void
): () => void {
  let unsub: (() => void) | undefined;
  let active = true;

  conn
    .sendMessagePromise<AreaRegistryEntry[]>({
      type: "config/area_registry/list",
    })
    .then((entries) => {
      if (active) onChange(entries);
    });

  const handler = (event: { action: string }) => {
    if (event.action) {
      conn
        .sendMessagePromise<AreaRegistryEntry[]>({
          type: "config/area_registry/list",
        })
        .then((entries) => {
          if (active) onChange(entries);
        });
    }
  };

  conn
    .subscribeEvents<{ action: string }>(handler, "area_registry_updated")
    .then((u) => {
      unsub = u;
    });

  return () => {
    active = false;
    Promise.resolve(unsub?.()).catch(() => {});
  };
}
