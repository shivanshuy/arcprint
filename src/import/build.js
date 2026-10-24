import { blankProject, blankSheet, facingSide, uid } from '../model.js';
import { makeNode, symbolById } from '../library.js';

const ORIGIN = { x: 80, y: 80 };
const GAP_X = 52;
const GAP_Y = 64;
const PAD = 36;

const KIND_TYPE = {
  database: 'database',
  cylinder: 'database',
  decision: 'decision',
  diamond: 'decision',
  hex: 'gateway',
  gateway: 'gateway',
  stadium: 'start',
  start: 'start',
  round: 'function',
  function: 'function',
  circle: 'cloud',
  cloud: 'cloud',
  para: 'data',
  data: 'data',
  trap: 'delay',
  delay: 'delay',
  queue: 'queue',
  actor: 'client',
  client: 'client',
  server: 'server',
  container: 'container',
  component: 'container',
  document: 'document',
  file: 'document',
  note: 'note',
  callout: 'callout',
  text: 'text',
  folder: 'cluster',
  package: 'zone',
  frame: 'zone',
  zone: 'zone',
  region: 'region',
  network: 'vpc',
  cluster: 'cluster',
  card: 'card',
  storage: 'bucket',
  bucket: 'bucket',
  artifact: 'artifact',
  repo: 'repo',
  api: 'api',
  auth: 'auth',
  process: 'process',
  service: 'service',
  worker: 'worker',
  topic: 'topic',
  cache: 'cache',
  browser: 'browser',
  window: 'window',
  label: 'text',
  usecase: 'start',
  interface: 'api',
  stack: 'cache',
  hexagon: 'gateway',
  node: 'server',
};

export function typeFromKind(kind, fallback = 'service') {
  return KIND_TYPE[kind] || fallback;
}

export function emptyIr(title = 'Imported sheet') {
  return {
    title,
    direction: 'TB',
    nodes: [],
    edges: [],
    source: null,
  };
}

export function ensureNode(ir, id, patch = {}) {
  const key = String(id || '').trim();
  if (!key) return null;
  let node = ir.nodes.find((item) => item.key === key);
  if (!node) {
    node = {
      key,
      label: patch.label || key,
      kind: patch.kind || 'service',
      parent: patch.parent ?? null,
      dashed: Boolean(patch.dashed),
      fill: patch.fill || '',
      fillColor: patch.fillColor || '',
      ink: patch.ink || '',
      weight: patch.weight || 'm',
    };
    ir.nodes.push(node);
  }
  if (patch.label && (node.label === node.key || !node.label)) node.label = patch.label;
  if (patch.kind && node.kind === 'service') node.kind = patch.kind;
  if (patch.parent != null && node.parent == null) node.parent = patch.parent;
  if (patch.dashed) node.dashed = true;
  if (patch.fill) node.fill = patch.fill;
  if (patch.fillColor) node.fillColor = patch.fillColor;
  if (patch.ink) node.ink = patch.ink;
  if (patch.weight) node.weight = patch.weight;
  return node;
}

export function addEdge(ir, from, to, spec = {}) {
  if (!from || !to || from === to) return;
  ensureNode(ir, from);
  ensureNode(ir, to);
  ir.edges.push({
    from: String(from),
    to: String(to),
    label: spec.label || '',
    dashed: Boolean(spec.dashed),
    arrow: spec.arrow || 'end',
    weight: spec.weight || 'm',
  });
}

function sizeFor(kind) {
  const type = typeFromKind(kind);
  const spec = symbolById(type);
  if (!spec) return { w: 168, h: 72 };
  return { w: spec.w, h: spec.h };
}

function isGroupKind(kind) {
  return ['zone', 'region', 'network', 'cluster', 'package', 'frame', 'folder'].includes(kind);
}

function childrenOf(ir, parent) {
  return ir.nodes.filter((node) => (node.parent || null) === parent);
}

