import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useStore } from "../store.js";
import {
  computeDomain,
  computeEntityName,
  formatState,
  stateColor,
} from "../utils/state.js";

type Mode = "view" | "service" | "area";

interface Props {
  entityId: string;
  onBack: () => void;
}

export function EntityDetailPanel({ entityId, onBack }: Props) {
  const { entities, services, areas, callService, callWS } = useStore();
  const [mode, setMode] = useState<Mode>("view");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceData, setServiceData] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const entity = entities[entityId];

  useInput((_input, key) => {
    if (key.escape) {
      if (mode !== "view") {
        setMode("view");
        setSelectedService(null);
        setServiceData("");
      } else {
        onBack();
      }
    }
  });

  if (!entity) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Entity {entityId} not found.</Text>
        <Text color="gray">Press Escape to go back.</Text>
      </Box>
    );
  }

  const domain = computeDomain(entityId);
  const name = computeEntityName(entity);
  const color = stateColor(entity);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // ── Service call ──────────────────────────────────────────────────────────
  const domainServices = services[domain]
    ? Object.keys(services[domain]).map((svc) => ({
        label: `${domain}.${svc}`,
        value: svc,
      }))
    : [];

  const handleServiceSelect = (item: { value: string }) => {
    if (item.value === "__area__") {
      setMode("area");
      return;
    }
    setSelectedService(item.value);
    setServiceData(JSON.stringify({ entity_id: entityId }));
    setMode("service");
  };

  const handleServiceCall = async () => {
    if (!selectedService) return;
    try {
      let data: Record<string, unknown> = {};
      if (serviceData.trim()) data = JSON.parse(serviceData);
      await callService(domain, selectedService, data);
      showFeedback(`✓ ${domain}.${selectedService} called`);
      setMode("view");
      setSelectedService(null);
    } catch (e) {
      showFeedback(`✗ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ── Area change ───────────────────────────────────────────────────────────
  const areaItems = [
    { label: "(no area)", value: "" },
    ...Object.values(areas).map((a) => ({ label: a.name, value: a.area_id })),
  ];

  const handleAreaSelect = async (item: { value: string }) => {
    try {
      await callWS({
        type: "config/entity_registry/update",
        entity_id: entityId,
        area_id: item.value || null,
      });
      showFeedback(
        `✓ Area set to ${item.value ? (areas[item.value]?.name ?? item.value) : "none"}`
      );
      setMode("view");
    } catch (e) {
      showFeedback(`✗ ${e instanceof Error ? e.message : String(e)}`);
      setMode("view");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const attrs = Object.entries(entity.attributes).filter(
    ([k]) => k !== "friendly_name"
  );

  // Action items = area shortcut + domain services
  const actionItems = [
    { label: "📍 Change area", value: "__area__" },
    ...domainServices,
  ];

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      {/* Header */}
      <Box gap={2} marginBottom={1}>
        <Text bold color="cyan">{name}</Text>
        <Text color="gray">{entityId}</Text>
        <Text color={color} bold>{formatState(entity)}</Text>
      </Box>

      {feedback && (
        <Box marginBottom={1}>
          <Text color={feedback.startsWith("✓") ? "green" : "red"}>{feedback}</Text>
        </Box>
      )}

      {mode === "view" && (
        <>
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="blue">Attributes</Text>
            {attrs.length === 0 && <Text color="gray">  (none)</Text>}
            {attrs.map(([k, v]) => (
              <Text key={k}>
                <Text color="gray">  {k.padEnd(32)}</Text>
                <Text>{String(v)}</Text>
              </Text>
            ))}
          </Box>

          <Box flexDirection="column">
            <Text bold color="blue">Actions (Enter to select, Esc to go back)</Text>
            <SelectInput items={actionItems} onSelect={handleServiceSelect} />
          </Box>
        </>
      )}

      {mode === "service" && selectedService && (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">{domain}.{selectedService}</Text>
          <Text color="gray">Edit JSON then Enter to call. Esc to cancel.</Text>
          <Box borderStyle="round" borderColor="cyan" paddingX={1}>
            <TextInput
              value={serviceData}
              onChange={setServiceData}
              onSubmit={handleServiceCall}
            />
          </Box>
        </Box>
      )}

      {mode === "area" && (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">Select area for {name}</Text>
          <Text color="gray">Esc to cancel.</Text>
          <SelectInput items={areaItems} onSelect={handleAreaSelect} />
        </Box>
      )}
    </Box>
  );
}
