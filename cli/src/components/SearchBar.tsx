import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Filter…",
}: Props) {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text color="cyan">/ </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
      />
    </Box>
  );
}