function rankNodes(nodes, edges, direction) {
  const keys = new Set(nodes.map((node) => node.key));
  const incoming = new Map([...keys].map((key) => [key, 0]));
  const outs = new Map([...keys].map((key) => [key, []]));
  for (const edge of edges) {
    if (!keys.has(edge.from) || !keys.has(edge.to)) continue;
    if (edge.from === edge.to) continue;
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outs.get(edge.from).push(edge.to);
  }
  const rank = new Map();
  const ready = [...keys].filter((key) => !incoming.get(key));
  if (!ready.length) ready.push(...keys);
  const seen = new Set();
  while (ready.length) {
    const key = ready.shift();
    if (seen.has(key)) continue;
    seen.add(key);
    const base = rank.get(key) || 0;
    rank.set(key, base);
    for (const next of outs.get(key) || []) {
      rank.set(next, Math.max(rank.get(next) || 0, base + 1));
      incoming.set(next, (incoming.get(next) || 1) - 1);
      if (incoming.get(next) <= 0) ready.push(next);
    }
  }
  for (const key of keys) if (!rank.has(key)) rank.set(key, 0);
  if (direction === 'BT' || direction === 'RL') {
    const max = Math.max(0, ...rank.values());
    for (const [key, value] of rank) rank.set(key, max - value);
  }
  return rank;
}

function offsetDescendants(ir, parentKey, dx, dy) {
  for (const kid of childrenOf(ir, parentKey)) {
    if (!kid._box) continue;
    kid._box.x += dx;
    kid._box.y += dy;
    offsetDescendants(ir, kid.key, dx, dy);
  }
}

function layoutGroup(ir, parent, origin) {
  const kids = childrenOf(ir, parent);
  if (!kids.length) return { x: origin.x, y: origin.y, w: 280, h: 180 };
  for (const kid of kids) {
    if (childrenOf(ir, kid.key).length) {
      const nested = layoutGroup(ir, kid.key, { x: 0, y: 0 });
      kid._box = { x: 0, y: 0, w: nested.w + PAD, h: nested.h + 44 };
      kid.kind = isGroupKind(kid.kind) ? kid.kind : 'zone';
      offsetDescendants(ir, kid.key, 18, 32);
    } else {
      const size = sizeFor(kid.kind);
      kid._box = { x: 0, y: 0, w: size.w, h: size.h };
    }
  }
  const localEdges = ir.edges.filter((edge) => kids.some((k) => k.key === edge.from) && kids.some((k) => k.key === edge.to));
  const rank = rankNodes(kids, localEdges, ir.direction);
  const columns = new Map();
  for (const kid of kids) {
    const r = rank.get(kid.key) || 0;
    if (!columns.has(r)) columns.set(r, []);
    columns.get(r).push(kid);
  }
  const ranks = [...columns.keys()].sort((a, b) => a - b);
  const horizontal = ir.direction === 'LR' || ir.direction === 'RL';
  let cursor = 0;
  let maxCross = 0;
  for (const r of ranks) {
    const col = columns.get(r);
    let run = 0;
    let thick = 0;
    for (const kid of col) {
      const box = kid._box;
      const x = origin.x + (horizontal ? cursor : run);
      const y = origin.y + (horizontal ? run : cursor);
      const dx = x - box.x;
      const dy = y - box.y;
      kid._box = { ...box, x, y };
      offsetDescendants(ir, kid.key, dx, dy);
      if (horizontal) {
        run += box.h + GAP_Y;
        thick = Math.max(thick, box.w);
      } else {
        run += box.w + GAP_X;
        thick = Math.max(thick, box.h);
      }
    }
    maxCross = Math.max(maxCross, run - (horizontal ? GAP_Y : GAP_X));
    cursor += thick + (horizontal ? GAP_X : GAP_Y);
  }
  const w = horizontal ? Math.max(cursor - GAP_X, 160) : Math.max(maxCross, 160);
  const h = horizontal ? Math.max(maxCross, 120) : Math.max(cursor - GAP_Y, 120);
  return { x: origin.x, y: origin.y, w, h };
}

