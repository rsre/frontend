# ha-cli

Terminal UI for Home Assistant, built with [Ink](https://github.com/vadimdemedes/ink).

## Setup

### 1. Install dependencies

```bash
cd cli
npm install
```

### 2. Configure

Run `npm run setup http://homeassistant:8123` to create `~/.config/ha-cli/config.json`:

```json
{
  "url": "http://homeassistant:8123",
  "token": "<long-lived-access-token>"
}
```

You can also use environment variables instead of the config file:

```bash
export HA_URL=http://homeassistant.local:8123
export HA_TOKEN=your_token_here
```

### 3. Run

```bash
# Development (ts-x, no build needed)
npm run dev

# Production (compile first)
npm run build
npm start
```

## Navigation

| Key | Action |
|-----|--------|
| `Tab` | Switch panels |
| `↑` / `↓` | Navigate list |
| `Enter` | Select item / confirm |
| `Escape` | Go back / cancel |
| `/` | Search / filter |
| `r` | Refresh (logbook panel) |
| `q` | Quit |

## Panels

- **entities** — Browse all entities grouped by domain. Select one to see attributes and call services.
- **automations** — List automations with last-triggered time. Press Enter to toggle enabled/disabled.
- **devices** — Browse devices with manufacturer info. Select one to see its entities.
- **logbook** — Last 24 hours of state changes. Scroll with ↑↓ or PgUp/PgDn.
