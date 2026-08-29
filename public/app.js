const themeButton = document.querySelector('#theme-toggle');

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
    time.textContent = source.observedLabel || displayTime(source.observedAt);
    meter.style.left = `calc(${Math.min(source.aqi / 300 * 100, 100)}% - 5px)`;
    status.dataset.level = source.level;
  }
  loading.classList.add('hidden'); result.classList.remove('hidden');
}

async function loadKuching() {
  try {
    const response = await fetch('/api/kuching', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.sources) throw new Error(data.error || 'The Kuching readings are unavailable');
    renderSource('kuching', data.sources.kuching);
    renderSource('wisma', data.sources.wismaSatok);
    document.querySelector('#updated').textContent = `Updated ${displayTime(data.fetchedAt)}${data.cached ? ' \u00B7 cached' : ''}`;
  } catch (error) {
    renderSource('kuching', { error: error.message });
    renderSource('wisma', { error: error.message });
    document.querySelector('#updated').textContent = 'Update failed';
  }
}

initTheme();
loadKuching();
