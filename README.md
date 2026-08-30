# Kuching Air Reader

A lightweight, open-source air-quality dashboard for Kuching, Sarawak. It places readings from multiple monitoring networks side by side so residents can quickly compare local conditions without moving between several provider websites.

**Live website:** [kuching-air-reader.wanfatt.workers.dev](https://kuching-air-reader.wanfatt.workers.dev/)

![Kuching Air Reader dashboard in dark mode](docs/assets/kuching-air-reader.png)

## What this project does

Kuching Air Reader combines three perspectives:

| Reading | Source | Method |
| --- | --- | --- |
| Kuching | [AQICN city monitor](https://aqicn.org/city/malaysia/sarawak/kuching/) | Server-side extraction from the public city page |
| Wisma Satok | [AQICN AirNet sensor](https://aqicn.org/station/malaysia-kuching-wisma-satok/) | Token-free live AirNet feed with US EPA AQI conversion |
| PurpleAir 280734 | [PurpleAir map](https://map.purpleair.com/air-quality-standards-us-epa-aqi?select=280734) | Official 10-minute US EPA AQI widget |

The readings are deliberately shown separately rather than averaged. Sensor hardware, placement, correction formulas, and averaging windows differ, so combining them into one number would hide useful context.

## Features

- Live comparison of three Kuching-area readings
- Provider observation times in Malaysia time
- Native light and dark themes
- Responsive desktop and mobile layouts
- Equal-height comparison cards on desktop
- 60-second server cache to reduce provider traffic
- No private API token required
- Local Node.js server and Cloudflare Workers deployment
- Shared, tested US EPA PM2.5-to-AQI conversion

> This dashboard is for general awareness only. It is not medical advice or an official emergency-alert service.

## How it works

The browser requests `/api/kuching` from the local Node.js server or Cloudflare Worker. The backend retrieves the two AQICN readings, normalizes their response shape, and returns JSON to the frontend. PurpleAir's official widget loads directly in the visitor's browser.

```text
Browser
  ├─ /api/kuching ──> Node server or Cloudflare Worker
  │                     ├─ AQICN Kuching page
  │                     └─ AQICN AirNet feed (Wisma Satok)
  └─ PurpleAir widget ─> PurpleAir
```

Wisma Satok's live PM2.5 concentration is converted to US AQI using the EPA breakpoints in `src/aqi.js`. Backend results are cached for 60 seconds.

## Run locally

Requirements: Node.js 18 or newer.

```bash
git clone <your-repository-url>
cd kuching-air-reader
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm start                 # Run the Node.js server
npm run dev               # Restart the server when files change
npm test                  # Run the test suite
npm run cloudflare:dev    # Preview the Cloudflare Worker locally
```

## Deploy to Cloudflare Workers

Authenticate Wrangler, preview the Worker, and deploy:

```bash
npx wrangler login
npm run cloudflare:dev
npm run cloudflare:deploy
```

The Worker serves the files under `public/` and handles `/api/kuching` at the edge. Configuration is in `wrangler.jsonc`; change its `name` if the default Worker name is unavailable in your account.

## API response

`GET /api/kuching` returns a structure similar to:

```json
{
  "location": "Kuching, Sarawak, Malaysia",
  "sources": {
    "kuching": { "aqi": 284, "observedLabel": "Updated on Sunday 8:00" },
    "wismaSatok": { "aqi": 265, "pm25": 215.2, "observedAt": "2026-08-30T00:00:03.000Z" }
  },
  "fetchedAt": "2026-08-30T00:01:00.000Z",
  "cached": false
}
```

Add `?refresh=1` during diagnostics to bypass the backend cache. Avoid using forced refreshes in normal traffic.

## Project structure

```text
docs/assets/      README images
public/           HTML, CSS, and browser JavaScript
src/aqi.js        Shared parsing and AQI calculation
test/             Parser and AQI tests
server.js         Local Node.js server
worker.js         Cloudflare Worker entry point
wrangler.jsonc    Cloudflare deployment configuration
```

## Data sources and limitations

Provider markup and public feeds can change without notice, which may temporarily break extraction. Values can also update at different times. Check the linked provider pages when a reading looks unusual.

Before running a public or commercial deployment, review the [World Air Quality Index Project usage notice](https://aqicn.org/contact/) and [PurpleAir terms](https://www2.purpleair.com/policies/terms-of-service). Cache responses and avoid excessive requests to upstream services.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

Released under the [MIT License](LICENSE).
