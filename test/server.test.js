import test from 'node:test';
import assert from 'node:assert/strict';
import { aqiBand, malaysiaApiBand, parseAirnetFeed, parseApimsKuching, parseWaqiAqi, parseWaqiUpdatedLabel, pm25ToUsAqi, parseWismaSatokPage } from '../src/aqi.js';

test('AQI bands follow the US AQI breakpoints', () => {
  assert.equal(aqiBand(50).level, 'good');
  assert.equal(aqiBand(51).level, 'moderate');
  assert.equal(aqiBand(150).level, 'sensitive');
  assert.equal(aqiBand(151).level, 'unhealthy');
  assert.equal(aqiBand(301).level, 'hazardous');
});

test('extracts the current reading from simplified provider HTML', () => {
  assert.equal(parseWaqiAqi('<div>Real-time Air Quality Index (AQI). | 158 | Unhealthy Updated today</div>'), 158);
});

test('extracts AQICN provider update label', () => {
  assert.equal(parseWaqiUpdatedLabel("<span id='aqiwgtutime'>Updated on Sunday 8:00</span>"), 'Updated on Sunday 8:00');
});

test('converts PM2.5 concentration using US EPA AQI breakpoints', () => {
  assert.equal(pm25ToUsAqi(225.2), 275);
  assert.equal(pm25ToUsAqi(183.7), 234);
});

test('extracts current Wisma Satok PM2.5 from the station page', () => {
  const html = `"realtime":{"feed":{"met.h":[1788037202,6860],"pm10":[1788037202,34800],"pm25":[1788037202,22520]}}`;
  assert.deepEqual(parseWismaSatokPage(html), {
    aqi: 275,
    pm25: 225.2,
    observedAt: '2026-08-29T21:00:02.000Z'
  });
});

test('extracts the newest Wisma Satok value from the AirNet feed', () => {
  assert.deepEqual(parseAirnetFeed({ feed: { pm25: [1788040802, 23950] } }), {
    aqi: 289,
    pm25: 239.5,
    observedAt: '2026-08-29T22:00:02.000Z'
  });
});

test('extracts the official Kuching Malaysia API reading from APIMS', () => {
  const result = parseApimsKuching({ features: [{ attributes: {
    STATION_ID: 'CA65Q', STATION_LOCATION: 'Kuching, SARAWAK', API: 342,
    DATETIME: 1788289200000, PARAM_SELECTED: 'PM2.5', PLACE: 'Cawangan Farmasi Logistik Negeri Sarawak'
  } }] });
  assert.equal(result.aqi, 342);
  assert.equal(result.stationId, 'CA65Q');
  assert.equal(result.dominantPollutant, 'PM2.5');
  assert.equal(malaysiaApiBand(result.aqi).level, 'hazardous');
});
