# Kuching Air Reader

An open-source, responsive dashboard that compares three air-quality perspectives around Kuching, Sarawak:

- Kuching city monitor from AQICN
- Wisma Satok AirNet sensor from AQICN
- PurpleAir sensor 280734 using its official 10-minute US EPA AQI widget

The site has light and dark themes, requires no private provider token, and can run as a local Node.js server or a Cloudflare Worker.

> Air-quality readings can differ because providers use different sensors, locations, averaging windows, and calculation methods. This project is for general awareness, not medical guidance.

## Local development

Requirements: Node.js 18 or newer.

```bash
npm install
npm start
```

Open <http://localhost:3000>. Run tests with `npm test`.

## Cloudflare Workers

The Worker serves files from `public/` and handles `/api/kuching` at the edge. Preview and deploy with:

```bash
npm run cloudflare:dev
npm run cloudflare:deploy
```

Cloudflare configuration lives in `wrangler.jsonc`. Change its `name` before deploying if the default Worker name is taken.

## Data and responsible use

The backend reads public AQICN data and caches results for 60 seconds. Wisma Satok uses AQICN's token-free AirNet feed because it is fresher than the station page's embedded HTML snapshot; its PM2.5 concentration is converted using US EPA AQI breakpoints. PurpleAir is rendered using the public widget configuration supplied for sensor 280734.

Scraping depends on third-party markup and can break when a provider changes its site. Review the [AQICN](https://aqicn.org/contact/) and [PurpleAir](https://www2.purpleair.com/policies/terms-of-service) terms before operating a public deployment, and avoid excessive requests.

## Project structure

```text
public/          Browser UI
src/aqi.js       Shared parsing and AQI calculation
test/            Tests
server.js        Local Node.js server
worker.js        Cloudflare Worker entry point
wrangler.jsonc   Cloudflare configuration
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Licensed under the [MIT License](LICENSE).
