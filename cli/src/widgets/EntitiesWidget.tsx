import React from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.js";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import { computeDomain, domainIcon, formatState, stateColor } from "../utils/state.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

type EntityRow =
  | string
  | { entity: string; name?: string; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

export function EntitiesWidget({ card, width, isSelected }: Props) {
  const { entities } = useStore();

  const rows = (card.entities as EntityRow[] | undefined) ?? [];
  const entityRows = rows.filter(
    (r): r is string | { entity: string; name?: string } =>
      typeof r === "string" || "entity" in r
  );

  const innerWidth = width - 4;
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  const borderColor = isSelected ? "cyan" : "gray";
  const title = String(card.title ?? "");

  // Compute summary: count by state
  const stateCounts: Record<string, number> = {};
  for (const row of entityRows) {
    const eid = typeof row === "string" ? row : row.entity;
    const e = entities[eid];
    if (e) {
      stateCounts[e.state] = (stateCounts[e.state] ?? 0) + 1;
    }
  }
  const total = entityRows.length;
  const onCount = stateCounts["on"] ?? 0;
  const offCount = stateCounts["off"] ?? 0;
  const summaryParts: string[] = [];
  if (onCount > 0) summaryParts.push(`${onCount} on`);
  if (offCount > 0) summaryParts.push(`${offCount} off`);
  const otherCount = total - onCount - offCount;
  if (otherCount > 0) summaryParts.push(`${otherCount} other`);
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : `${total} entities`;

  // Line 1: title or first entity name + state
  let line1 = title || "Entities";
  let line1Color: string = isSelected ? "cyan" : "white";
  if (!title && entityRows.length > 0) {
    const firstId = typeof entityRows[0] === "string" ? entityRows[0] : entityRows[0].entity;
    const firstEntity = entities[firstId];
    if (firstEntity) {
      const domain = computeDomain(firstId);
      const icon = domainIcon(domain);
      const name =
        (typeof entityRows[0] === "object" && "name" in entityRows[0]
          ? (entityRows[0].name as string | undefined)
          : undefined) ??
        String(firstEntity.attributes.friendly_name ?? firstId.split(".")[1].replace(/_/g, " "));
      const state = formatState(firstEntity);
      line1Color = stateColor(firstEntity);
      line1 = `${icon} ${name}  ${state}`;
    }
  }

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Text bold color={line1Color}>
        {truncate(line1, innerWidth)}
      </Text>
      <Text color="gray">
        {truncate(summary, innerWidth)}
      </Text>
    </Box>
  );
}
