import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useStore } from "../store.js";
import { SearchBar } from "../components/SearchBar.js";
import { useListLimit } from "../hooks/useTerminalHeight.js";
import {
  computeDomain,
  computeEntityName,
  formatState,
  stateColor,
  domainIcon,
  sortDomains,
} from "../utils/state.js";
import { EntityDetailPanel } from "./EntityDetailPanel.js";

export function EntitiesPanel() {
  const { entities } = useStore();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const limit = useListLimit(searching ? 7 : 5);

  useInput((input, key) => {
    if (selected) return;
    if (input === "/" && !searching) {
      setSearching(true);
      return;
    }
    if (key.escape && searching) {
      setSearching(false);
      setSearch("");
    }
  });

  const grouped = useMemo(() => {
    const allEntities = Object.values(entities);
    const filtered = search
      ? allEntities.filter((e) => {
          const name = computeEntityName(e).toLowerCase();
          const q = search.toLowerCase();
          return name.includes(q) || e.entity_id.includes(q);
        })
      : allEntities;

    const byDomain: Record<string, typeof filtered> = {};
    for (const e of filtered) {
      const d = computeDomain(e.entity_id);
      if (!byDomain[d]) byDomain[d] = [];
      byDomain[d].push(e);
    }
    return byDomain;
  }, [entities, search]);

  const domainList = sortDomains(Object.keys(grouped));

  // Encode state color hint into label prefix for visual feedback
  // Format: "[color_initial] name ... state"
  // Since itemComponent can't access value, we bake state indicators into label
  const items = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    for (const domain of domainList) {
      rows.push({
        label: `── ${domainIcon(domain)} ${domain} ──`,
        value: `__header__${domain}`,
      });
      for (const e of grouped[domain]) {
        const name = computeEntityName(e);
        const state = formatState(e);
        const stateIndicator =
          e.state === "on"
            ? "●"
            : e.state === "off"
              ? "○"
              : e.state === "unavailable"
                ? "✗"
                : "·";
        rows.push({
          label: `${stateIndicator} ${name.padEnd(36)} ${state}`,
          value: e.entity_id,
        });
      }
    }
    return rows;
  }, [grouped, domainList]);

  if (selected) {
    return (
      <EntityDetailPanel entityId={selected} onBack={() => setSelected(null)} />
    );
  }

  const totalCount = Object.keys(entities).length;
  const filteredCount = Object.values(grouped).reduce(
    (s, arr) => s + arr.length,
    0
  );

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1}>
        <Text color="gray">
          {filteredCount}/{totalCount} entities
          {search ? ` matching "${search}"` : ""}
          {"  "}Enter: details  ↑↓: navigate  /: search
        </Text>
      </Box>

      {searching && (
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={() => setSearching(false)}
        />
      )}

      <Box flexGrow={1} flexDirection="column" overflowY="hidden">
        <SelectInput
          items={items}
          limit={limit}
          onSelect={(item) => {
            if (!item.value.startsWith("__header__")) {
              setSelected(item.value);
            }
          }}
        />
      </Box>
    </Box>
  );
}
