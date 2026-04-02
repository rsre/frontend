import {
  createConnection,
  createLongLivedTokenAuth,
  type Connection,
} from "home-assistant-js-websocket";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Polyfill WebSocket for Node.js
import WebSocket from "ws";
(globalThis as any).WebSocket = WebSocket;

export interface HaConfig {
  url: string;
  token: string;
}

const CONFIG_PATH = join(homedir(), ".config", "ha-cli", "config.json");
const ENV_URL = process.env.HA_URL;
const ENV_TOKEN = process.env.HA_TOKEN;

export function loadConfig(): HaConfig {
  if (ENV_URL && ENV_TOKEN) {
    return { url: ENV_URL.replace(/\/$/, ""), token: ENV_TOKEN };
  }
  if (existsSync(CONFIG_PATH)) {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const cfg = JSON.parse(raw) as HaConfig;
    cfg.url = cfg.url.replace(/\/$/, "");
    return cfg;
  }
  throw new Error(
    `No configuration found.\n\nCreate ${CONFIG_PATH}:\n` +
      `{\n  "url": "http://homeassistant.local:8123",\n  "token": "<long-lived-access-token>"\n}\n\n` +
      `Or set HA_URL and HA_TOKEN environment variables.`
  );
}

export async function connect(config: HaConfig): Promise<Connection> {
  const auth = createLongLivedTokenAuth(config.url, config.token);
  const conn = await createConnection({ auth });
  return conn;
}
