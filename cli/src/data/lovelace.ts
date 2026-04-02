import type { Connection, HassEntities } from "home-assistant-js-websocket";
import type { AreaRegistryEntry } from "./area_registry.js";
import type { EntityRegistryEntry } from "./entity_registry.js";
import { computeDomain, domainIcon, sortDomains } from "../utils/state.js";

export interface LovelaceCardConfig {
  type: string;
  entity?: string;
  entities?: (string | { entity: string; name?: string })[];
  title?: string;
  name?: string;
  heading?: string;
  icon?: string;
  cards?: LovelaceCardConfig[]; // vertical-stack, horizontal-stack, grid
  [key: string]: unknown;
}

export interface LovelaceSectionConfig {
  type?: string;
  title?: string;
  cards?: LovelaceCardConfig[];
}

export interface LovelaceViewConfig {
  title?: string;
  path?: string;
  icon?: string;
  type?: string;
  cards?: LovelaceCardConfig[];
  sections?: LovelaceSectionConfig[];
}

export interface LovelaceConfig {
  views: LovelaceViewConfig[];
}

/** Flatten a view's cards regardless of whether it uses the legacy or sections layout. */
export function viewCards(view: LovelaceViewConfig): LovelaceCardConfig[] {
  if (view.sections && view.sections.length > 0) {
    return view.sections.flatMap((s) => s.cards ?? []);
  }
  return view.cards ?? [];
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    return String(o.message ?? o.code ?? JSON.stringify(e));
  }
  return String(e);
}

/**
 * Build a simple dashboard config from entity/area registry when no Lovelace
 * config exists (HA running in auto-generated strategy mode).
 */
export function generateDashboard(
  entities: HassEntities,
  entityRegistry: Record<string, EntityRegistryEntry>,
  areas: Record<string, AreaRegistryEntry>
): LovelaceConfig {
  const areaList = Object.values(areas);
  const views: LovelaceViewConfig[] = [];

  // One view per area
  for (const area of areaList) {
    const areaEntityIds = Object.values(entityRegistry)
      .filter(
        (e) =>
          e.area_id === area.area_id &&
          !e.disabled_by &&
          !e.hidden_by &&
          entities[e.entity_id]
      )
      .map((e) => e.entity_id);

    if (areaEntityIds.length === 0) continue;

    // Group by domain inside the area
    const byDomain: Record<string, string[]> = {};
    for (const id of areaEntityIds) {
      const d = computeDomain(id);
      (byDomain[d] ??= []).push(id);
    }

    const cards: LovelaceCardConfig[] = [];
    for (const domain of sortDomains(Object.keys(byDomain))) {
      const ids = byDomain[domain];
      cards.push({
        type: "heading",
        heading: domain,
        icon: domainIcon(domain),
      });
      for (const entityId of ids) {
        cards.push({ type: "tile", entity: entityId });
      }
    }

    views.push({ title: area.name, path: area.area_id, cards });
  }

  // Fallback "All entities" view for entities not assigned to any area
  const unassignedIds = Object.values(entityRegistry)
    .filter(
      (e) =>
        !e.area_id &&
        !e.disabled_by &&
        !e.hidden_by &&
        entities[e.entity_id]
    )
    .map((e) => e.entity_id);

  if (unassignedIds.length > 0 || views.length === 0) {
    const byDomain: Record<string, string[]> = {};
    const sourceIds = views.length === 0
      ? Object.keys(entities)
      : unassignedIds;

    for (const id of sourceIds) {
      const d = computeDomain(id);
      (byDomain[d] ??= []).push(id);
    }

    const cards: LovelaceCardConfig[] = [];
    for (const domain of sortDomains(Object.keys(byDomain))) {
      cards.push({
        type: "heading",
        heading: domain,
        icon: domainIcon(domain),
      });
      for (const entityId of byDomain[domain]) {
        cards.push({ type: "tile", entity: entityId });
      }
    }

    views.unshift({ title: "All entities", path: "all", cards });
  }

  return { views };
}

export interface LovelaceDashboard {
  id: string;
  url_path: string | null; // null = default dashboard
  title: string | null;
  icon: string | null;
  show_in_sidebar: boolean;
  require_admin: boolean;
  mode: string;
}

/** List all dashboards registered in HA. The default one has url_path "lovelace". */
export async function fetchDashboards(
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>
): Promise<LovelaceDashboard[]> {
  return callWS<LovelaceDashboard[]>({ type: "lovelace/dashboards/list" });
}

/** Fetch config for a specific dashboard by url_path. */
async function fetchConfig(
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>,
  urlPath: string | null
): Promise<LovelaceConfig> {
  return callWS<LovelaceConfig>({
    type: "lovelace/config",
    url_path: urlPath,
    force: false,
  });
}

/**
 * Subscribe to Lovelace config for a specific dashboard (by url_path).
 * Falls back to auto-generated dashboard if no config exists.
 */
export function subscribeLovelace(
  connection: Connection,
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>,
  urlPath: string | null,
  onChange: (config: LovelaceConfig) => void,
  onError: (err: string) => void,
  getFallbackData: () => {
    entities: HassEntities;
    entityRegistry: Record<string, EntityRegistryEntry>;
    areas: Record<string, AreaRegistryEntry>;
  }
): () => void {
  let active = true;
  let unsub: (() => void) | undefined;

  const reload = () =>
    fetchConfig(callWS, urlPath)
      .then((cfg) => {
        if (active) onChange(cfg);
      })
      .catch((e: unknown) => {
        if (!active) return;
        const msg = errorMessage(e);
        if (
          msg.toLowerCase().includes("no config") ||
          msg.toLowerCase().includes("not found") ||
          msg === "config_not_found"
        ) {
          const { entities, entityRegistry, areas } = getFallbackData();
          onChange(generateDashboard(entities, entityRegistry, areas));
        } else {
          onError(msg);
        }
      });

  reload();

  connection
    .subscribeEvents<Record<string, unknown>>(() => {
      if (active) reload().catch(() => {});
    }, "lovelace_updated")
    .then((u) => {
      if (active) {
        unsub = u;
      } else {
        // Already cleaned up before subscription resolved — unsubscribe immediately
        Promise.resolve(u()).catch(() => {});
      }
    })
    .catch(() => {
      // non-fatal — we just won't live-refresh on dashboard edits
    });

  return () => {
    active = false;
    Promise.resolve(unsub?.()).catch(() => {});
  };
}
