export function aqiBand(aqi) {
  if (!Number.isFinite(aqi)) return { label: 'Unavailable', level: 'unknown' };
  if (aqi <= 50) return { label: 'Good', level: 'good' };
  if (aqi <= 100) return { label: 'Moderate', level: 'moderate' };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', level: 'sensitive' };
  if (aqi <= 200) return { label: 'Unhealthy', level: 'unhealthy' };
  if (aqi <= 300) return { label: 'Very unhealthy', level: 'very-unhealthy' };
  return { label: 'Hazardous', level: 'hazardous' };
}

export function htmlToText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseWaqiAqi(html) {
  const text = htmlToText(html);
  const match = text.match(/Real-time Air Quality Index\s*\(AQI\)[.:]?\s*(?:\|\s*)?(\d{1,3})\s*(?:\||\s)+(?:Good|Moderate|Unhealthy|Very Unhealthy|Hazardous)/i);
  const aqi = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(aqi) || aqi > 500) throw new Error('AQICN page format changed; AQI was not found');
  return aqi;
}

export function pm25ToUsAqi(concentration) {
  const value = Math.floor(concentration * 10) / 10;
  const breakpoints = [
    [0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400], [350.5, 500.4, 401, 500]
  ];
  const band = breakpoints.find(([low, high]) => value >= low && value <= high);
  if (!band) return value > 500.4 ? 500 : NaN;
  const [low, high, aqiLow, aqiHigh] = band;
  return Math.round(((aqiHigh - aqiLow) / (high - low)) * (value - low) + aqiLow);
}

export function parseWismaSatokPage(html) {
  const match = html.match(/"realtime":\{"feed":\{[^}]*"pm25":\[(\d+),(\d+)\]/i);
  if (!match) throw new Error('AQICN station page changed; live PM2.5 data was not found');
  const observedAt = new Date(Number(match[1]) * 1000);
  const pm25 = Number(match[2]) / 100;
  const aqi = pm25ToUsAqi(pm25);
  if (!Number.isFinite(aqi) || !Number.isFinite(observedAt.getTime())) throw new Error('AQICN station live data was invalid');
  return { aqi, pm25, observedAt: observedAt.toISOString() };
}

export function parseAirnetFeed(payload) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const sample = data?.feed?.pm25;
  if (!Array.isArray(sample) || sample.length < 2) throw new Error('AQICN AirNet feed changed; live PM2.5 data was not found');
  const observedAt = new Date(Number(sample[0]) * 1000);
  const pm25 = Number(sample[1]) / 100;
  const aqi = pm25ToUsAqi(pm25);
  if (!Number.isFinite(aqi) || !Number.isFinite(observedAt.getTime())) throw new Error('AQICN AirNet live data was invalid');
  return { aqi, pm25, observedAt: observedAt.toISOString() };
}
