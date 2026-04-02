import React, { useEffect, useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { useStore } from "../store.js";
import { useListLimit } from "../hooks/useTerminalHeight.js";
import { computeDomain, domainIcon } from "../utils/state.js";

interface LogbookEntry {
  when: number;
  name: string;
  message: string;
  entity_id?: string;
  domain?: string;
  state?: string;
  icon?: string;
}

const SCROLL_STEP = 5;

export function LogbookPanel() {
  const { callWS } = useStore();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  // StatusBar=3, header=1, footer=1 → overhead=5
  const pageSize = useListLimit(5);

  const fetchLogbook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = await callWS<LogbookEntry[]>({
        type: "logbook/get_events",
        start_time: startTime,
        end_time: endTime,
      });
      // Most recent first
      setEntries([...result].reverse());
      setOffset(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [callWS]);

  useEffect(() => {
    fetchLogbook();
  }, [fetchLogbook]);

  useInput((input, key) => {
    if (input === "r") {
      fetchLogbook();
      return;
    }
    if (key.downArrow || input === "j") {
      setOffset((o) => Math.min(o + SCROLL_STEP, Math.max(0, entries.length - pageSize)));
    }
    if (key.upArrow || input === "k") {
      setOffset((o) => Math.max(0, o - SCROLL_STEP));
    }
    if (key.pageDown) {
      setOffset((o) => Math.min(o + pageSize, Math.max(0, entries.length - pageSize)));
    }
    if (key.pageUp) {
      setOffset((o) => Math.max(0, o - pageSize));
    }
  });

  if (loading) {
    return (
      <Box padding={1} gap={1}>
        <Spinner type="dots" />
        <Text color="gray">Loading logbook…</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Failed to load logbook: {error}</Text>
        <Text color="gray">Press r to retry.</Text>
      </Box>
    );
  }

  const visible = entries.slice(offset, offset + pageSize);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1}>
        <Text color="gray">
          {entries.length} events (last 24h){"  "}
          <Text color="gray">↑↓ scroll  PgUp/PgDn  r refresh</Text>
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {visible.length === 0 && (
          <Box padding={1}>
            <Text color="gray">No events in the last 24 hours.</Text>
          </Box>
        )}
        {visible.map((entry, i) => {
          const time = new Date(entry.when * 1000).toLocaleTimeString();
          const domain = entry.domain ?? (entry.entity_id ? computeDomain(entry.entity_id) : "");
          const icon = domainIcon(domain);
          const stateColor =
            entry.state === "on" || entry.state === "home"
              ? "green"
              : entry.state === "off" || entry.state === "away"
              ? "gray"
              : "white";

          return (
            <Box key={`${entry.when}-${i}`} gap={1}>
              <Text color="gray">{time}</Text>
              <Text>{icon}</Text>
              <Text bold color="white">
                {(entry.name ?? "").padEnd(32)}
              </Text>
              <Text color={stateColor}>{entry.message ?? entry.state ?? ""}</Text>
            </Box>
          );
        })}
      </Box>

      <Box paddingX={1}>
        <Text color="gray">
          {offset + 1}–{Math.min(offset + pageSize, entries.length)} of {entries.length}
        </Text>
      </Box>
    </Box>
  );
}
