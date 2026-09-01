const themeButton = document.querySelector('#theme-toggle');
const refreshButton = document.querySelector('#refresh-button');
const liveSources = {};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === 'dark' ? '\u2600' : '\u263E';
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

function initTheme() {
  const saved = localStorage.getItem('kuching-air-theme') || localStorage.getItem('sarawak-air-theme');
  applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('kuching-air-theme', next);
    applyTheme(next);
  });
}

function displayTime(value) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-MY', {
    hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short'
  }).format(date);
}

function displayObservationTime(value) {
  if (!value) return 'Update time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  const parts = new Intl.DateTimeFormat('en-MY', {
    weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: false,
    hourCycle: 'h23',
    timeZone: 'Asia/Kuala_Lumpur'
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value;
  return `Updated on ${part('weekday')} ${Number(part('hour'))}:${part('minute')}`;
}

function renderSource(prefix, source) {
  const loading = document.querySelector(`#${prefix}-loading`);
  const result = document.querySelector(`#${prefix}-result`);
  const aqi = document.querySelector(`#${prefix}-aqi`);
  const status = document.querySelector(`#${prefix}-status`);
  const time = document.querySelector(`#${prefix}-time`);
  const meter = document.querySelector(`#${prefix}-meter`);
  if (source.error) {
    aqi.textContent = '\u2014'; status.textContent = 'Unavailable'; time.textContent = source.error;
    meter.style.left = '0%';
  } else {
    aqi.textContent = source.aqi; status.textContent = source.label;
    time.textContent = source.observedLabel || displayObservationTime(source.observedAt);
    meter.style.left = `calc(${Math.min(source.aqi / 300 * 100, 100)}% - 5px)`;
    status.dataset.level = source.level;
    if (prefix !== 'apims') liveSources[prefix] = source;
  }
  loading.classList.add('hidden'); result.classList.remove('hidden');
  updateAqiGuide();
}

function updateAqiGuide() {
  document.querySelectorAll('.live-readings').forEach(container => { container.textContent = ''; });
  Object.entries(liveSources).forEach(([prefix, source]) => {
    const container = document.querySelector(`[data-aqi-band="${source.level}"] .live-readings`);
    if (!container) return;
    const badge = document.createElement('span');
    badge.textContent = `${prefix === 'wisma' ? 'Wisma Satok' : 'Kuching'} ${source.aqi}`;
    container.append(badge);
  });
  document.querySelectorAll('[data-aqi-band]').forEach(row => row.classList.toggle('is-current', Boolean(row.querySelector('.live-readings span'))));
}

async function loadKuching(forceRefresh = false) {
  refreshButton.disabled = true;
  refreshButton.classList.add('is-refreshing');
  try {
    const response = await fetch(`/api/kuching${forceRefresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.sources) throw new Error(data.error || 'The Kuching readings are unavailable');
    renderSource('kuching', data.sources.kuching);
    renderSource('wisma', data.sources.wismaSatok);
    renderSource('apims', data.sources.apimsKuching);
    document.querySelector('#updated').textContent = `Updated ${displayTime(data.fetchedAt)}${data.cached ? ' \u00B7 cached' : ''}`;
  } catch (error) {
    renderSource('kuching', { error: error.message });
    renderSource('wisma', { error: error.message });
    renderSource('apims', { error: error.message });
    document.querySelector('#updated').textContent = 'Update failed';
  } finally {
    refreshButton.disabled = false;
    refreshButton.classList.remove('is-refreshing');
  }
}

initTheme();
loadKuching();
refreshButton.addEventListener('click', () => loadKuching(true));
