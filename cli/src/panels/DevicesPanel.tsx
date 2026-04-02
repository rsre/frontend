import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { List } from "../components/List.js";
import { useStore } from "../store.js";
import { SearchBar } from "../components/SearchBar.js";
import { useListLimit } from "../hooks/useTerminalHeight.js";
import { formatState, stateColor } from "../utils/state.js";

export function DevicesPanel() {
  const { devices, areas, entities, entityRegistry } = useStore();
  const [areaFilter, setAreaFilter] = useState<string | null>(null); // null = All
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const limit = useListLimit(searching ? 9 : 7);

  const areaList = useMemo(
    () => Object.values(areas).sort((a, b) => a.name.localeCompare(b.name)),
    [areas]
  );

  useInput((input, key) => {
    if (selectedDevice) {
      if (key.escape) setSelectedDevice(null);
      return;
    }
    if (input === "/" && !searching) { setSearching(true); return; }
    if (key.escape && searching) { setSearching(false); setSearch(""); return; }

    // ←/→ cycle area filter
    if (!searching && (key.leftArrow || key.rightArrow)) {
      const tabs = [null, ...areaList.map((a) => a.area_id)];
      const cur = tabs.indexOf(areaFilter);
      const next = key.rightArrow
        ? Math.min(tabs.length - 1, cur + 1)
        : Math.max(0, cur - 1);
      setAreaFilter(tabs[next] ?? null);
    }
  });

  const deviceList = useMemo(() => Object.values(devices), [devices]);

  const filtered = useMemo(() => {
    let list = deviceList;
    if (areaFilter !== null) list = list.filter((d) => d.area_id === areaFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.name ?? "").toLowerCase().includes(q) ||
          (d.manufacturer ?? "").toLowerCase().includes(q) ||
          (d.model ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [deviceList, areaFilter, search]);

  const items = filtered.map((d) => {
    const area = d.area_id ? areas[d.area_id]?.name ?? "" : "";
    const name = d.name_by_user ?? d.name ?? d.id;
    const mfr = [d.manufacturer, d.model].filter(Boolean).join(" · ");
    // Only show area column when in "All" view
    const label =
      areaFilter === null
        ? `${name.padEnd(34)} ${area.padEnd(18)} ${mfr}`
        : `${name.padEnd(36)} ${mfr}`;
    return { label, value: d.id };
  });

  // Device detail view
  const deviceEntities = useMemo(() => {
    if (!selectedDevice) return [];
    return Object.values(entityRegistry)
      .filter((e) => e.device_id === selectedDevice)
      .map((e) => entities[e.entity_id])
      .filter(Boolean);
  }, [selectedDevice, entityRegistry, entities]);

  const selectedDeviceData = selectedDevice ? devices[selectedDevice] : null;

  if (selectedDevice && selectedDeviceData) {
    const area = selectedDeviceData.area_id ? areas[selectedDeviceData.area_id]?.name : null;
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Box gap={2}>
          <Text bold color="cyan">{selectedDeviceData.name_by_user ?? selectedDeviceData.name}</Text>
          {area && <Text color="gray">📍 {area}</Text>}
        </Box>
        <Box flexDirection="column">
          {selectedDeviceData.manufacturer && <Text color="gray">Manufacturer: {selectedDeviceData.manufacturer}</Text>}
          {selectedDeviceData.model && <Text color="gray">Model: {selectedDeviceData.model}</Text>}
          {selectedDeviceData.sw_version && <Text color="gray">Firmware: {selectedDeviceData.sw_version}</Text>}
        </Box>
        <Text bold color="blue">Entities ({deviceEntities.length})</Text>
        {deviceEntities.map((e) => {
          if (!e) return null;
          return (
            <Text key={e.entity_id} color={stateColor(e)}>
              {"  "}{e.entity_id.padEnd(48)}{formatState(e)}
            </Text>
          );
        })}
        <Text color="gray">Esc: back</Text>
      </Box>
    );
  }

  const tabs = [{ id: null, name: "All" }, ...areaList.map((a) => ({ id: a.area_id, name: a.name }))];

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Area tabs */}
      <Box paddingX={1} gap={1}>
        {tabs.map((t) => (
          <Text
            key={t.id ?? "__all__"}
            color={areaFilter === t.id ? "cyan" : "gray"}
            bold={areaFilter === t.id}
          >
            {areaFilter === t.id ? `[${t.name}]` : t.name}
          </Text>
        ))}
        <Text color="gray">  ←/→ area  / search</Text>
      </Box>

      {/* Device count */}
      <Box paddingX={1}>
        <Text color="gray">
          {filtered.length}/{deviceList.length} devices
          {search ? ` matching "${search}"` : ""}
        </Text>
      </Box>

      {searching && (
        <SearchBar value={search} onChange={setSearch} onSubmit={() => setSearching(false)} placeholder="Filter devices…" />
      )}

      {items.length === 0 ? (
        <Box padding={1}><Text color="gray">No devices found.</Text></Box>
      ) : (
        <Box flexGrow={1} flexDirection="column">
          <Box paddingX={1}>
            <Text color="blue" bold>
              {"  "}
              {areaFilter === null
                ? `${"Name".padEnd(36)}${"Area".padEnd(20)}Manufacturer · Model`
                : `${"Name".padEnd(38)}Manufacturer · Model`}
            </Text>
          </Box>
          <List
            items={items}
            limit={limit}
            onSelect={(item) => setSelectedDevice(item.value)}
          />
        </Box>
      )}
    </Box>
  );
}
