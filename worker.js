import { aqiBand, malaysiaApiBand, parseAirnetFeed, parseApimsKuching, parseWaqiAqi, parseWaqiUpdatedLabel } from './src/aqi.js';

const KUCHING_URL = 'https://aqicn.org/city/malaysia/sarawak/kuching/';
const WISMA_SATOK_URL = 'https://aqicn.org/station/malaysia-kuching-wisma-satok/';
const WISMA_SATOK_FEED_URL = 'https://airnet.waqi.info/airnet/feed/hourly/2508724';
const APIMS_URL = 'https://eqms.doe.gov.my/APIMS/main';
const APIMS_KUCHING_FEED_URL = "https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/CAQM_MCAQM_Current_Reading/MapServer/0/query?where=UPPER%28STATION_LOCATION%29%20LIKE%20%27%25KUCHING%25%27&outFields=*&returnGeometry=false&f=json";
const headers = {
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-MY,en;q=0.9',
  'User-Agent': 'KuchingAirReader/1.0 (+open-source AQI dashboard)'
};

async function readSource(url, parser, station, sourceUrl = url) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`AQICN returned HTTP ${response.status}`);
    const parsed = parser(await response.text());
    const result = typeof parsed === 'number' ? { aqi: parsed, observedAt: new Date().toISOString() } : parsed;
    return { provider: 'WAQI / AQICN', station, ...result, ...aqiBand(result.aqi), sourceUrl };
  } catch (error) {
    return { provider: 'WAQI / AQICN', station, error: error.message, sourceUrl };
  }
}

async function readKuching() {
  try {
    const response = await fetch(KUCHING_URL, { headers });
    if (!response.ok) throw new Error(`AQICN returned HTTP ${response.status}`);
    const html = await response.text();
    const aqi = parseWaqiAqi(html);
    return {
      provider: 'WAQI / AQICN', station: 'Kuching, Sarawak', aqi,
      ...aqiBand(aqi), observedLabel: parseWaqiUpdatedLabel(html), sourceUrl: KUCHING_URL
    };
  } catch (error) {
    return { provider: 'WAQI / AQICN', station: 'Kuching, Sarawak', error: error.message, sourceUrl: KUCHING_URL };
  }
}

async function readApimsKuching() {
  try {
    const response = await fetch(APIMS_KUCHING_FEED_URL, { headers: { Accept: 'application/json', 'User-Agent': headers['User-Agent'] } });
    if (!response.ok) throw new Error(`APIMS returned HTTP ${response.status}`);
    const parsed = parseApimsKuching(await response.json());
    return { provider: 'Malaysia DOE / APIMS', station: 'Kuching', standard: 'Malaysia API', ...parsed, ...malaysiaApiBand(parsed.aqi), sourceUrl: APIMS_URL };
  } catch (error) {
    return { provider: 'Malaysia DOE / APIMS', station: 'Kuching', standard: 'Malaysia API', error: error.message, sourceUrl: APIMS_URL };
  }
}

async function readings(request) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/kuching', request.url), request);
  const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1';
  if (!forceRefresh) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }
  const [kuching, wismaSatok, apimsKuching] = await Promise.all([
    readKuching(),
    readSource(WISMA_SATOK_FEED_URL, parseAirnetFeed, 'Wisma Satok', WISMA_SATOK_URL),
    readApimsKuching()
  ]);
  const response = Response.json({
    location: 'Kuching, Sarawak, Malaysia',
    sources: { kuching, wismaSatok, apimsKuching },
    fetchedAt: new Date().toISOString(),
    cached: false
  }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/kuching') return readings(request);
    return env.ASSETS.fetch(request);
  }
};
