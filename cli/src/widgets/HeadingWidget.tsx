import React from "react";
import { Box, Text } from "ink";
import type { LovelaceCardConfig } from "../data/lovelace.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

export function HeadingWidget({ card, width, isSelected }: Props) {
  const label = String((card.heading ?? card.title) ?? "");
  const icon = String(card.icon ?? "");
  const display = icon ? `${icon}  ${label}` : label;
  const innerWidth = width - 4;
  const separator = "─".repeat(Math.max(0, innerWidth));

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={isSelected ? "cyan" : "blue"}
      paddingX={1}
    >
      <Text bold color={isSelected ? "cyan" : "blue"}>
        {display.length > innerWidth ? display.slice(0, innerWidth - 1) + "…" : display}
      </Text>
      <Text color="gray" dimColor>
        {separator}
      </Text>
    </Box>
  );
}
