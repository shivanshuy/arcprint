import {
  THEMES,
  activeSheet,
  contentBounds,
  contrastInk,
  displayLabel,
  hexColor,
  nodeBounds,
  strokePx,
  worldPoint,
} from './model.js';
import { BEHIND, symbolById } from './library.js';

function liveNodes(sheet) {
  return (sheet.nodes || []).filter((node) => node && node.id && node.id !== '__draft');
}

function liveEdges(sheet) {
  return (sheet.edges || []).filter((edge) => edge && edge.id !== '__draft' && edge.from && edge.to);
}

function themeOf(doc) {
  return THEMES[doc.theme] || THEMES.blue;
}

function channels(color) {
  const clean = hexColor(color);
  if (!clean) return [128, 128, 128];
  const value = Number.parseInt(clean.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(base, tint, amount) {
  const a = channels(base);
  const b = channels(tint);
  const channel = (index) => Math.max(0, Math.min(255, Math.round(a[index] + (b[index] - a[index]) * amount)));
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, '0')).join('')}`;
}

function inkOf(node, theme) {
  return hexColor(node.ink) || theme.ink;
}

function isFrame(node) {
  if (!node || node.type === 'arrow') return false;
  const spec = symbolById(node.type);
  return spec?.kind === 'frame' || spec?.kind === 'boundary' || BEHIND.has(node.type);
}

function boxOf(node) {
  if (node.synthetic) return { x: node.x, y: node.y, w: Math.max(8, node.w), h: Math.max(8, node.h) };
  return nodeBounds(node);
}

function paintNode(node, spec, theme) {
  const ink = inkOf(node, theme);
  const custom = hexColor(node.fillColor);
  const badge = spec?.kind === 'badge' ? (custom || spec.color) : '';
  const boundary = spec?.kind === 'boundary' || spec?.kind === 'frame' || isFrame(node);
  if (badge) return { fill: badge, stroke: ink, font: contrastInk(badge) };
  if (custom) return { fill: custom, stroke: ink, font: contrastInk(custom) };
  if (boundary && spec?.color && node.fill !== 'solid') {
    const fill = mix(theme.paper, spec.color, 0.16);
    return { fill, stroke: spec.color, font: contrastInk(fill) };
  }
  if (node.fill === 'solid') return { fill: theme.ink, stroke: ink, font: theme.paper };
  if (node.fill === 'tint') return { fill: theme.panel, stroke: ink, font: ink };
  return { fill: theme.paper, stroke: ink, font: ink };
}

function fontName(settings) {
  if (settings?.lettering === 'hand') return 'Segoe Print';
  if (settings?.lettering === 'sketch') return 'Segoe Script';
  return 'Arial Narrow';
}

function labelOf(node, settings) {
  return displayLabel(node.label, settings);
}

function mermaidText(value) {
  const text = String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/["|[\]{}()#<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || ' ';
}

function pumlText(value) {
  const text = String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, "'").replace(/\r?\n/g, '\\n').trim();
  return text || ' ';
}

function thickness(weight) {
  if (weight === 'l') return 3;
  if (weight === 's') return 1;
  return 2;
}

function arrowLocals(node) {
  if (node.route === 'elbow') return [[0, 0], [node.w / 2, 0], [node.w / 2, node.h], [node.w, node.h]];
  if (node.route === 'bend') return [[0, 0], [node.w, 0], [node.w, node.h]];
  return [[0, 0], [node.w, node.h]];
}

function arrowPoints(node) {
  const points = arrowLocals(node).map(([x, y]) => worldPoint(node, x, y));
  const start = points[0];
  const end = points[points.length - 1];
  if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) < 2) return [];
  return points;
}

function direction(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return '';
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function parentsOf(nodes) {
  const frames = nodes.filter(isFrame);
  const map = new Map();
  for (const node of nodes) {
    const box = boxOf(node);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const area = box.w * box.h;
    let best = null;
    let bestArea = Infinity;
    for (const frame of frames) {
      if (frame.id === node.id) continue;
      const parent = boxOf(frame);
      if (cx < parent.x || cy < parent.y || cx > parent.x + parent.w || cy > parent.y + parent.h) continue;
      const parentArea = parent.w * parent.h;
      if (parentArea <= area * 1.05) continue;
      if (parentArea < bestArea) {
        best = frame;
        bestArea = parentArea;
      }
    }
    map.set(node.id, best);
  }
  return map;
}

function visualKind(node, spec) {
  if (spec?.kind === 'badge') {
    if (spec.tile === 'hex') return 'hex';
    if (spec.tile === 'round') return 'circle';
    return 'round';
  }
  const kind = spec?.kind || 'rect';
  if (kind === 'queue' || kind === 'slant') return 'para';
  if (kind === 'delay') return 'trap';
  if (kind === 'cloud' || kind === 'actor') return 'circle';
  if (kind === 'stadium') return 'stadium';
  if (kind === 'round') return 'round';
  if (kind === 'cylinder') return 'cylinder';
  if (kind === 'diamond') return 'diamond';
  if (kind === 'hex') return 'hex';
  return 'rect';
}

function mermaidWrap(kind, label) {
  if (kind === 'cylinder') return `[("${label}")]`;
  if (kind === 'diamond') return `{"${label}"}`;
  if (kind === 'hex') return `{{"${label}"}}`;
  if (kind === 'stadium') return `(["${label}"])`;
  if (kind === 'round') return `("${label}")`;
  if (kind === 'circle') return `(("${label}"))`;
  if (kind === 'para') return `[/"${label}"/]`;
  if (kind === 'trap') return `[/"${label}"\\]`;
  return `["${label}"]`;
}

function mermaidToken(node, id, spec, label, linked) {
  if (node.type === 'arrow') {
    if (node.head === 'none') return `${id}["${label}"]`;
    const points = arrowPoints(node);
    const dir = points.length > 1 ? direction(points[0], points[points.length - 1]) || 'right' : 'right';
    return `${id}<["${label}"]>(${dir})`;
  }
  let kind = visualKind(node, spec);
  if (kind === 'diamond' && linked) kind = 'hex';
  return `${id}${mermaidWrap(kind, label)}`;
}

function nodeStyle(node, spec, theme) {
  const width = `${strokePx(node.weight)}px`;
  if (node.type === 'arrow') {
    const ink = inkOf(node, theme);
    const dashed = node.dashed ? ',stroke-dasharray: 5 5' : '';
    if (node.head === 'none') return `fill:${theme.paper},stroke:${ink},color:${ink},stroke-width:${width}${dashed}`;
    return `fill:${ink},stroke:${ink},color:${contrastInk(ink)},stroke-width:${width}${dashed}`;
  }
  const colors = paintNode(node, spec, theme);
  const dashed = node.dashed ? ',stroke-dasharray: 5 5' : '';
  return `fill:${colors.fill},stroke:${colors.stroke},color:${colors.font},stroke-width:${width}${dashed}`;
}

function fitSpans(weights, total) {
  const spans = weights.map((weight) => Math.max(1, Math.round(weight)));
  let sum = spans.reduce((totalSpan, span) => totalSpan + span, 0);
  while (sum > total) {
    const index = spans.reduce((best, span, item) => (span > spans[best] ? item : best), 0);
    if (spans[index] <= 1) break;
    spans[index] -= 1;
    sum -= 1;
  }
  while (sum < total) {
    const index = spans.reduce((best, span, item) => (span >= spans[best] ? item : best), 0);
    spans[index] += 1;
    sum += 1;
  }
  return spans;
}

function mermaidBands(items) {
  const bands = [];
  const sorted = [...items].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  for (const item of sorted) {
    const band = bands.find((entry) => {
      const overlap = Math.min(item.box.y + item.box.h, entry.bottom) - Math.max(item.box.y, entry.top);
      return overlap > Math.min(item.box.h, entry.bottom - entry.top) * 0.35;
    });
    if (band) {
      band.items.push(item);
      band.top = Math.min(band.top, item.box.y);
      band.bottom = Math.max(band.bottom, item.box.y + item.box.h);
    } else {
      bands.push({ top: item.box.y, bottom: item.box.y + item.box.h, items: [item] });
    }
  }
  return bands;
}

function mermaidStacks(items) {
  const stacks = [];
  const sorted = [...items].sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
  for (const item of sorted) {
    const stack = stacks.find((entry) => {
      const overlap = Math.min(item.box.x + item.box.w, entry.right) - Math.max(item.box.x, entry.left);
      return overlap > Math.min(item.box.w, entry.right - entry.left) * 0.3;
    });
    if (stack) {
      stack.items.push(item);
      stack.left = Math.min(stack.left, item.box.x);
      stack.right = Math.max(stack.right, item.box.x + item.box.w);
    } else {
      stacks.push({ left: item.box.x, right: item.box.x + item.box.w, items: [item] });
    }
  }
  for (const stack of stacks) stack.items.sort((a, b) => a.box.y - b.box.y);
  return stacks;
}

function mermaidLink(from, to, edge, label) {
  const dashed = Boolean(edge.dashed);
  const arrow = edge.arrow || 'end';
  if (arrow === 'both') {
    return label
      ? `${from} ${dashed ? '<-.' : '<--'} "${label}" ${dashed ? '.->' : '-->'} ${to}`
      : `${from} ${dashed ? '<-.->' : '<-->'} ${to}`;
  }
  if (arrow === 'none') {
    return label
      ? `${from} ${dashed ? '-.' : '--'} "${label}" ${dashed ? '.-' : '---'} ${to}`
      : `${from} ${dashed ? '-.-' : '---'} ${to}`;
  }
  return label
    ? `${from} ${dashed ? '-.' : '--'} "${label}" ${dashed ? '.->' : '-->'} ${to}`
    : `${from} ${dashed ? '-.->' : '-->'} ${to}`;
}

function mermaidItems(parentId, ctx) {
  return ctx.nodes
    .filter((node) => (ctx.parents.get(node.id)?.id || null) === parentId)
    .map((node) => {
      const spec = symbolById(node.type);
      const label = mermaidText(labelOf(node, ctx.settings));
      return {
        node,
        mid: ctx.ids.get(node.id),
        label,
        token: mermaidToken(node, ctx.ids.get(node.id), spec, label, ctx.linked.has(node.id)),
        box: boxOf(node),
        composite: isFrame(node) && ctx.nodes.some((other) => ctx.parents.get(other.id)?.id === node.id),
      };
    });
}

function emitMermaidItem(item, span, indent, lines, ctx) {
  const pad = '  '.repeat(indent);
  if (!item.composite) {
    lines.push(`${pad}${item.token}${span > 1 ? `:${span}` : ''}`);
    return;
  }
  lines.push(`${pad}block:${item.mid}["${item.label}"]:${span}`);
  emitMermaid(mermaidItems(item.node.id, ctx), innerBox(item.node), indent + 1, lines, ctx);
  lines.push(`${pad}end`);
}

function emitMermaid(items, box, indent, lines, ctx) {
  const pad = '  '.repeat(indent);
  const columns = Math.max(1, Math.min(24, Math.round(box.w / 72) || 1));
  lines.push(`${pad}columns ${columns}`);
  if (!items.length) {
    lines.push(`${pad}space`);
    return;
  }
  const bands = mermaidBands(items);
  bands.forEach((band, index) => {
    if (index > 0 && band.top - bands[index - 1].bottom > 48) lines.push(`${pad}space:${columns}`);
    const stacks = mermaidStacks(band.items);
    const spans = fitSpans(stacks.map((stack) => ((stack.right - stack.left) / Math.max(box.w, 1)) * columns), columns);
    stacks.forEach((stack, stackIndex) => {
      const span = spans[stackIndex];
      if (stack.items.length === 1) {
        emitMermaidItem(stack.items[0], span, indent, lines, ctx);
        return;
      }
      const id = `s${ctx.wrappers.length}`;
      ctx.wrappers.push(id);
      lines.push(`${pad}block:${id}[" "]:${span}`);
      lines.push(`${pad}  columns 1`);
      for (const item of stack.items) emitMermaidItem(item, 1, indent + 1, lines, ctx);
      lines.push(`${pad}end`);
    });
  });
}

function innerBox(frame) {
  const box = boxOf(frame);
  const head = Math.min(28, Math.max(16, box.h * 0.12));
  return {
    x: box.x + 8,
    y: box.y + head,
    w: Math.max(64, box.w - 16),
    h: Math.max(64, box.h - head - 8),
  };
}

export function toMermaid(doc) {
  const sheet = activeSheet(doc);
  const theme = themeOf(doc);
  const settings = doc.settings || {};
  const nodes = liveNodes(sheet);
  const edges = liveEdges(sheet);
  const font = fontName(settings);
  const init = `%%{init: ${JSON.stringify({
    theme: 'base',
    themeVariables: {
      background: theme.paper,
      primaryColor: theme.paper,
      primaryTextColor: theme.ink,
      primaryBorderColor: theme.ink,
      lineColor: theme.ink,
      fontFamily: font,
    },
  })}}%%`;
  if (!nodes.length) return `${init}\nblock\n  columns 1\n  space\n`;
  const ids = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const parents = parentsOf(nodes);
  const linked = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const ctx = { nodes, parents, ids, settings, linked, wrappers: [] };
  const lines = [
    init,
    `%% ${sheet.code || ''} ${sheet.title || ''}`.trim(),
    'block',
  ];
  emitMermaid(mermaidItems(null, ctx), contentBounds(nodes), 1, lines, ctx);
  for (const edge of edges) {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    if (!from || !to) continue;
    const label = mermaidText(displayLabel(edge.label, settings));
    lines.push(`  ${mermaidLink(from, to, edge, label === ' ' ? '' : label)}`);
  }
  for (const node of nodes) {
    lines.push(`  style ${ids.get(node.id)} ${nodeStyle(node, symbolById(node.type), theme)}`);
  }
  for (const id of ctx.wrappers) {
    lines.push(`  style ${id} fill:transparent,stroke:transparent,color:transparent`);
  }
  return `${lines.join('\n')}\n`;
}

function pumlShape(node, spec) {
  if (node.type === 'text' && node.fill !== 'solid' && node.fill !== 'tint' && !hexColor(node.fillColor)) return 'label';
  if (spec?.kind === 'badge') {
    if (spec.tile === 'hex') return 'hexagon';
    if (spec.tile === 'round') return 'usecase';
    return 'rectangle';
  }
  const kind = spec?.kind || 'rect';
  const map = {
    cylinder: 'database',
    diamond: 'hexagon',
    hex: 'hexagon',
    cloud: 'cloud',
    actor: 'actor',
    queue: 'queue',
    layers: 'stack',
    server: 'node',
    container: 'component',
    document: 'file',
    note: 'file',
    callout: 'file',
    bucket: 'storage',
    artifact: 'artifact',
    repo: 'folder',
    stadium: 'usecase',
    round: 'usecase',
    delay: 'usecase',
    cicd: 'component',
    api: 'component',
    worker: 'component',
    card: 'card',
  };
  return map[kind] || 'rectangle';
}

function sameBand(box, row) {
  const overlap = Math.min(box.y + box.h, row.bottom) - Math.max(box.y, row.top);
  if (overlap <= 0) return false;
  return overlap > Math.min(box.h, row.bottom - row.top) * 0.4;
}

function bandRows(items) {
  const rows = [];
  const sorted = [...items].sort((a, b) => boxOf(a).y - boxOf(b).y || boxOf(a).x - boxOf(b).x);
  for (const item of sorted) {
    const box = boxOf(item);
    const row = rows.find((entry) => sameBand(box, entry));
    if (row) {
      row.items.push(item);
      row.top = Math.min(row.top, box.y);
      row.bottom = Math.max(row.bottom, box.y + box.h);
    } else {
      rows.push({ top: box.y, bottom: box.y + box.h, items: [item] });
    }
  }
  for (const row of rows) row.items.sort((a, b) => boxOf(a).x - boxOf(b).x);
  return rows;
}

function pumlPaint(colors, dashed) {
  const fill = colors.fill.replace('#', '');
  const stroke = colors.stroke.replace('#', '');
  const font = colors.font.replace('#', '');
  return `#${fill};line:${stroke}${dashed ? ';line.dashed' : ''};text:${font}`;
}

