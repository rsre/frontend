import React from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.js";

interface Props {
  panel: string;
  panels: string[];
}

export function StatusBar({ panel, panels }: Props) {
  const { connected, entities, config } = useStore();

  const entityCount = Object.keys(entities).length;
  const haVersion = config?.version ?? "…";

  return (
    <Box
      borderStyle="single"
      borderColor={connected ? "green" : "red"}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={2}>
        <Text color={connected ? "green" : "red"}>
          {connected ? "● connected" : "○ disconnected"}
        </Text>
        <Text color="gray">HA {haVersion}</Text>
        <Text color="gray">{entityCount} entities</Text>
      </Box>
      <Box gap={1}>
        {panels.map((p) => (
          <Text key={p} color={p === panel ? "cyan" : "gray"} bold={p === panel}>
            {p === panel ? `[${p}]` : p}
          </Text>
        ))}
      </Box>
      <Box gap={2}>
        <Text color="gray">Tab: switch panel</Text>
        <Text color="gray">/ search</Text>
        <Text color="gray">q quit</Text>
      </Box>
    </Box>
  );
}
