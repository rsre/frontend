import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useStore } from "../store.js";
import { SearchBar } from "../components/SearchBar.js";
import { useListLimit } from "../hooks/useTerminalHeight.js";
import { formatState, stateColor } from "../utils/state.js";

export function DevicesPanel() {
  const { devices, areas, entities, entityRegistry } = useStore();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const limit = useListLimit(searching ? 8 : 6);

  useInput((input, key) => {
    if (selectedDevice) {
      if (key.escape) setSelectedDevice(null);
      return;
    }
    if (input === "/" && !searching) {
      setSearching(true);
      return;
    }
    if (key.escape && searching) {
      setSearching(false);
      setSearch("");
    }
  });

  const deviceList = useMemo(() => Object.values(devices), [devices]);

  const filtered = useMemo(() => {
    if (!search) return deviceList;
    const q = search.toLowerCase();
    return deviceList.filter(
      (d) =>
        (d.name ?? "").toLowerCase().includes(q) ||
        (d.manufacturer ?? "").toLowerCase().includes(q) ||
        (d.model ?? "").toLowerCase().includes(q)
    );
  }, [deviceList, search]);

  const items = filtered.map((d) => {
    const area = d.area_id ? areas[d.area_id]?.name ?? d.area_id : "";
    const name = d.name_by_user ?? d.name ?? d.id;
    const mfr = [d.manufacturer, d.model].filter(Boolean).join(" · ");
    const label = `${name.padEnd(36)} ${area.padEnd(20)} ${mfr}`;
    return { label, value: d.id };
  });

  // Entities belonging to selectedDevice
  const deviceEntities = useMemo(() => {
    if (!selectedDevice) return [];
    return Object.values(entityRegistry)
      .filter((e) => e.device_id === selectedDevice)
      .map((e) => entities[e.entity_id])
      .filter(Boolean);
  }, [selectedDevice, entityRegistry, entities]);

  const selectedDeviceData = selectedDevice ? devices[selectedDevice] : null;

  if (selectedDevice && selectedDeviceData) {
    const area = selectedDeviceData.area_id
      ? areas[selectedDeviceData.area_id]?.name
      : null;
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Box gap={2}>
          <Text bold color="cyan">
            {selectedDeviceData.name_by_user ?? selectedDeviceData.name}
          </Text>
          {area && <Text color="gray">📍 {area}</Text>}
        </Box>
        <Box flexDirection="column">
          {selectedDeviceData.manufacturer && (
            <Text color="gray">Manufacturer: {selectedDeviceData.manufacturer}</Text>
          )}
          {selectedDeviceData.model && (
            <Text color="gray">Model: {selectedDeviceData.model}</Text>
          )}
          {selectedDeviceData.sw_version && (
            <Text color="gray">Firmware: {selectedDeviceData.sw_version}</Text>
          )}
        </Box>
        <Text bold color="blue">
          Entities ({deviceEntities.length})
        </Text>
        {deviceEntities.map((e) => {
          if (!e) return null;
          const color = stateColor(e);
          return (
            <Text key={e.entity_id} color={color}>
              {"  "}
              {e.entity_id.padEnd(48)}
              {formatState(e)}
            </Text>
          );
        })}
        <Text color="gray">Esc: back to devices</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1}>
        <Text color="gray">
          {filtered.length}/{deviceList.length} devices
          {"  "}
          <Text color="gray">Enter: show entities  / search</Text>
        </Text>
      </Box>

      {searching && (
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={() => setSearching(false)}
          placeholder="Filter devices…"
        />
      )}

      {items.length === 0 ? (
        <Box padding={1}>
          <Text color="gray">No devices found.</Text>
        </Box>
      ) : (
        <Box flexGrow={1} flexDirection="column">
          <Box paddingX={1}>
            <Text color="blue" bold>
              {"  "}
              {"Name".padEnd(38)}
              {"Area".padEnd(22)}
              {"Manufacturer · Model"}
            </Text>
          </Box>
          <SelectInput
            items={items}
            limit={limit}
            onSelect={(item) => setSelectedDevice(item.value)}
          />
        </Box>
      )}
    </Box>
  );
}
