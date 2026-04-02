import React from "react";
import { Box, Text } from "ink";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import { useStore } from "../store.js";
import { domainIcon, computeDomain, formatState, stateColor } from "../utils/state.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

export function GenericWidget({ card, width, isSelected }: Props) {
  const { entities } = useStore();
  const entityId = card.entity as string | undefined;
  const entity = entityId ? entities[entityId] : undefined;

  const label =
    (typeof card.title === "string" ? card.title : undefined) ??
    (typeof card.name === "string" ? card.name : undefined) ??
    (typeof entity?.attributes.friendly_name === "string" ? entity.attributes.friendly_name : undefined) ??
    entityId?.split(".")[1]?.replace(/_/g, " ") ??
    card.type;

  const domain = entityId ? computeDomain(entityId) : "";
  const icon = domain ? domainIcon(domain) : "•";

  const borderColor = isSelected ? "cyan" : "gray";
  const innerWidth = width - 4;
  const truncate = (s: unknown, max: number): string => {
    const str = s == null ? "" : String(s);
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  };

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Text bold color={isSelected ? "cyan" : "white"}>
        {icon} {truncate(label, innerWidth - 2)}
      </Text>
      {entity && (
        <Text color={stateColor(entity)}>{formatState(entity)}</Text>
      )}
      {!entity && (
        <Text color="gray" dimColor>
          {card.type}
        </Text>
      )}
    </Box>
  );
}
