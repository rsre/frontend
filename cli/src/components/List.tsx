import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface ListItem {
  label: string;
  value: string;
}

interface Props {
  items: ListItem[];
  limit: number;
  onSelect: (item: ListItem) => void;
  initialIndex?: number;
}

export function List({ items, limit, onSelect, initialIndex = 0 }: Props) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, items.length - 1)));

  const clampedIndex = Math.min(index, Math.max(0, items.length - 1));
  const offset = Math.max(0, clampedIndex - limit + 1);
  const visible = items.slice(offset, offset + limit);

  useInput((input, key) => {
    if (items.length === 0) return;
    if (key.upArrow) {
      setIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (key.return) {
      onSelect(items[clampedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      {visible.map((item, vi) => {
        const isSelected = vi + offset === clampedIndex;
        return (
          <Text key={item.value} color={isSelected ? "cyan" : "white"} bold={isSelected}>
            {isSelected ? "❯ " : "  "}
            {item.label}
          </Text>
        );
      })}
    </Box>
  );
}
