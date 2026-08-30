import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aqiBand, parseAirnetFeed, parseWaqiAqi, parseWaqiUpdatedLabel } from './src/aqi.js';

const PORT = Number(process.env.PORT) || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_TTL_MS = 60 * 1000;
const KUCHING_URL = 'https://aqicn.org/city/malaysia/sarawak/kuching/';
const WISMA_SATOK_URL = 'https://aqicn.org/station/malaysia-kuching-wisma-satok/';
const WISMA_SATOK_FEED_URL = 'https://airnet.waqi.info/airnet/feed/hourly/2508724';
let cache = null;

async function getHtml(url, provider) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-MY,en;q=0.9',
      'User-Agent': 'KuchingAirReader/1.0 (+local educational AQI dashboard)'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}`);
  return response.text();
}

async function getKuchingReading(forceRefresh = false) {
  if (!forceRefresh && cache && Date.now() - cache.createdAt < CACHE_TTL_MS) return { ...cache.value, cached: true };
  const [kuchingResult, wismaResult] = await Promise.allSettled([
    getHtml(KUCHING_URL, 'AQICN'),
    getHtml(WISMA_SATOK_FEED_URL, 'AQICN Wisma Satok')
  ]);
  let kuching;
  if (kuchingResult.status === 'fulfilled') {
    try {
      const aqi = parseWaqiAqi(kuchingResult.value);
      const observedLabel = parseWaqiUpdatedLabel(kuchingResult.value);
      kuching = { provider: 'WAQI / AQICN', station: 'Kuching, Sarawak', aqi, ...aqiBand(aqi), observedLabel, sourceUrl: KUCHING_URL };
    } catch (error) {
      kuching = { provider: 'WAQI / AQICN', station: 'Kuching, Sarawak', error: error.message, sourceUrl: KUCHING_URL };
    }
  } else {
    kuching = { provider: 'WAQI / AQICN', station: 'Kuching, Sarawak', error: kuchingResult.reason.message, sourceUrl: KUCHING_URL };
  }
  let wismaSatok;
  if (wismaResult.status === 'fulfilled') {
    try {
      const parsed = parseAirnetFeed(wismaResult.value);
      wismaSatok = { provider: 'WAQI / AQICN', station: 'Wisma Satok', ...parsed, ...aqiBand(parsed.aqi), sourceUrl: WISMA_SATOK_URL };
    } catch (error) {
      wismaSatok = { provider: 'WAQI / AQICN', station: 'Wisma Satok', error: error.message, sourceUrl: WISMA_SATOK_URL };
    }
  } else {
    wismaSatok = { provider: 'WAQI / AQICN', station: 'Wisma Satok', error: wismaResult.reason.message, sourceUrl: WISMA_SATOK_URL };
  }
  const value = { location: 'Kuching, Sarawak, Malaysia', sources: { kuching, wismaSatok }, fetchedAt: new Date().toISOString(), cached: false };
  cache = { createdAt: Date.now(), value };
  return value;
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function serveStatic(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) return false;
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache, must-revalidate' });
    res.end(data);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/kuching') return sendJson(res, 200, await getKuchingReading(url.searchParams.get('refresh') === '1'));
    if (req.method === 'GET' && await serveStatic(req, res)) return;
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Unexpected server error' });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Kuching Air Reader: http://localhost:${PORT}`));
}

export { getKuchingReading, server };
