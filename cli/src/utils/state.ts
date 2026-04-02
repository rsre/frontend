import type { HassEntity } from "home-assistant-js-websocket";

export function computeDomain(entityId: string): string {
  return entityId.substring(0, entityId.indexOf("."));
}

export function computeEntityName(entity: HassEntity): string {
  return (
    entity.attributes.friendly_name ??
    entity.entity_id.split(".")[1].replace(/_/g, " ")
  );
}

export function formatState(entity: HassEntity): string {
  const { state, attributes } = entity;

  if (state === "unavailable") return "unavailable";
  if (state === "unknown") return "unknown";

  const unit = attributes.unit_of_measurement as string | undefined;

  // Boolean-like domains
  const domain = computeDomain(entity.entity_id);
  if (["switch", "light", "binary_sensor", "input_boolean"].includes(domain)) {
    return state === "on" ? "on" : "off";
  }

  if (unit) return `${state} ${unit}`;
  return state;
}

export function stateColor(entity: HassEntity): string {
  const { state } = entity;
  const domain = computeDomain(entity.entity_id);

  if (state === "unavailable" || state === "unknown") return "gray";

  switch (domain) {
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
      return state === "on" ? "yellow" : "white";
    case "binary_sensor":
      return state === "on" ? "green" : "white";
    case "alarm_control_panel":
      return state.startsWith("armed") ? "red" : "green";
    case "climate":
      return "cyan";
    case "media_player":
      return state === "playing" ? "magenta" : "white";
    case "cover":
      return state === "open" ? "green" : "white";
    case "lock":
      return state === "locked" ? "green" : "red";
    case "sensor":
      return "cyan";
    default:
      return "white";
  }
}

export function domainIcon(domain: string): string {
  const icons: Record<string, string> = {
    light: "💡",
    switch: "🔌",
    sensor: "📡",
    binary_sensor: "⚡",
    climate: "🌡️",
    media_player: "🎵",
    cover: "🪟",
    lock: "🔒",
    camera: "📷",
    automation: "⚙️",
    script: "📜",
    scene: "🎬",
    fan: "💨",
    alarm_control_panel: "🚨",
    device_tracker: "📍",
    person: "👤",
    weather: "🌤️",
    input_boolean: "🔘",
    input_number: "🔢",
    input_select: "📋",
    input_text: "📝",
    timer: "⏱️",
    counter: "🔢",
    sun: "☀️",
    calendar: "📅",
    todo: "✅",
    update: "🔄",
    button: "🔲",
  };
  return icons[domain] ?? "•";
}

export const DOMAINS_ORDER = [
  "light",
  "switch",
  "climate",
  "media_player",
  "cover",
  "lock",
  "fan",
  "binary_sensor",
  "sensor",
  "automation",
  "script",
  "scene",
  "person",
  "device_tracker",
  "camera",
  "alarm_control_panel",
  "weather",
  "input_boolean",
  "input_number",
  "input_select",
  "input_text",
  "timer",
  "counter",
  "button",
  "update",
  "calendar",
  "todo",
];

export function sortDomains(domains: string[]): string[] {
  const indexed = DOMAINS_ORDER;
  return [...domains].sort((a, b) => {
    const ai = indexed.indexOf(a);
    const bi = indexed.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
