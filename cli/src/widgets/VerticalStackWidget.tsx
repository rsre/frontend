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

function ChildLine({
  card,
  width,
}: {
  card: LovelaceCardConfig;
  width: number;
}) {
  const { entities } = useStore();
  const entityId = typeof card.entity === "string" ? card.entity : undefined;
  const entity = entityId ? entities[entityId] : undefined;

  const name = String(
    (typeof card.name === "string" ? card.name : undefined) ??
      (typeof card.title === "string" ? card.title : undefined) ??
      entity?.attributes.friendly_name ??
      entityId?.split(".")[1]?.replace(/_/g, " ") ??
      card.type
  );
  const state = entity ? formatState(entity) : "";
  const domain = entityId ? computeDomain(entityId) : "";
  const icon = domain ? domainIcon(domain) : "•";
  const color = entity ? stateColor(entity) : "gray";
  const nameMax = width - state.length - 3;
  const truncName = name.length > nameMax ? name.slice(0, nameMax - 1) + "…" : name;

  return (
    <Box justifyContent="space-between">
      <Text>
        {icon} {truncName}
      </Text>
      <Text color={color}>{state}</Text>
    </Box>
  );
}

export function VerticalStackWidget({ card, width, isSelected }: Props) {
  const children = card.cards ?? [];
  const innerWidth = width - 4;
  const borderColor = isSelected ? "cyan" : "gray";

  // Always exactly 2 content lines to maintain WIDGET_ROW_H = 4
  const hasMore = children.length > 2;
  const line1 = children[0] ?? null;
  const line2 = !hasMore ? (children[1] ?? null) : null;
  const hiddenCount = hasMore ? children.length - 1 : 0;

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      {line1 ? (
        <ChildLine card={line1} width={innerWidth} />
      ) : (
        <Text color="gray" dimColor>
          {"—"}
        </Text>
      )}
      {hasMore ? (
        <Text color="gray" dimColor>
          +{hiddenCount} more
        </Text>
      ) : line2 ? (
        <ChildLine card={line2} width={innerWidth} />
      ) : (
        <Text color="gray" dimColor>
          {"—"}
        </Text>
      )}
    </Box>
  );
}
