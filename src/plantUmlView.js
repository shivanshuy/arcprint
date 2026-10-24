import vizUrl from '@plantuml/core/viz-global.js?url';
import themesUrl from '@plantuml/core/themes.js?url';
import emojiUrl from '@plantuml/core/emoji.js?url';
import iconicUrl from '@plantuml/core/openiconic.js?url';

const STDLIB_BASE = 'https://plantuml.github.io/plantuml/js-plantuml/';

let ready;

function loadScript(src, key) {
  if (document.querySelector(`script[data-arcprint-puml="${key}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.arcprintPuml = key;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Could not load the PlantUML ${key} assets.`));
    document.head.appendChild(el);
  });
}

async function loadPlantUml() {
  if (ready) return ready;
  globalThis.PLANTUML_STDLIB_BASE = STDLIB_BASE;
  await loadScript(vizUrl, 'viz');
  const Viz = globalThis.Viz;
  if (Viz?.instance) globalThis.PLANTUML_VIZ = Viz;
  await Promise.all([
    loadScript(themesUrl, 'themes'),
    loadScript(emojiUrl, 'emoji'),
    loadScript(iconicUrl, 'openiconic'),
  ]);
  const api = await import('@plantuml/core');
  ready = api;
  return api;
}

function linesOf(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  if (!lines.some((line) => /@start/i.test(line))) {
    return ['@startuml', ...lines, '@enduml'];
  }
  return lines;
}

export async function renderPlantUml(text) {
  const api = await loadPlantUml();
  return new Promise((resolve, reject) => {
    api.renderToString(linesOf(text), resolve, reject, { maxSvgSize: 0 });
  });
}
