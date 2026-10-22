export const THEMES = {
  blue: {
    paper: '#1e4d8c',
    ink: '#eef4ff',
    muted: 'rgba(238,244,255,0.74)',
    panel: '#1a4580',
    hover: 'rgba(238,244,255,0.10)',
    line: 'rgba(238,244,255,0.32)',
    minor: 'rgba(238,244,255,0.075)',
    major: 'rgba(238,244,255,0.17)',
    tint: 'rgba(238,244,255,0.10)',
    accent: '#f4bf4f',
    accentInk: '#1a2a48',
    vig: 'rgba(3,12,36,0.40)',
    tex: [1, 1, 1],
  },
  white: {
    paper: '#f4f2eb',
    ink: '#24398a',
    muted: 'rgba(36,57,138,0.78)',
    panel: '#ece9df',
    hover: 'rgba(36,57,138,0.08)',
    line: 'rgba(36,57,138,0.30)',
    minor: 'rgba(36,57,138,0.07)',
    major: 'rgba(36,57,138,0.15)',
    tint: 'rgba(36,57,138,0.07)',
    accent: '#d1432f',
    accentInk: '#ffffff',
    vig: 'rgba(80,64,20,0.14)',
    tex: [0.14, 0.22, 0.54],
  },
  green: {
    paper: '#1b7d46',
    ink: '#f4f8f2',
    muted: 'rgba(244,248,242,0.74)',
    panel: '#166c3c',
    hover: 'rgba(244,248,242,0.10)',
    line: 'rgba(244,248,242,0.34)',
    minor: 'rgba(244,248,242,0.12)',
    major: 'rgba(244,248,242,0.24)',
    tint: 'rgba(244,248,242,0.10)',
    accent: '#f3e27a',
    accentInk: '#14321f',
    vig: 'rgba(6,32,16,0.42)',
    tex: [0.9, 1, 0.92],
  },
  snow: {
    paper: '#ffffff',
    ink: '#1a1a1a',
    muted: 'rgba(26,26,26,0.66)',
    panel: '#f3f3f3',
    hover: 'rgba(26,26,26,0.06)',
    line: 'rgba(26,26,26,0.28)',
    minor: 'rgba(26,26,26,0.07)',
    major: 'rgba(26,26,26,0.14)',
    tint: 'rgba(26,26,26,0.06)',
    accent: '#1f4fd8',
    accentInk: '#ffffff',
    vig: 'rgba(0,0,0,0.06)',
    tex: [0.2, 0.2, 0.2],
  },
};

export function textureUrl(name) {
  const theme = THEMES[name] || THEMES.blue;
  const [r, g, b] = theme.tex;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 0.55 -0.22'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const SIDES = ['top', 'right', 'bottom', 'left'];
export const ROUTES = ['elbow', 'bend', 'straight', 'curve'];
export const WEIGHTS = ['s', 'm', 'l'];
export const TEXT_SIZES = ['s', 'm', 'l'];

export const uid = () => Math.random().toString(36).slice(2, 10);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const snapTo = (v, grid, on) => (on ? Math.round(v / grid) * grid : Math.round(v));
export const today = () => new Date().toISOString().slice(0, 10);

export const LETTERS = [
  { id: 'technical', label: 'Technical', short: 'Tech', family: "'Barlow Condensed', 'Arial Narrow', sans-serif", caps: true },
  { id: 'hand', label: 'Handwriting', short: 'Hand', family: "'Architects Daughter', 'Comic Sans MS', cursive", caps: false },
  { id: 'sketch', label: 'Sketch', short: 'Sketch', family: "'Caveat', 'Segoe Print', cursive", caps: false },
];

export function fontFamily(lettering) {
  return LETTERS.find((item) => item.id === lettering)?.family || LETTERS[0].family;
}

export function fontPx(size) {
  if (size === 's') return 13;
  if (size === 'l') return 22;
  return 16;
}

export function strokePx(weight) {
  if (weight === 's') return 1.25;
  if (weight === 'l') return 2.5;
  return 1.75;
}

export function blankSheet(index = 1) {
  return {
    id: uid(),
    code: `A-${100 + index}`,
    title: 'Untitled sheet',
    date: today(),
    nodes: [],
    edges: [],
  };
}

export function blankProject() {
  const sheet = blankSheet(1);
  return {
    id: uid(),
    name: 'Untitled project',
    theme: 'blue',
    library: 'technical',
    logo: null,
    settings: {
      snap: true,
      dims: false,
      showGrid: true,
      grid: 20,
      route: 'elbow',
      lettering: 'technical',
      caps: true,
    },
    sheets: [sheet],
    active: sheet.id,
    updated: Date.now(),
  };
}

export function activeSheet(doc) {
  return doc.sheets.find((s) => s.id === doc.active) || doc.sheets[0];
}

export function patchSheet(doc, sheetId, fn) {
  return {
    ...doc,
    updated: Date.now(),
    sheets: doc.sheets.map((s) => (s.id === sheetId ? fn(s) : s)),
  };
}

export function isProject(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.sheets) && value.sheets.length);
}