function pumlLink(from, to, spec, theme) {
  const ink = (hexColor(spec.ink) || theme.ink).replace('#', '');
  const bits = [`#${ink}`, `thickness=${thickness(spec.weight)}`];
  if (spec.dashed) bits.push('dashed');
  const text = spec.label ? ` : ${spec.label}` : '';
  const dir = spec.dir || '';
  if (spec.arrow === 'both') return `${from} <-[${bits.join(',')}]-> ${to}${text}`;
  if (spec.arrow === 'none') return `${from} -[${bits.join(',')}]${dir}- ${to}${text}`;
  return `${from} -[${bits.join(',')}]${dir}-> ${to}${text}`;
}

function emitPlant(parentId, indent, lines, ctx) {
  const items = [];
  for (const node of ctx.nodes) {
    if ((ctx.parents.get(node.id)?.id || null) !== parentId) continue;
    const ends = ctx.ends.get(node.id);
    if (ends) {
      const start = ends.points[0];
      const finish = ends.points[ends.points.length - 1];
      items.push({ synthetic: true, pid: ends.a, x: start.x, y: start.y, w: 12, h: 12 });
      items.push({ synthetic: true, pid: ends.b, x: finish.x, y: finish.y, w: 12, h: 12 });
    } else {
      items.push(node);
    }
  }
  items.sort((a, b) => boxOf(a).y - boxOf(b).y || boxOf(a).x - boxOf(b).x);
  const pad = '  '.repeat(indent);
  for (const item of items) {
    if (item.synthetic) {
      lines.push(`${pad}label " " as ${item.pid}`);
      continue;
    }
    const id = ctx.ids.get(item.id);
    const spec = symbolById(item.type);
    const nested = isFrame(item) && ctx.nodes.some((other) => ctx.parents.get(other.id)?.id === item.id);
    const shape = nested ? 'rectangle' : pumlShape(item, spec);
    const text = pumlText(labelOf(item, ctx.settings));
    const colors = paintNode(item, spec, ctx.theme);
    if (shape === 'label') {
      lines.push(`${pad}label "<color:${colors.font}>${text}</color>" as ${id}`);
      continue;
    }
    const paint = pumlPaint(colors, item.dashed);
    const head = `${pad}${shape} "${text}" as ${id} ${paint}`;
    if (!nested) {
      lines.push(head);
      continue;
    }
    lines.push(`${head} {`);
    emitPlant(item.id, indent + 1, lines, ctx);
    lines.push(`${pad}}`);
  }
  const rows = bandRows(items);
  for (const row of rows) {
    if (row.items.length < 2) continue;
    lines.push(`${pad}together {`);
    for (let index = 0; index < row.items.length - 1; index += 1) {
      const left = row.items[index].synthetic ? row.items[index].pid : ctx.ids.get(row.items[index].id);
      const right = row.items[index + 1].synthetic ? row.items[index + 1].pid : ctx.ids.get(row.items[index + 1].id);
      lines.push(`${pad}  ${left} -[hidden]- ${right}`);
    }
    lines.push(`${pad}}`);
  }
  for (let index = 0; index < rows.length - 1; index += 1) {
    const above = rows[index].items[0];
    const below = rows[index + 1].items[0];
    const from = above.synthetic ? above.pid : ctx.ids.get(above.id);
    const to = below.synthetic ? below.pid : ctx.ids.get(below.id);
    lines.push(`${pad}${from} -[hidden]down- ${to}`);
  }
}

