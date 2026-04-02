export interface StatisticValue {
  start: string;
  end: string;
  mean?: number;
  min?: number;
  max?: number;
  state?: number;
  change?: number;
  sum?: number;
}

/** Normalise the mixed entities field from a card config to a plain string[]. */
export function extractEntityIds(
  entities: (string | { entity: string; name?: string })[]
): string[] {
  return entities.map((e) => (typeof e === "string" ? e : e.entity));
}

const BLOCKS = "▁▂▃▄▅▆▇█";

/** Render a numeric array as a Unicode block sparkline. Returns "—" for empty input. */
export function sparkline(values: number[]): string {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return "—";
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;
  return finite
    .map((v) =>
      range === 0 ? BLOCKS[3] : BLOCKS[Math.round(((v - min) / range) * 7)]
    )
    .join("");
}

/** Format a number to fixed decimals; returns "—" for undefined/NaN. */
export function fmtNum(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

/** Format a unix-seconds timestamp as a short time string (HH:MM). */
export function fmtTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a Date as a short date string (MM/DD). */
export function fmtDate(date: Date): string {
  return date.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
}
