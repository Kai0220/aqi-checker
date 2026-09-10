import test from 'node:test';
import assert from 'node:assert/strict';
import { getKuchingReading } from '../server.js';
import worker from '../worker.js';

for (const backend of ['Node', 'Worker']) {
  for (const outcome of ['success', 'HTTP error', 'invalid feed']) {
    test(`${backend}: The Learning Curve ${outcome} is isolated from other stations`, async t => {
      t.mock.method(globalThis, 'fetch', async url => {
        const address = String(url);
        if (address.endsWith('/2640373')) {
          if (outcome === 'HTTP error') return new Response('', { status: 503 });
          if (outcome === 'invalid feed') return Response.json({ feed: {} });
          return Response.json({ feed: { pm25: [1789005453, 9900] } });
        }
        if (address.endsWith('/2508724')) return Response.json({ feed: { pm25: [1789005453, 1200] } });
        if (address.includes('eqms.doe.gov.my')) return Response.json({ features: [{ attributes: {
          STATION_LOCATION: 'Kuching', API: 42, DATETIME: 1789005453000
        } }] });
        if (address.includes('/city/')) return new Response('Real-time Air Quality Index (AQI). | 60 | Moderate <span id="aqiwgtutime">Updated on Thursday 10:00</span>');
        throw new Error(`Unexpected source: ${address}`);
      });
      const previousCaches = globalThis.caches;
      globalThis.caches = { default: { put: async () => {} } };
      t.after(() => {
        if (previousCaches === undefined) delete globalThis.caches;
        else globalThis.caches = previousCaches;
      });
      const data = backend === 'Node'
        ? await getKuchingReading(true)
        : await (await worker.fetch(new Request('https://example.test/api/kuching?refresh=1'), {})).json();
      assert.equal(Object.keys(data.sources).length, 4);
      assert.equal(data.sources.kuching.aqi, 60);
      assert.equal(data.sources.wismaSatok.aqi, 50);
      assert.equal(data.sources.apimsKuching.aqi, 42);
      const station = data.sources.learningCurve;
      assert.equal(station.station, 'The Learning Curve');
      assert.equal(station.sourceUrl, 'https://aqicn.org/station/malaysia-kuching-the-learning-curve/');
      if (outcome === 'success') {
        assert.equal(station.pm25, 99);
        assert.equal(station.aqi, 173);
        assert.equal(station.level, 'unhealthy');
        assert.equal(station.observedAt, new Date(1789005453000).toISOString());
      } else {
        assert.match(station.error, outcome === 'HTTP error' ? /503/ : /PM2.5/);
        assert.equal(station.aqi, undefined);
      }
    });
  }
}