export function normalizeProject(raw) {
  const base = blankProject();
  const settings = { ...base.settings, ...(raw.settings || {}) };
  const sheets = raw.sheets.map((sheet, index) => ({
    id: sheet.id || uid(),
    code: sheet.code || `A-${101 + index}`,
    title: sheet.title || 'Untitled sheet',
    date: sheet.date || today(),
    nodes: Array.isArray(sheet.nodes) ? sheet.nodes.map(normalizeNode) : [],
    edges: Array.isArray(sheet.edges) ? sheet.edges.map(normalizeEdge) : [],
  }));
  return {
    id: raw.id || uid(),
    name: raw.name || 'Untitled project',
    theme: THEMES[raw.theme] ? raw.theme : 'blue',
    library: ['technical', 'aws', 'azure', 'gcp'].includes(raw.library) ? raw.library : 'technical',
    logo: raw.logo || null,
    settings,
    sheets,
    active: sheets.some((s) => s.id === raw.active) ? raw.active : sheets[0].id,
    updated: raw.updated || Date.now(),
  };
}

function normalizeNode(node) {
  return {
    id: node.id || uid(),
    type: node.type || 'service',
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
    w: Number(node.w) || 80,
    h: Number(node.h) || 48,
    label: node.label || '',
    weight: node.weight || 'm',
    text: node.text || 'm',
    fill: node.fill || 'none',
    fillColor: hexColor(node.fillColor),
    ink: hexColor(node.ink),
    dashed: Boolean(node.dashed),
    locked: Boolean(node.locked),
    rot: turn(node.rot, 0),
    route: node.type === 'arrow' && (node.route === 'elbow' || node.route === 'bend') ? node.route : undefined,
    corner: node.type === 'arrow' && node.corner === 'sharp' ? 'sharp' : undefined,
    head: node.type === 'arrow' && node.head === 'none' ? 'none' : undefined,
  };
}

function normalizeEdge(edge) {
  return {
    id: edge.id || uid(),
    from: edge.from,
    to: edge.to,
    fromSide: edge.fromSide || null,
    toSide: edge.toSide || null,
    fromAt: Number.isFinite(Number(edge.fromAt)) ? Number(edge.fromAt) : 0.5,
    toAt: Number.isFinite(Number(edge.toAt)) ? Number(edge.toAt) : 0.5,
    route: ROUTES.includes(edge.route) ? edge.route : 'elbow',
    corner: edge.corner === 'sharp' ? 'sharp' : 'round',
    arrow: edge.arrow || 'end',
    label: edge.label || '',
    weight: edge.weight || 'm',
    ink: hexColor(edge.ink),
    dashed: Boolean(edge.dashed),
  };
}

export function hexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value.toLowerCase() : '';
}

export function contrastInk(color) {
  const n = Number.parseInt(String(color).slice(1), 16);
  if (!Number.isFinite(n)) return '#1a1a1a';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1a1a1a' : '#ffffff';
}

export function turn(rot, delta) {
  return (((Number(rot) || 0) + delta) % 360 + 360) % 360;
}

