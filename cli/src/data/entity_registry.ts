import type { Connection } from "home-assistant-js-websocket";

export interface EntityRegistryEntry {
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  unique_id: string;
  disabled_by: string | null;
  hidden_by: string | null;
  device_id: string | null;
  area_id: string | null;
  labels: string[];
  aliases: string[];
  translation_key: string | null;
  original_name: string | null;
  device_class: string | null;
  original_icon: string | null;
  entity_category: string | null;
  has_entity_name: boolean;
  options: Record<string, unknown> | null;
}

export function subscribeEntityRegistry(
  conn: Connection,
  onChange: (entries: EntityRegistryEntry[]) => void
): () => void {
  let unsub: (() => void) | undefined;
  let active = true;

  conn
    .sendMessagePromise<EntityRegistryEntry[]>({
      type: "config/entity_registry/list",
    })
    .then((entries) => {
      if (active) onChange(entries);
    });

  // Re-fetch on updates
  const handler = (event: { action: string }) => {
    if (event.action) {
      conn
        .sendMessagePromise<EntityRegistryEntry[]>({
          type: "config/entity_registry/list",
        })
        .then((entries) => {
          if (active) onChange(entries);
        });
    }
  };

  conn
    .subscribeEvents<{ action: string }>(handler, "entity_registry_updated")
    .then((u) => {
      unsub = u;
    });

  return () => {
    active = false;
    unsub?.();
  };
}
