import React from "react";
import { Box, Text } from "ink";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import { useStore } from "../store.js";
import { extractEntityIds } from "../utils/graphCards.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

export function HistoryGraphWidget({ card, width, isSelected }: Props) {
  const { entities } = useStore();
  const rawEntities = Array.isArray(card.entities) ? card.entities : [];
  const ids = extractEntityIds(
    rawEntities as (string | { entity: string; name?: string })[]
  );

  const title =
    (typeof card.title === "string" ? card.title : undefined) ??
    (ids[0]
      ? (entities[ids[0]]?.attributes.friendly_name as string | undefined) ??
        ids[0].split(".")[1]?.replace(/_/g, " ")
      : "History");

  const hours = typeof card.hours_to_show === "number" ? card.hours_to_show : 24;

  const subtitle =
    ids.length === 1
      ? `${ids[0].split(".")[1] ?? ids[0]}  last ${hours}h`
      : `${ids.length} entities  last ${hours}h`;

  const innerWidth = width - 4;
  const borderColor = isSelected ? "cyan" : "gray";
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Text bold color={isSelected ? "cyan" : "white"}>
        {"📈 "}
        {truncate(title, innerWidth - 3)}
      </Text>
      <Text color="gray" dimColor>
        {truncate(subtitle, innerWidth)}
      </Text>
    </Box>
  );
}