export function worldPoint(node, lx, ly) {
  const rot = ((node.rot || 0) * Math.PI) / 180;
  if (!rot) return { x: node.x + lx, y: node.y + ly };
  const cx = node.w / 2;
  const cy = node.h / 2;
  const dx = lx - cx;
  const dy = ly - cy;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return {
    x: node.x + cx + dx * cos - dy * sin,
    y: node.y + cy + dx * sin + dy * cos,
  };
}

export function toLocal(node, x, y) {
  const rot = ((node.rot || 0) * Math.PI) / 180;
  if (!rot) return { x: x - node.x, y: y - node.y };
  const cx = node.w / 2;
  const cy = node.h / 2;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const dx = x - node.x - cx;
  const dy = y - node.y - cy;
  return { x: dx * cos - dy * sin + cx, y: dx * sin + dy * cos + cy };
}

export function sidePoint(node, side, at = 0.5) {
  if (side === 'left') return worldPoint(node, 0, node.h * at);
  if (side === 'right') return worldPoint(node, node.w, node.h * at);
  if (side === 'top') return worldPoint(node, node.w * at, 0);
  return worldPoint(node, node.w * at, node.h);
}

export function nudge(point, side, distance, rot = 0) {
  const base = side === 'left' ? [-1, 0] : side === 'right' ? [1, 0] : side === 'top' ? [0, -1] : [0, 1];
  const rad = ((rot || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const vx = base[0] * cos - base[1] * sin;
  const vy = base[0] * sin + base[1] * cos;
  return { x: point.x + vx * distance, y: point.y + vy * distance };
}

export function facingSide(from, to) {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

export function edgeGeometry(edge, from, to) {
  const fromSide = edge.fromSide || facingSide(from, to);
  const toSide = edge.toSide || facingSide(to, from);
  const start = sidePoint(from, fromSide, edge.fromAt ?? 0.5);
  const end = sidePoint(to, toSide, edge.toAt ?? 0.5);
  if (edge.route === 'straight') return { points: [start, end], fromSide, toSide, curve: false };
  if (edge.route === 'curve') return { points: [start, end], fromSide, toSide, curve: true };
  if (edge.route === 'bend') {
    const horizontal = fromSide === 'left' || fromSide === 'right';
    const corner = horizontal ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
    return { points: [start, corner, end], fromSide, toSide, curve: false };
  }
  const gap = 28;
  const leave = nudge(start, fromSide, gap, from.rot || 0);
  const arrive = nudge(end, toSide, gap, to.rot || 0);
  const points = [start, leave];
  if (Math.abs(leave.x - arrive.x) < 1 || Math.abs(leave.y - arrive.y) < 1) {
    points.push(arrive);
  } else if (fromSide === 'left' || fromSide === 'right') {
    points.push({ x: arrive.x, y: leave.y }, arrive);
  } else {
    points.push({ x: leave.x, y: arrive.y }, arrive);
  }
  points.push(end);
  return { points, fromSide, toSide, curve: false };
}

export function slideEdge(edge, from, to, x, y) {
  const fromSide = edge.fromSide || facingSide(from, to);
  const toSide = edge.toSide || facingSide(to, from);
  return {
    ...edge,
    fromSide,
    toSide,
    fromAt: anchorAlong(from, fromSide, from.x + toLocal(from, x, y).x, from.y + toLocal(from, x, y).y),
    toAt: anchorAlong(to, toSide, to.x + toLocal(to, x, y).x, to.y + toLocal(to, x, y).y),
  };
}

function anchorAlong(node, side, x, y) {
  const vertical = side === 'left' || side === 'right';
  const span = vertical ? node.h : node.w;
  const origin = vertical ? node.y : node.x;
  const point = vertical ? y : x;
  const at = span ? (point - origin) / span : 0.5;
  return Math.min(0.88, Math.max(0.12, at));
}

export function geometryPath(geometry) {
  const { points, curve, fromSide, toSide } = geometry;
  if (curve) {
    const [start, end] = points;
    const span = Math.max(48, Math.hypot(end.x - start.x, end.y - start.y) * 0.45);
    const c1 = nudge(start, fromSide, span);
    const c2 = nudge(end, toSide, span);
    return `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
  }
  if (points.length < 3 || geometry.corner === 'sharp') return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return roundedPolyline(points, 16);
}

export function freeBendPath(w, h, radius = 16) {
  return roundedPolyline([
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
  ], radius);
}

export function freeElbowPath(w, h, radius = 16) {
  return roundedPolyline([
    { x: 0, y: 0 },
    { x: w / 2, y: 0 },
    { x: w / 2, y: h },
    { x: w, y: h },
  ], radius);
}

function roundedPolyline(points, radius) {
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    if (d1 < 1 || d2 < 1 || r < 1) {
      parts.push(`L ${curr.x} ${curr.y}`);
      continue;
    }
    const inX = curr.x - ((curr.x - prev.x) / d1) * r;
    const inY = curr.y - ((curr.y - prev.y) / d1) * r;
    const outX = curr.x + ((next.x - curr.x) / d2) * r;
    const outY = curr.y + ((next.y - curr.y) / d2) * r;
    parts.push(`L ${inX} ${inY} Q ${curr.x} ${curr.y} ${outX} ${outY}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${last.x} ${last.y}`);
  return parts.join(' ');
}

export function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / len, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function nodeBounds(node) {
  const rot = node.rot || 0;
  if (!rot && node.type !== 'arrow') return { x: node.x, y: node.y, w: node.w, h: node.h };
  if (!rot && node.type === 'arrow') {
    const x2 = node.x + node.w;
    const y2 = node.y + node.h;
    return {
      x: Math.min(node.x, x2),
      y: Math.min(node.y, y2),
      w: Math.max(12, Math.abs(node.w)),
      h: Math.max(12, Math.abs(node.h)),
    };
  }
  const x0 = node.type === 'arrow' ? Math.min(0, node.w) : 0;
  const y0 = node.type === 'arrow' ? Math.min(0, node.h) : 0;
  const x1 = node.type === 'arrow' ? Math.max(node.w, 0) : node.w;
  const y1 = node.type === 'arrow' ? Math.max(node.h, 0) : node.h;
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([lx, ly]) => worldPoint(node, lx, ly));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

export function hitNode(nodes, x, y, zoom = 1) {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    const local = toLocal(node, x, y);
    const tol = 14 / (zoom || 1);
    if (node.type === 'arrow' && node.route === 'elbow') {
      const midX = node.w / 2;
      const near = segmentDistance(local.x, local.y, 0, 0, midX, 0) <= tol
        || segmentDistance(local.x, local.y, midX, 0, midX, node.h) <= tol
        || segmentDistance(local.x, local.y, midX, node.h, node.w, node.h) <= tol;
      if (near) return node;
      continue;
    }
    if (node.type === 'arrow' && node.route === 'bend') {
      const near = segmentDistance(local.x, local.y, 0, 0, node.w, 0) <= tol
        || segmentDistance(local.x, local.y, node.w, 0, node.w, node.h) <= tol;
      if (near) return node;
      continue;
    }
    if (node.type === 'arrow') {
      if (segmentDistance(local.x, local.y, 0, 0, node.w, node.h) <= tol) return node;
      continue;
    }
    if (local.x >= 0 && local.y >= 0 && local.x <= node.w && local.y <= node.h) return node;
  }
  return null;
}

export function portPoint(node, side, zoom = 1) {
  return nudge(sidePoint(node, side), side, 16 / (zoom || 1), node.rot || 0);
}

export function findPort(nodes, x, y, zoom) {
  const tol = 11 / zoom;
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    if (node.type === 'arrow') continue;
    for (const side of SIDES) {
      const point = portPoint(node, side, zoom);
      if (Math.hypot(point.x - x, point.y - y) <= tol) return { node, side, point: sidePoint(node, side) };
    }
  }
  return null;
}

export function hitEdge(edges, nodes, x, y, zoom) {
  const tol = 18 / zoom;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (let i = edges.length - 1; i >= 0; i -= 1) {
    const edge = edges[i];
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || from.type === 'arrow' || to.type === 'arrow') continue;
    const geometry = edgeGeometry(edge, from, to);
    if (geometry.curve) {
      const samples = sampleCurve(geometry, 16);
      for (let s = 0; s < samples.length - 1; s += 1) {
        const a = samples[s];
        const b = samples[s + 1];
        if (segmentDistance(x, y, a.x, a.y, b.x, b.y) <= tol) return edge;
      }
      continue;
    }
    const { points } = geometry;
    for (let p = 0; p < points.length - 1; p += 1) {
      const a = points[p];
      const b = points[p + 1];
      if (segmentDistance(x, y, a.x, a.y, b.x, b.y) <= tol) return edge;
    }
  }
  return null;
}

function sampleCurve(geometry, steps) {
  const [start, end] = geometry.points;
  const span = Math.max(48, Math.hypot(end.x - start.x, end.y - start.y) * 0.45);
  const c1 = nudge(start, geometry.fromSide, span);
  const c2 = nudge(end, geometry.toSide, span);
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push({
      x: u * u * u * start.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * end.x,
      y: u * u * u * start.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * end.y,
    });
  }
  return points;
}

const HANDLE_ANCHOR = {
  nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5],
  se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5],
};

export const HANDLE_IDS = Object.keys(HANDLE_ANCHOR);

export function handlePoint(node, id) {
  const [fx, fy] = HANDLE_ANCHOR[id];
  return { x: node.x + node.w * fx, y: node.y + node.h * fy, id };
}

export function hitHandle(node, x, y, zoom) {
  const tol = 10 / zoom;
  const local = toLocal(node, x, y);
  const top = node.type === 'arrow' ? Math.min(0, node.h) : 0;
  const rotateAt = { x: node.w / 2, y: top - 22 / zoom };
  if (Math.hypot(local.x - rotateAt.x, local.y - rotateAt.y) <= tol + 4 / zoom) return { id: 'rotate', x, y };
  if (node.type === 'arrow') {
    const ends = [
      { id: 'start', x: 0, y: 0 },
      { id: 'end', x: node.w, y: node.h },
    ];
    return ends.find((handle) => Math.hypot(handle.x - local.x, handle.y - local.y) <= tol) || null;
  }
  const box = { x: 0, y: 0, w: node.w, h: node.h };
  const direct = HANDLE_IDS.map((id) => handlePoint(box, id)).find((handle) => Math.hypot(handle.x - local.x, handle.y - local.y) <= tol);
  if (direct) return direct;
  const band = 8 / zoom;
  const withinX = local.x >= -band && local.x <= node.w + band;
  const withinY = local.y >= -band && local.y <= node.h + band;
  const left = Math.abs(local.x) <= band && withinY;
  const right = Math.abs(local.x - node.w) <= band && withinY;
  const north = Math.abs(local.y) <= band && withinX;
  const south = Math.abs(local.y - node.h) <= band && withinX;
  if (north && left) return handlePoint(box, 'nw');
  if (north && right) return handlePoint(box, 'ne');
  if (south && left) return handlePoint(box, 'sw');
  if (south && right) return handlePoint(box, 'se');
  if (left) return handlePoint(box, 'w');
  if (right) return handlePoint(box, 'e');
  if (north) return handlePoint(box, 'n');
  if (south) return handlePoint(box, 's');
  return null;
}

export function resizeRotated(orig, id, x, y, grid, snap) {
  if (!(orig.rot || 0)) return resizeBox(orig, id, x, y, grid, snap);
  const local = toLocal(orig, x, y);
  const next = resizeBox({ ...orig, x: 0, y: 0 }, id, local.x, local.y, grid, false);
  const fx = id.includes('w') ? orig.w : 0;
  const fy = id.includes('n') ? orig.h : 0;
  const fixed = worldPoint(orig, fx, fy);
  const flx = fx - next.x;
  const fly = fy - next.y;
  const cx = next.w / 2;
  const cy = next.h / 2;
  const rad = ((orig.rot || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = flx - cx;
  const dy = fly - cy;
  return {
    ...orig,
    x: fixed.x - cx - (dx * cos - dy * sin),
    y: fixed.y - cy - (dx * sin + dy * cos),
    w: next.w,
    h: next.h,
  };
}

export function resizeArrow(orig, handle, x, y, grid, snap) {
  if (!(orig.rot || 0)) {
    if (handle === 'start') {
      const endX = orig.x + orig.w;
      const endY = orig.y + orig.h;
      const nx = snapTo(x, grid, snap);
      const ny = snapTo(y, grid, snap);
      return { ...orig, x: nx, y: ny, w: endX - nx, h: endY - ny };
    }
    return { ...orig, w: snapTo(x, grid, snap) - orig.x, h: snapTo(y, grid, snap) - orig.y };
  }
  const rad = ((orig.rot || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const anchor = worldPoint(orig, handle === 'start' ? orig.w : 0, handle === 'start' ? orig.h : 0);
  const vx = x - anchor.x;
  const vy = y - anchor.y;
  const spanX = vx * cos + vy * sin;
  const spanY = -vx * sin + vy * cos;
  const w = handle === 'start' ? -spanX : spanX;
  const h = handle === 'start' ? -spanY : spanY;
  const cx = w / 2;
  const cy = h / 2;
  const startLocal = handle === 'start' ? { x: w, y: h } : { x: 0, y: 0 };
  const dx = startLocal.x - cx;
  const dy = startLocal.y - cy;
  return {
    ...orig,
    x: anchor.x - cx - (dx * cos - dy * sin),
    y: anchor.y - cy - (dx * sin + dy * cos),
    w,
    h,
  };
}

export function resizeBox(orig, id, x, y, grid, snap) {
  let left = orig.x;
  let top = orig.y;
  let right = orig.x + orig.w;
  let bottom = orig.y + orig.h;
  const sx = snapTo(x, grid, snap);
  const sy = snapTo(y, grid, snap);
  if (id.includes('w')) left = sx;
  if (id.includes('e')) right = sx;
  if (id.includes('n')) top = sy;
  if (id.includes('s')) bottom = sy;
  if (right - left < 36) {
    if (id.includes('w')) left = right - 36;
    else right = left + 36;
  }
  if (bottom - top < 28) {
    if (id.includes('n')) top = bottom - 28;
    else bottom = top + 28;
  }
  return { ...orig, x: left, y: top, w: right - left, h: bottom - top };
}

export function contentBounds(nodes) {
  if (!nodes.length) return { x: 40, y: 40, w: 720, h: 420 };
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const node of nodes) {
    const box = nodeBounds(node);
    x1 = Math.min(x1, box.x);
    y1 = Math.min(y1, box.y);
    x2 = Math.max(x2, box.x + box.w);
    y2 = Math.max(y2, box.y + box.h);
  }
  return { x: x1, y: y1, w: Math.max(40, x2 - x1), h: Math.max(40, y2 - y1) };
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function normalizeRect(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function displayLabel(label, settings) {
  const text = label || '';
  if (settings?.lettering === 'technical' && settings?.caps) return text.toUpperCase();
  return text;
}

export function arrowHead(x, y, degrees, length = 12) {
  const rad = (degrees * Math.PI) / 180;
  const backX = x - Math.cos(rad) * length;
  const backY = y - Math.sin(rad) * length;
  const spread = 4.6;
  const lx = backX + Math.cos(rad + Math.PI / 2) * spread;
  const ly = backY + Math.sin(rad + Math.PI / 2) * spread;
  const rx = backX - Math.cos(rad + Math.PI / 2) * spread;
  const ry = backY - Math.sin(rad + Math.PI / 2) * spread;
  return `${x},${y} ${lx},${ly} ${rx},${ry}`;
}

export function endAngle(points) {
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function curveEndAngle(toSide, rot = 0) {
  const base = toSide === 'left' ? 0 : toSide === 'right' ? 180 : toSide === 'top' ? 90 : -90;
  return base + (rot || 0);
}

export function curveStartAngle(fromSide, rot = 0) {
  const base = fromSide === 'left' ? 180 : fromSide === 'right' ? 0 : fromSide === 'top' ? -90 : 90;
  return base + (rot || 0);
}