export function toPlantUml(doc) {
  const sheet = activeSheet(doc);
  const theme = themeOf(doc);
  const settings = doc.settings || {};
  const nodes = liveNodes(sheet);
  const edges = liveEdges(sheet);
  const ids = new Map();
  const ends = new Map();
  let serial = 0;
  for (const node of nodes) {
    if (node.type !== 'arrow') ids.set(node.id, `n${serial++}`);
  }
  for (const node of nodes) {
    if (node.type !== 'arrow') continue;
    const points = arrowPoints(node);
    if (points.length < 2) {
      ids.set(node.id, `n${serial++}`);
      continue;
    }
    ends.set(node.id, { a: `n${serial++}`, b: `n${serial++}`, points });
  }
  const ctx = {
    nodes,
    ids,
    ends,
    parents: parentsOf(nodes),
    settings,
    theme,
  };
  const lines = [
    '@startuml',
    'top to bottom direction',
    'skinparam shadowing false',
    'skinparam roundcorner 0',
    'skinparam linetype polyline',
    `skinparam backgroundColor ${theme.paper}`,
    `skinparam defaultFontName "${fontName(settings)}"`,
    `skinparam defaultFontColor ${theme.ink}`,
    `skinparam ArrowColor ${theme.ink}`,
    `skinparam ArrowFontColor ${theme.ink}`,
    'skinparam nodesep 16',
    'skinparam ranksep 20',
  ];
  emitPlant(null, 0, lines, ctx);
  for (const edge of edges) {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    if (!from || !to) continue;
    lines.push(pumlLink(from, to, {
      ink: edge.ink,
      dashed: edge.dashed,
      arrow: edge.arrow || 'end',
      label: edge.label ? pumlText(displayLabel(edge.label, settings)) : '',
      weight: edge.weight,
    }, theme));
  }
  for (const node of nodes) {
    const end = ends.get(node.id);
    if (!end) continue;
    const points = end.points;
    lines.push(pumlLink(end.a, end.b, {
      ink: node.ink,
      dashed: node.dashed,
      arrow: node.head === 'none' ? 'none' : 'end',
      label: node.label ? pumlText(labelOf(node, settings)) : '',
      weight: node.weight,
      dir: direction(points[0], points[points.length - 1]),
    }, theme));
  }
  lines.push('@enduml');
  return `${lines.join('\n')}\n`;
}
