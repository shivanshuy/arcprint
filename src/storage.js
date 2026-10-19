import { blankProject, isProject, normalizeProject } from './model.js';

const INDEX = 'arcprint.index';
const LAST = 'arcprint.last';
const PINS = 'arcprint.pins';
const projectKey = (id) => `arcprint.project.${id}`;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function loadIndex() {
  const list = readJson(INDEX, []);
  return Array.isArray(list) ? list : [];
}

export function loadProject(id) {
  const raw = readJson(projectKey(id), null);
  if (!isProject(raw)) return null;
  try {
    return normalizeProject(raw);
  } catch {
    return null;
  }
}

export function saveProject(doc) {
  const next = { ...doc, updated: Date.now() };
  localStorage.setItem(projectKey(next.id), JSON.stringify(next));
  const index = loadIndex().filter((item) => item.id !== next.id);
  index.unshift({
    id: next.id,
    name: next.name,
    updated: next.updated,
    sheets: next.sheets.length,
  });
  localStorage.setItem(INDEX, JSON.stringify(index));
  localStorage.setItem(LAST, next.id);
  return next;
}

export function deleteProject(id) {
  localStorage.removeItem(projectKey(id));
  localStorage.setItem(INDEX, JSON.stringify(loadIndex().filter((item) => item.id !== id)));
  if (localStorage.getItem(LAST) === id) localStorage.removeItem(LAST);
}

export function loadLast() {
  const lastId = localStorage.getItem(LAST);
  if (lastId) {
    const doc = loadProject(lastId);
    if (doc) return doc;
  }
  const existing = loadIndex()[0];
  if (existing) {
    const doc = loadProject(existing.id);
    if (doc) return doc;
  }
  const created = blankProject();
  return saveProject(created);
}

export function loadPins() {
  const pins = readJson(PINS, null);
  if (Array.isArray(pins) && pins.length) return pins;
  return ['service', 'database', 'queue', 'cloud'];
}

export function savePins(pins) {
  localStorage.setItem(PINS, JSON.stringify(pins));
}
