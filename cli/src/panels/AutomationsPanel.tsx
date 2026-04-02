import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useStore } from "../store.js";
import { SearchBar } from "../components/SearchBar.js";
import { useListLimit } from "../hooks/useTerminalHeight.js";

interface AutomationEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    last_triggered?: string;
    id?: string;
    mode?: string;
    current?: number;
    max?: number;
  };
}

export function AutomationsPanel() {
  const { entities, callService } = useStore();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const limit = useListLimit(searching ? 8 : 6);

  useInput((input, key) => {
    if (input === "/" && !searching) {
      setSearching(true);
      return;
    }
    if (key.escape && searching) {
      setSearching(false);
      setSearch("");
    }
  });

  const automations = useMemo(() => {
    return Object.values(entities).filter((e) =>
      e.entity_id.startsWith("automation.")
    ) as AutomationEntity[];
  }, [entities]);

  const filtered = useMemo(() => {
    if (!search) return automations;
    const q = search.toLowerCase();
    return automations.filter((a) =>
      (a.attributes.friendly_name ?? a.entity_id).toLowerCase().includes(q)
    );
  }, [automations, search]);

  const items = filtered.map((a) => {
    const name = a.attributes.friendly_name ?? a.entity_id.split(".")[1];
    const enabled = a.state === "on";
    const enabledMark = enabled ? "✓" : "✗";
    const lastTriggered = a.attributes.last_triggered
      ? new Date(a.attributes.last_triggered).toLocaleString()
      : "never";
    const mode = (a.attributes.mode ?? "").padEnd(10);
    const label = `${enabledMark} ${name.padEnd(40)} ${mode} ${lastTriggered}`;
    return { label, value: a.entity_id };
  });

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSelect = async (item: { value: string }) => {
    const automation = entities[item.value] as AutomationEntity | undefined;
    if (!automation) return;
    const isOn = automation.state === "on";
    try {
      await callService("automation", isOn ? "turn_off" : "turn_on", {
        entity_id: item.value,
      });
      showFeedback(
        `✓ ${automation.attributes.friendly_name ?? item.value} ${isOn ? "disabled" : "enabled"}`
      );
    } catch (e) {
      showFeedback(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1}>
        <Text color="gray">
          {filtered.length}/{automations.length} automations{"  "}
          Enter: toggle  /: search
        </Text>
      </Box>

      {feedback && (
        <Box paddingX={1}>
          <Text color={feedback.startsWith("✓") ? "green" : "red"}>
            {feedback}
          </Text>
        </Box>
      )}

      {searching && (
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={() => setSearching(false)}
          placeholder="Filter automations…"
        />
      )}

      {items.length === 0 ? (
        <Box padding={1}>
          <Text color="gray">No automations found.</Text>
        </Box>
      ) : (
        <Box flexGrow={1} flexDirection="column">
          <Box paddingX={1}>
            <Text color="blue" bold>
              {"  En "}
              {"Name".padEnd(42)}
              {"Mode".padEnd(12)}
              {"Last triggered"}
            </Text>
          </Box>
          <SelectInput items={items} limit={limit} onSelect={handleSelect} />
        </Box>
      )}
    </Box>
  );
}
