import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";
import SelectInput from "ink-select-input";
import { useStore } from "../store.js";
import { Widget } from "../widgets/Widget.js";
import {
  fetchDashboards,
  subscribeLovelace,
  viewCards,
  type LovelaceConfig,
  type LovelaceCardConfig,
  type LovelaceDashboard,
} from "../data/lovelace.js";
import { EntityDetailPanel } from "./EntityDetailPanel.js";

const WIDGET_W = 38;
const WIDGET_ROW_H = 4; // every widget renders exactly 4 terminal lines (border×2 + 2 content)
const FULL_WIDTH_TYPES = new Set(["entities", "heading"]);

function toRows(cards: LovelaceCardConfig[], cols: number): LovelaceCardConfig[][] {
  const rows: LovelaceCardConfig[][] = [];
  let row: LovelaceCardConfig[] = [];
  for (const card of cards) {
    if (FULL_WIDTH_TYPES.has(card.type)) {
      if (row.length > 0) { rows.push(row); row = []; }
      rows.push([card]);
    } else {
      row.push(card);
      if (row.length >= cols) { rows.push(row); row = []; }
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

// Synthetic entry for the built-in default dashboard
const DEFAULT_DASHBOARD: LovelaceDashboard = {
  id: "__default__",
  url_path: null, // null tells HA to return the default dashboard config
  title: "Home",
  icon: null,
  show_in_sidebar: true,
  require_admin: false,
  mode: "storage",
};

export function DashboardPanel() {
  const { connection, callWS, entities, entityRegistry, areas } = useStore();
  const { stdout } = useStdout();

  const [dashboards, setDashboards] = useState<LovelaceDashboard[]>([DEFAULT_DASHBOARD]);
  const [dashboardIndex, setDashboardIndex] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const [config, setConfig] = useState<LovelaceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewIndex, setViewIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollRow, setScrollRow] = useState(0);
  const [detailEntity, setDetailEntity] = useState<string | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);

  const cols = Math.max(1, Math.min(4, Math.floor((stdout.columns ?? 80) / WIDGET_W)));
  const widgetWidth = Math.floor((stdout.columns ?? 80) / cols);
  // StatusBar=3, header=1, footer=1 → 5 lines of chrome
  const visibleRows = Math.max(2, Math.floor(((stdout.rows ?? 24) - 5) / WIDGET_ROW_H));

  // Load dashboard list
  useEffect(() => {
    fetchDashboards(callWS)
      .then((list) => {
        if (list.length > 0) {
          const sorted = [...list].sort((a, b) => {
            if (a.show_in_sidebar !== b.show_in_sidebar) return a.show_in_sidebar ? -1 : 1;
            return (a.title ?? "").localeCompare(b.title ?? "");
          });
          setDashboards(sorted);
        }
        // If empty, keep the synthetic default
      })
      .catch(() => {
        // Keep the synthetic default — HA might be using legacy mode
      });
  }, [callWS]);

  const getFallback = useCallback(
    () => ({ entities, entityRegistry, areas }),
    [entities, entityRegistry, areas]
  );

  const loadDashboard = useCallback(
    (urlPath: string | null) => {
      unsubRef.current?.();
      setLoading(true);
      setError(null);
      setConfig(null);
      setViewIndex(0);
      setSelectedIndex(0);
      setScrollRow(0);

      unsubRef.current = subscribeLovelace(
        connection, callWS, urlPath,
        (cfg) => { setConfig(cfg); setLoading(false); },
        (err) => { setError(err); setLoading(false); },
        getFallback
      );
    },
    [connection, callWS, getFallback]
  );

  useEffect(() => {
    const d = dashboards[dashboardIndex];
    loadDashboard(d?.url_path ?? null);
    return () => { unsubRef.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardIndex, dashboards]);

  useEffect(() => {
    setSelectedIndex(0);
    setScrollRow(0);
  }, [viewIndex]);

  const currentView = config?.views[viewIndex];
  const allCards = useMemo(() => (currentView ? viewCards(currentView) : []), [currentView]);
  const selectableCards = useMemo(() => allCards.filter((c) => c.type !== "heading"), [allCards]);
  const rows = useMemo(() => toRows(allCards, cols), [allCards, cols]);

  // Grid position maps for accurate keyboard navigation.
  // pos[selectableIdx] = {ri, ci} in the rows grid.
  // rowColMap[ri][ci] = selectableIdx, or -1 for non-selectable (heading) cards.
  const { cardPos, rowColMap } = useMemo(() => {
    const pos: Array<{ ri: number; ci: number }> = [];
    const rcMap: number[][] = rows.map((row) => new Array(row.length).fill(-1));
    let sIdx = 0;
    for (let ri = 0; ri < rows.length; ri++) {
      for (let ci = 0; ci < rows[ri].length; ci++) {
        if (rows[ri][ci].type !== "heading") {
          pos[sIdx] = { ri, ci };
          rcMap[ri][ci] = sIdx;
          sIdx++;
        }
      }
    }
    return { cardPos: pos, rowColMap: rcMap };
  }, [rows]);

  useInput((input, key) => {
    if (showPicker) {
      if (key.escape) setShowPicker(false);
      return;
    }
    if (detailEntity) {
      if (key.escape) setDetailEntity(null);
      return;
    }
    if (input === "d") { setShowPicker(true); return; }
    if (input === "r") { loadDashboard(dashboards[dashboardIndex]?.url_path ?? null); return; }

    const total = selectableCards.length;
    if (total === 0) return;

    const cur = cardPos[selectedIndex];

    // Find the best selectableIdx in row `ri` closest to column `targetCi`
    const bestInRow = (ri: number, targetCi: number): number | undefined => {
      let best: number | undefined;
      let bestDist = Infinity;
      for (let ci = 0; ci < (rows[ri]?.length ?? 0); ci++) {
        const idx = rowColMap[ri]?.[ci] ?? -1;
        if (idx >= 0) {
          const dist = Math.abs(ci - targetCi);
          if (dist < bestDist) { bestDist = dist; best = idx; }
        }
      }
      return best;
    };

    if (key.leftArrow) {
      if (cur) {
        // Move left within same row
        for (let ci = cur.ci - 1; ci >= 0; ci--) {
          const idx = rowColMap[cur.ri]?.[ci] ?? -1;
          if (idx >= 0) { setSelectedIndex(idx); return; }
        }
      }
      // At left edge → switch view
      setViewIndex((v) => Math.max(0, v - 1));
      return;
    }

    if (key.rightArrow) {
      if (cur) {
        // Move right within same row
        for (let ci = cur.ci + 1; ci < (rows[cur.ri]?.length ?? 0); ci++) {
          const idx = rowColMap[cur.ri]?.[ci] ?? -1;
          if (idx >= 0) { setSelectedIndex(idx); return; }
        }
      }
      // At right edge → switch view
      if (config) setViewIndex((v) => Math.min(config.views.length - 1, v + 1));
      return;
    }

    if (key.downArrow || input === "j") {
      if (!cur) return;
      for (let ri = cur.ri + 1; ri < rows.length; ri++) {
        const next = bestInRow(ri, cur.ci);
        if (next !== undefined) {
          setSelectedIndex(next);
          if (ri >= scrollRow + visibleRows) setScrollRow(ri - visibleRows + 1);
          return;
        }
      }
      return;
    }

    if (key.upArrow || input === "k") {
      if (!cur) return;
      for (let ri = cur.ri - 1; ri >= 0; ri--) {
        const next = bestInRow(ri, cur.ci);
        if (next !== undefined) {
          setSelectedIndex(next);
          if (ri < scrollRow) setScrollRow(ri);
          return;
        }
      }
      return;
    }

    if (key.return) {
      const card = selectableCards[selectedIndex];
      const entityId = card?.entity as string | undefined;
      if (entityId) setDetailEntity(entityId);
    }
  });

  if (detailEntity) {
    return <EntityDetailPanel entityId={detailEntity} onBack={() => setDetailEntity(null)} />;
  }

  // Dashboard picker overlay
  if (showPicker) {
    const items = dashboards.map((d, i) => ({
      label: `${i === dashboardIndex ? "▶ " : "  "}${d.title ?? d.url_path}`,
      value: String(i),
    }));
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">Select dashboard  <Text color="gray">(Esc to cancel)</Text></Text>
        <SelectInput
          items={items}
          initialIndex={dashboardIndex}
          onSelect={(item) => {
            setDashboardIndex(Number(item.value));
            setShowPicker(false);
          }}
        />
      </Box>
    );
  }

  const currentDashboard = dashboards[dashboardIndex];

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Dashboard + view bar — kept short so it never wraps to a second line */}
      <Box paddingX={1} gap={2}>
        <Text color="magenta" bold>{currentDashboard?.title ?? "Home"}</Text>
        <Text color="gray">[d]</Text>
        <Box gap={1}>
          {config?.views.slice(0, 6).map((v, i) => (
            <Text key={v.path ?? i} color={i === viewIndex ? "cyan" : "gray"} bold={i === viewIndex}>
              {i === viewIndex ? `[${v.title ?? `View ${i + 1}`}]` : (v.title ?? `View ${i + 1}`)}
            </Text>
          ))}
          {(config?.views.length ?? 0) > 6 && (
            <Text color="gray">+{(config?.views.length ?? 0) - 6}</Text>
          )}
        </Box>
      </Box>

      {/* Body */}
      {loading && !config ? (
        <Box padding={1} gap={1}><Spinner type="dots" /><Text color="gray">Loading…</Text></Box>
      ) : error ? (
        <Box flexDirection="column" padding={1}>
          <Text color="red">Error: {error}</Text>
          <Text color="gray">Press r to retry.</Text>
        </Box>
      ) : !config || config.views.length === 0 ? (
        <Box padding={1}><Text color="gray">No views found in this dashboard.</Text></Box>
      ) : (
        <>
          <Box flexDirection="column">
            {Array.from({ length: visibleRows }, (_, ri) => {
              const row = rows[scrollRow + ri];
              if (!row) {
                // Null spacer: exactly WIDGET_ROW_H blank lines to keep total height stable
                return (
                  <Box key={`row-${ri}`} flexDirection="column">
                    <Text> </Text>
                    <Text> </Text>
                    <Text> </Text>
                    <Text> </Text>
                  </Box>
                );
              }
              const isFullRow = row.length === 1 && FULL_WIDTH_TYPES.has(row[0].type);
              let selectIdx = rows
                .slice(0, scrollRow + ri)
                .flat()
                .filter((c) => c.type !== "heading").length;
              return (
                <Box key={`row-${ri}`} flexDirection="row">
                  {row.map((card, ci) => {
                    const isHeading = card.type === "heading";
                    const thisIdx = isHeading ? -1 : selectIdx++;
                    const w = isFullRow ? Math.max(1, (stdout.columns ?? 80) - 2) : widgetWidth;
                    return (
                      <Widget
                        key={`${ri}-${ci}`}
                        card={card} width={w}
                        isSelected={!isHeading && thisIdx === selectedIndex}
                      />
                    );
                  })}
                </Box>
              );
            })}
          </Box>
          <Box paddingX={1} justifyContent="space-between">
            <Text color="gray">
              {rows.length > visibleRows ? `rows ${scrollRow + 1}–${Math.min(scrollRow + visibleRows, rows.length)} of ${rows.length}` : ""}
            </Text>
            <Text color="gray">←/→ views  ↑↓ nav  Enter: open  d: switch  r: reload</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
