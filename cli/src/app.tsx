import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { Connection } from "home-assistant-js-websocket";
import { StoreProvider } from "./store.js";
import { StatusBar } from "./components/StatusBar.js";
import { EntitiesPanel } from "./panels/EntitiesPanel.js";
import { AutomationsPanel } from "./panels/AutomationsPanel.js";
import { DevicesPanel } from "./panels/DevicesPanel.js";
import { LogbookPanel } from "./panels/LogbookPanel.js";

type Panel = "entities" | "automations" | "devices" | "logbook";
const PANELS: Panel[] = ["entities", "automations", "devices", "logbook"];

interface Props {
  connection: Connection;
}

function AppContent() {
  const { exit } = useApp();
  const [panel, setPanel] = useState<Panel>("entities");

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }
    if (key.tab) {
      const idx = PANELS.indexOf(panel);
      setPanel(PANELS[(idx + 1) % PANELS.length]);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar panel={panel} panels={PANELS} />
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {panel === "entities" && <EntitiesPanel />}
        {panel === "automations" && <AutomationsPanel />}
        {panel === "devices" && <DevicesPanel />}
        {panel === "logbook" && <LogbookPanel />}
      </Box>
    </Box>
  );
}

export function App({ connection }: Props) {
  return (
    <StoreProvider connection={connection}>
      <AppContent />
    </StoreProvider>
  );
}