function placeGrid(items, columns, origin) {
  const cellW = 92;
  const cellH = 92;
  let col = 0;
  let row = 0;
  let maxW = 0;
  let maxH = 0;
  for (const item of items) {
    const span = Math.max(1, item.span || 1);
    if (col + span > columns) {
      col = 0;
      row += 1;
    }
    const x = origin.x + col * cellW;
    const y = origin.y + row * cellH;
    if (item.kind === 'space') {
      col += span;
      continue;
    }
    if (item.kind === 'group') {
      const inner = placeGrid(item.items, item.columns || 1, { x: x + 16, y: y + 28 });
      item.box = {
        x,
        y,
        w: Math.max(span * cellW - 8, inner.w + 32),
        h: Math.max(cellH - 8, inner.h + 44),
      };
      col += span;
      maxW = Math.max(maxW, item.box.x + item.box.w - origin.x);
      maxH = Math.max(maxH, item.box.y + item.box.h - origin.y);
      continue;
    }
    const size = sizeFor(item.nodeKind || 'service');
    item.box = {
      x,
      y,
      w: Math.max(size.w, span * cellW - 12),
      h: size.h,
    };
    col += span;
    maxW = Math.max(maxW, item.box.x + item.box.w - origin.x);
    maxH = Math.max(maxH, item.box.y + item.box.h - origin.y);
  }
  return { w: Math.max(maxW, columns * cellW), h: Math.max(maxH, cellH) };
}

export function applyGrid(ir, grid) {
  ir.grid = grid;
}

function paintNode(irNode) {
  const type = typeFromKind(irNode.kind, isGroupKind(irNode.kind) ? 'zone' : 'service');
  const spec = symbolById(type) || symbolById('service');
  const box = irNode._box || { x: ORIGIN.x, y: ORIGIN.y, w: spec.w, h: spec.h };
  const node = makeNode(spec, box.x, box.y, { w: box.w, h: box.h });
  node.label = irNode.label || spec.label;
  node.dashed = Boolean(irNode.dashed || spec.dashed);
  if (irNode.fill) node.fill = irNode.fill;
  if (irNode.fillColor) node.fillColor = irNode.fillColor;
  if (irNode.ink) node.ink = irNode.ink;
  if (irNode.weight) node.weight = irNode.weight;
  if (isGroupKind(type) && !irNode.fill) node.fill = 'tint';
  return node;
}

function collectGridNodes(items, out, parentBox) {
  for (const item of items) {
    if (item.kind === 'space') continue;
    if (item.kind === 'group') {
      if (item.ghost) {
        collectGridNodes(item.items, out, parentBox);
        continue;
      }
      const irNode = {
        key: item.id,
        label: item.label || item.id,
        kind: 'zone',
        dashed: true,
        fill: 'tint',
        _box: item.box,
      };
      out.push(irNode);
      collectGridNodes(item.items, out, item.box);
      continue;
    }
    out.push({
      key: item.id,
      label: item.label,
      kind: item.nodeKind || 'service',
      dashed: item.dashed,
      fill: item.fill,
      fillColor: item.fillColor,
      ink: item.ink,
      weight: item.weight,
      _box: item.box,
    });
  }
}

export function irToSheet(ir, index = 1) {
  const sheet = blankSheet(index);
  sheet.title = ir.title || sheet.title;
  if (ir.source) sheet.source = { kind: ir.source.kind, text: ir.source.text };
  const placed = [];
  if (ir.grid) {
    placeGrid(ir.grid.items, ir.grid.columns || 1, ORIGIN);
    collectGridNodes(ir.grid.items, placed);
  } else {
    layoutGroup(ir, null, ORIGIN);
    for (const node of ir.nodes) {
      if (!node._box) {
        const size = sizeFor(node.kind);
        node._box = { x: ORIGIN.x, y: ORIGIN.y, w: size.w, h: size.h };
      }
      placed.push(node);
    }
  }
  const byKey = new Map();
  for (const irNode of placed) {
    const node = paintNode(irNode);
    byKey.set(irNode.key, node);
    sheet.nodes.push(node);
  }
  for (const edge of ir.edges) {
    const from = byKey.get(edge.from);
    const to = byKey.get(edge.to);
    if (!from || !to) continue;
    sheet.edges.push({
      id: uid(),
      from: from.id,
      to: to.id,
      fromSide: facingSide(from, to),
      toSide: facingSide(to, from),
      fromAt: 0.5,
      toAt: 0.5,
      route: 'elbow',
      arrow: edge.arrow || 'end',
      label: edge.label || '',
      weight: edge.weight || 'm',
      dashed: Boolean(edge.dashed),
    });
  }
  return sheet;
}

export function sheetsToProject(sheets, name, extra = {}) {
  const project = blankProject();
  const list = sheets.length ? sheets : [blankSheet(1)];
  project.id = uid();
  project.name = name || 'Imported diagram';
  project.sheets = list;
  project.active = list[0].id;
  project.updated = Date.now();
  if (extra.theme) project.theme = extra.theme;
  return project;
}
