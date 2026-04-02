import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";
import { useStore } from "../store.js";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import {
  extractEntityIds,
  fmtDate,
  fmtNum,
  fmtTime,
  sparkline,
  type StatisticValue,
} from "../utils/graphCards.js";
import { computeDomain, domainIcon } from "../utils/state.js";

interface Props {
  card: LovelaceCardConfig;
  onBack: () => void;
}

// ── Statistics-graph types ────────────────────────────────────────────────────

interface StatRow {
  entityId: string;
  label: string;
  icon: string;
  mean: string;
  min: string;
  max: string;
  trend: string;
}

// ── History-graph types ───────────────────────────────────────────────────────

interface HistoryEntry {
  s: string;
  lu: number;
}

interface HistoryRow {
  entityId: string;
  label: string;
  icon: string;
  entries: HistoryEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateEntryColor(s: string): string {
  const lower = s.toLowerCase();
  if (lower === "unavailable" || lower === "unknown") return "gray";
  if (["on", "home", "playing", "open", "unlocked"].includes(lower))
    return "yellow";
  if (["off", "away", "idle", "closed", "locked"].includes(lower))
    return "white";
  return "cyan";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CardDetailPanel({ card, onBack }: Props) {
  const { connection, callWS, entities } = useStore();
  const { stdout } = useStdout();
  const cols = stdout.columns ?? 80;

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statsRows, setStatsRows] = useState<StatRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const unsubRef = useRef<(() => void) | null>(null);

  const isStats = card.type === "statistics-graph";
  const rawEntities = Array.isArray(card.entities) ? card.entities : [];
  const entityIds = extractEntityIds(
    rawEntities as (string | { entity: string; name?: string })[]
  );

  const title =
    (typeof card.title === "string" ? card.title : undefined) ??
    (entityIds[0]
      ? (entities[entityIds[0]]?.attributes.friendly_name as
          | string
          | undefined) ?? entityIds[0].split(".")[1]?.replace(/_/g, " ")
      : isStats
        ? "Statistics"
        : "History");

  // ── Fetch statistics (one-shot) ──────────────────────────────────────────
  useEffect(() => {
    if (!isStats) return;
    if (entityIds.length === 0) {
      setLoadState("ready");
      setStatsRows([]);
      return;
    }

    setLoadState("loading");
    setErrorMsg(null);

    const days = typeof card.days_to_show === "number" ? card.days_to_show : 30;
    const period =
      typeof card.period === "string" ? card.period : "hour";
    const types =
      Array.isArray(card.stat_types) && card.stat_types.length > 0
        ? (card.stat_types as string[])
        : ["mean", "min", "max"];

    const startTime = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    // sparkline width: cols minus name(28) + mean/min/max cols(7*3) + padding
    const sparkLen = Math.max(12, cols - 28 - 7 * 3 - 8);

    callWS<Record<string, StatisticValue[]>>({
      type: "recorder/statistics_during_period",
      start_time: startTime,
      statistic_ids: entityIds,
      period,
      types,
    })
      .then((data) => {
        const rows: StatRow[] = entityIds.map((id) => {
          const values = data[id] ?? [];
          const label =
            (entities[id]?.attributes.friendly_name as string | undefined) ??
            id.split(".")[1]?.replace(/_/g, " ") ??
            id;
          const icon = domainIcon(computeDomain(id));

          // Prefer mean; fall back to state
          const nums = values
            .map((v) => v.mean ?? v.state)
            .filter((n): n is number => n !== undefined && Number.isFinite(n));

          const allMean = values
            .map((v) => v.mean)
            .filter((n): n is number => n !== undefined && Number.isFinite(n));
          const allMin = values
            .map((v) => v.min)
            .filter((n): n is number => n !== undefined && Number.isFinite(n));
          const allMax = values
            .map((v) => v.max)
            .filter((n): n is number => n !== undefined && Number.isFinite(n));

          const meanVal =
            allMean.length > 0
              ? allMean.reduce((a, b) => a + b, 0) / allMean.length
              : undefined;
          const minVal = allMin.length > 0 ? Math.min(...allMin) : undefined;
          const maxVal = allMax.length > 0 ? Math.max(...allMax) : undefined;

          const trend = sparkline(nums.slice(-sparkLen));

          return {
            entityId: id,
            label,
            icon,
            mean: fmtNum(meanVal),
            min: fmtNum(minVal),
            max: fmtNum(maxVal),
            trend,
          };
        });
        setStatsRows(rows);
        setLoadState("ready");
      })
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setLoadState("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStats, refreshKey]);

  // ── Subscribe to history stream ──────────────────────────────────────────
  useEffect(() => {
    if (isStats) return;
    if (entityIds.length === 0) {
      setLoadState("ready");
      setHistoryRows([]);
      return;
    }

    setLoadState("loading");
    setErrorMsg(null);

    // accumulator keyed by entity_id
    const acc: Record<string, HistoryEntry[]> = {};
    let active = true;

    const hours =
      typeof card.hours_to_show === "number" ? card.hours_to_show : 24;
    const startTime = new Date(
      Date.now() - hours * 60 * 60 * 1000
    ).toISOString();

    connection
      .subscribeMessage(
        (msg: { states?: Record<string, HistoryEntry[]> }) => {
          if (!active || !msg.states) return;
          for (const [id, entries] of Object.entries(msg.states)) {
            const existing = acc[id] ?? [];
            acc[id] = [...existing, ...entries];
          }
          const rows: HistoryRow[] = entityIds.map((id) => ({
            entityId: id,
            label:
              (entities[id]?.attributes.friendly_name as string | undefined) ??
              id.split(".")[1]?.replace(/_/g, " ") ??
              id,
            icon: domainIcon(computeDomain(id)),
            entries: (acc[id] ?? []).slice().reverse(),
          }));
          setHistoryRows(rows);
          if (loadState !== "ready") setLoadState("ready");
        },
        {
          type: "history/stream",
          entity_ids: entityIds,
          start_time: startTime,
          minimal_response: true,
          significant_changes_only: true,
          no_attributes: true,
        }
      )
      .then((unsub) => {
        if (active) {
          unsubRef.current = unsub;
        } else {
          Promise.resolve(unsub()).catch(() => {});
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setLoadState("error");
      });

    return () => {
      active = false;
      Promise.resolve(unsubRef.current?.()).catch(() => {});
      unsubRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStats, refreshKey]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useInput((input, key) => {
    if (key.escape) { onBack(); return; }
    if (input === "r") {
      setLoadState("loading");
      setOffset(0);
      setRefreshKey((k) => k + 1);
      return;
    }
    const pageSize = 5;
    if (key.downArrow || input === "j")
      setOffset((o) => o + 1);
    if (key.upArrow || input === "k")
      setOffset((o) => Math.max(0, o - 1));
    if (key.pageDown)
      setOffset((o) => o + pageSize);
    if (key.pageUp)
      setOffset((o) => Math.max(0, o - pageSize));
  });

  // ── Header (always shown) ─────────────────────────────────────────────────
  const days = typeof card.days_to_show === "number" ? card.days_to_show : 30;
  const hours = typeof card.hours_to_show === "number" ? card.hours_to_show : 24;
  const period = typeof card.period === "string" ? card.period : "hour";

  const subhead = isStats
    ? `${entityIds.length} ${entityIds.length === 1 ? "entity" : "entities"}  •  ${fmtDate(new Date(Date.now() - days * 86400000))} → ${fmtDate(new Date())}`
    : `${entityIds.length} ${entityIds.length === 1 ? "entity" : "entities"}  •  last ${hours}h`;

  const headerEmoji = isStats ? "📊" : "📈";
  const headerSuffix = isStats ? `  ${period}  ${days}d` : `  last ${hours}h`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      {/* Header */}
      <Box gap={1} marginBottom={1}>
        <Text bold color="cyan">
          {headerEmoji} {title}
        </Text>
        <Text color="gray">{headerSuffix}</Text>
      </Box>
      <Text color="gray" dimColor>
        {subhead}
      </Text>

      {/* Body */}
      {loadState === "loading" && (
        <Box gap={1} marginTop={1}>
          <Spinner type="dots" />
          <Text color="gray">Loading…</Text>
        </Box>
      )}

      {loadState === "error" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">Error: {errorMsg}</Text>
          <Text color="gray">r retry  Esc back</Text>
        </Box>
      )}

      {loadState === "ready" && isStats && (
        <StatisticsBody rows={statsRows} offset={offset} cols={cols} />
      )}

      {loadState === "ready" && !isStats && (
        <HistoryBody rows={historyRows} offset={offset} />
      )}

      {/* Footer */}
      {loadState === "ready" && (
        <Box marginTop={1}>
          <Text color="gray">↑↓/jk scroll  r refresh  Esc back</Text>
        </Box>
      )}
    </Box>
  );
}

// ── Statistics body ───────────────────────────────────────────────────────────

function StatisticsBody({
  rows,
  offset,
  cols,
}: {
  rows: StatRow[];
  offset: number;
  cols: number;
}) {
  if (rows.length === 0) {
    return (
      <Box marginTop={1}>
        <Text color="gray">No statistics data available.</Text>
      </Box>
    );
  }

  const nameW = 28;
  const numW = 7;
  const sparkW = Math.max(12, cols - nameW - numW * 3 - 10);

  const header =
    "Entity".padEnd(nameW) +
    "Mean".padStart(numW) +
    "Min".padStart(numW) +
    "Max".padStart(numW) +
    "  Trend";
  const sep = "─".repeat(Math.min(cols - 4, nameW + numW * 3 + 2 + sparkW));

  const pageSize = 10;
  const start = Math.min(offset, Math.max(0, rows.length - pageSize));
  const visible = rows.slice(start, start + pageSize);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">{header}</Text>
      <Text color="gray" dimColor>
        {sep}
      </Text>
      {visible.map((row) => {
        const name = `${row.icon} ${row.label}`;
        const truncName =
          name.length > nameW ? name.slice(0, nameW - 1) + "…" : name;
        const trend =
          row.trend.length > sparkW
            ? row.trend.slice(-sparkW)
            : row.trend;
        return (
          <Text key={row.entityId}>
            <Text color="white">{truncName.padEnd(nameW)}</Text>
            <Text color="cyan">
              {row.mean.padStart(numW)}
              {row.min.padStart(numW)}
              {row.max.padStart(numW)}
            </Text>
            <Text color="yellow">{"  " + trend}</Text>
          </Text>
        );
      })}
      {rows.length > pageSize && (
        <Text color="gray" dimColor>
          rows {start + 1}–{Math.min(start + pageSize, rows.length)} of{" "}
          {rows.length}
        </Text>
      )}
    </Box>
  );
}

// ── History body ──────────────────────────────────────────────────────────────

const HISTORY_ENTRIES_PER_ENTITY = 4;
const HISTORY_PAGE_SIZE = 3; // entities per page

function HistoryBody({
  rows,
  offset,
}: {
  rows: HistoryRow[];
  offset: number;
}) {
  if (rows.length === 0) {
    return (
      <Box marginTop={1}>
        <Text color="gray">No history data available.</Text>
      </Box>
    );
  }

  const start = Math.min(offset, Math.max(0, rows.length - HISTORY_PAGE_SIZE));
  const visible = rows.slice(start, start + HISTORY_PAGE_SIZE);

  return (
    <Box flexDirection="column" marginTop={1}>
      {visible.map((row, i) => (
        <Box key={row.entityId} flexDirection="column" marginBottom={i < visible.length - 1 ? 1 : 0}>
          <Text bold color="white">
            {row.icon} {row.label}{" "}
            <Text color="gray">({row.entries.length} changes)</Text>
          </Text>
          {row.entries.length === 0 && (
            <Text color="gray" dimColor>
              {"  "}no changes recorded
            </Text>
          )}
          {row.entries
            .slice(0, HISTORY_ENTRIES_PER_ENTITY)
            .map((entry, j) => (
              <Text key={j}>
                <Text color="gray">{"  "}{fmtTime(entry.lu)}{"  → "}</Text>
                <Text color={stateEntryColor(entry.s)}>{entry.s}</Text>
              </Text>
            ))}
        </Box>
      ))}
      {rows.length > HISTORY_PAGE_SIZE && (
        <Text color="gray" dimColor>
          entities {start + 1}–{Math.min(start + HISTORY_PAGE_SIZE, rows.length)} of{" "}
          {rows.length}
        </Text>
      )}
    </Box>
  );
}
