#!/usr/bin/env node
/**
 * Interactive setup: runs the HA OAuth flow, exchanges for a long-lived
 * access token, and writes ~/.config/ha-cli/config.json.
 *
 * Usage: npx tsx scripts/setup.ts [ha-url]
 * Example: npx tsx scripts/setup.ts http://homeassistant.local:8123
 */

import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import {
  createConnection,
  createLongLivedTokenAuth,
} from "home-assistant-js-websocket";
import WebSocket from "ws";

(globalThis as any).WebSocket = WebSocket;

// ── helpers ────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function openBrowser(url: string): void {
  // Use execFile with the URL as a separate argument — no shell interpretation
  if (process.platform === "darwin") {
    execFile("open", [url]);
  } else if (process.platform === "win32") {
    // On Windows, `start` is a shell built-in; use cmd.exe /c start
    execFile("cmd.exe", ["/c", "start", "", url]);
  } else {
    execFile("xdg-open", [url]);
  }
}

// ── OAuth helpers ──────────────────────────────────────────────────────────

/** Start a local HTTP server and wait for the ?code= redirect. */
function waitForCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      const code = url.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html" });
      if (code) {
        res.end(
          `<html><body style="font-family:sans-serif;padding:2rem">
            <h2>&#10003; Authorization successful</h2>
            <p>You can close this tab and return to the terminal.</p>
          </body></html>`
        );
        server.close();
        resolve(code);
      } else {
        res.end(
          `<html><body style="font-family:sans-serif;padding:2rem">
            <h2>&#10007; No code received</h2>
            <p>Try running the setup script again.</p>
          </body></html>`
        );
        server.close();
        reject(new Error("No authorization code in redirect"));
      }
    });

    server.listen(port, "127.0.0.1");
    server.on("error", reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for browser authorization (5 min)"));
    }, 5 * 60 * 1000);
  });
}

async function exchangeCodeForToken(
  haUrl: string,
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${haUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const haUrl = (process.argv[2] ?? "http://homeassistant.local:8123").replace(
    /\/$/,
    ""
  );

  console.log(`\nHome Assistant CLI — setup\n`);
  console.log(`Target: ${haUrl}\n`);

  const port = 18123;
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const clientId = `http://127.0.0.1:${port}/`;

  // PKCE: code_verifier + code_challenge
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(
    createHash("sha256").update(codeVerifier).digest()
  );

  const authUrl =
    `${haUrl}/auth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  console.log("Opening your browser for Home Assistant login…");
  console.log(`If it doesn't open, visit:\n  ${authUrl}\n`);

  const codePromise = waitForCode(port);
  openBrowser(authUrl);

  let code: string;
  try {
    code = await codePromise;
  } catch (e) {
    console.error(`✗ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  console.log("✓ Authorization code received. Exchanging for access token…");

  let accessToken: string;
  try {
    accessToken = await exchangeCodeForToken(
      haUrl,
      code,
      clientId,
      redirectUri,
      codeVerifier
    );
  } catch (e) {
    console.error(`✗ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  console.log("✓ Access token obtained. Connecting via WebSocket…");

  const auth = createLongLivedTokenAuth(haUrl, accessToken);
  let conn: Awaited<ReturnType<typeof createConnection>>;
  try {
    conn = await createConnection({ auth });
  } catch (e) {
    console.error(
      `✗ WebSocket connection failed: ${e instanceof Error ? e.message : e}`
    );
    process.exit(1);
  }

  console.log("✓ Connected. Creating long-lived access token…");

  let longLivedToken: string;
  try {
    longLivedToken = await conn.sendMessagePromise<string>({
      type: "auth/long_lived_access_token",
      client_name: "ha-cli",
      lifespan: 3650, // 10 years in days
    });
  } catch (e) {
    console.error(
      `✗ Failed to create long-lived token: ${e instanceof Error ? e.message : e}`
    );
    conn.close();
    process.exit(1);
  }

  conn.close();

  const configDir = join(homedir(), ".config", "ha-cli");
  const configPath = join(configDir, "config.json");

  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    configPath,
    JSON.stringify({ url: haUrl, token: longLivedToken }, null, 2) + "\n"
  );

  console.log(`\n✓ Config saved to ${configPath}`);
  console.log(`\nRun the CLI with:\n  npm run dev\n`);
  process.exit(0);
}

main();
