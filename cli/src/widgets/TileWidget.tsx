import React from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.js";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import {
  computeDomain,
  domainIcon,
  formatState,
  stateColor,
} from "../utils/state.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

export function TileWidget({ card, width, isSelected }: Props) {
  const { entities } = useStore();
  const entityId = card.entity as string | undefined;
  const entity = entityId ? entities[entityId] : undefined;

  const domain = entityId ? computeDomain(entityId) : "";
  const icon = domainIcon(domain);

  const name =
    (typeof card.name === "string" ? card.name : undefined) ??
    (typeof entity?.attributes.friendly_name === "string" ? entity.attributes.friendly_name : undefined) ??
    entityId?.split(".")[1]?.replace(/_/g, " ") ??
    "—";

  const stateStr = entity ? formatState(entity) : "unavailable";
  const color = entity ? stateColor(entity) : "gray";

  // Extra attributes to show
  const brightness =
    entity?.attributes.brightness != null
      ? `${Math.round((entity.attributes.brightness as number / 255) * 100)}%`
      : null;

  const temperature =
    entity?.attributes.current_temperature != null
      ? `${entity.attributes.current_temperature}°`
      : null;

  const extra = brightness ?? temperature ?? "";

  const innerWidth = width - 4; // subtract border (2) + padding (2)
  const truncate = (s: unknown, max: number): string => {
    const str = s == null ? "" : String(s);
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  };

  const borderColor = isSelected ? "cyan" : "gray";

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Text bold color={isSelected ? "cyan" : "white"}>
        {icon} {truncate(name, innerWidth - 2)}
      </Text>
      <Box gap={1} marginTop={0}>
        <Text color={color} bold>
          {stateStr}
        </Text>
        {extra !== "" && <Text color="gray">{extra}</Text>}
      </Box>
    </Box>
  );
}
