import React from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.js";
import type { LovelaceCardConfig } from "../data/lovelace.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

const CONDITION_ICONS: Record<string, string> = {
  "clear-night": "🌙",
  cloudy: "☁️",
  exceptional: "⚠️",
  fog: "🌫️",
  hail: "🌨️",
  lightning: "⚡",
  "lightning-rainy": "⛈️",
  partlycloudy: "⛅",
  pouring: "🌧️",
  rainy: "🌦️",
  snowy: "❄️",
  "snowy-rainy": "🌨️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "🌬️",
};

export function WeatherWidget({ card, width, isSelected }: Props) {
  const { entities } = useStore();
  const entityId = card.entity as string | undefined;
  const entity = entityId ? entities[entityId] : undefined;

  const name = String(
    (card.name as string | undefined) ??
      entity?.attributes.friendly_name ??
      "Weather"
  );

  const borderColor = isSelected ? "cyan" : "gray";
  const innerWidth = width - 4;
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  const condIcon = entity ? (CONDITION_ICONS[entity.state] ?? "🌡️") : "🌡️";
  const temp = entity?.attributes.temperature as number | undefined;
  const tempUnit = (entity?.attributes.temperature_unit as string | undefined) ?? "°";
  const humidity = entity?.attributes.humidity as number | undefined;
  const windSpeed = entity?.attributes.wind_speed as number | undefined;
  const windUnit = (entity?.attributes.wind_speed_unit as string | undefined) ?? "";

  // Line 1: condition icon + name + temp (always rendered)
  const line1 = entity
    ? truncate(`${condIcon} ${name}`, innerWidth - 8) + (temp != null ? `  ${temp}${tempUnit}` : "")
    : truncate(`${condIcon} ${name}`, innerWidth);

  // Line 2: humidity + wind (always rendered, empty when unavailable)
  const humStr = humidity != null ? `💧 ${humidity}%` : "";
  const windStr = windSpeed != null ? `💨 ${windSpeed}${windUnit ? ` ${windUnit}` : ""}` : "";
  const line2 = [humStr, windStr].filter(Boolean).join("  ") || (entity ? entity.state : "unavailable");

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Text bold color={isSelected ? "cyan" : "white"}>
        {truncate(line1, innerWidth)}
      </Text>
      <Text color="gray">
        {truncate(line2, innerWidth)}
      </Text>
    </Box>
  );
}
