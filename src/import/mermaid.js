import { addEdge, applyGrid, emptyIr, ensureNode } from './build.js';

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function stripInit(text) {
  return stripBom(text).replace(/%%\{[\s\S]*?\}%%/g, '\n');
}

function commentless(text) {
  return stripInit(text)
    .replace(/^\s*%%(?!\{).*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function unwrapQuotes(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text.replace(/^\[|\]$/g, '');
}

function decodeLabel(value) {
  return unwrapQuotes(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, '\n')
    .trim();
}

const SHAPE_KIND = [
  { re: /^\(\(\s*(.*)\s*\)\)$/s, kind: 'circle' },
  { re: /^\(\[\s*(.*)\s*\]\)$/s, kind: 'stadium' },
  { re: /^\(\s*(.*)\s*\)$/s, kind: 'round' },
  { re: /^\{\{\s*(.*)\s*\}\}$/s, kind: 'hex' },
  { re: /^\{\s*(.*)\s*\}$/s, kind: 'diamond' },
  { re: /^\[\[(.*)\]\]$/s, kind: 'process' },
  { re: /^\[\((.*)\)\]$/s, kind: 'database' },
  { re: /^\[\/(.*)\/\]$/s, kind: 'para' },
  { re: /^\[\/(.*)\\\]$/s, kind: 'trap' },
  { re: /^\[\\(.*)\\\]$/s, kind: 'para' },
  { re: /^\[\\(.*)\/\]$/s, kind: 'trap' },
  { re: /^\[>(.*)\]$/s, kind: 'queue' },
  { re: /^>\s*(.*)\s*\]$/s, kind: 'queue' },
  { re: /^\[\s*(.*)\s*\]$/s, kind: 'service' },
];

export function parseNodeShape(raw) {
  const token = String(raw || '').trim();
  if (!token) return { label: '', kind: 'service' };
  if (token.startsWith('<[') && token.includes(']>')) {
    const inner = token.replace(/^<\[/, '').replace(/\]>\(.*\)$/, '').replace(/\]>$/, '');
    return { label: decodeLabel(inner), kind: 'text' };
  }
  for (const item of SHAPE_KIND) {
    const match = token.match(item.re);
    if (match) return { label: decodeLabel(match[1]), kind: item.kind };
  }
  return { label: decodeLabel(token), kind: 'service' };
}

function splitArgs(text) {
  const out = [];
  let current = '';
  let quote = '';
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = '';
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      out.push(decodeLabel(current));
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) out.push(decodeLabel(current));
  return out;
}

function parseStyle(value) {
  const patch = {};
  for (const part of String(value || '').split(',')) {
    const [rawKey, ...rest] = part.split(':');
    const key = rawKey.trim().toLowerCase();
    const val = rest.join(':').trim();
    if (key === 'fill' && /^#?[0-9a-f]{3,8}$/i.test(val.replace(/\s/g, ''))) {
      const hex = val.startsWith('#') ? val : `#${val}`;
      if (hex.length === 4) patch.fillColor = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
      else patch.fillColor = hex.slice(0, 7).toLowerCase();
      patch.fill = 'tint';
    }
    if (key === 'stroke' && val.startsWith('#')) patch.ink = val.slice(0, 7).toLowerCase();
    if (key === 'stroke-dasharray') patch.dashed = true;
    if (key === 'stroke-width') {
      const n = Number.parseFloat(val);
      patch.weight = n >= 2.3 ? 'l' : n <= 1.4 ? 's' : 'm';
    }
  }
  return patch;
}

function applyStyle(ir, id, style) {
  const node = ensureNode(ir, id);
  if (!node) return;
  Object.assign(node, style);
  if (style.fillColor) node.fill = node.fill || 'tint';
}

const LINK_OPS = [
  '<-.->', '<-->', '<==>', 'x--x', 'o--o',
  '-.->', '<-.-', '--->', '<---', '==>', '<==',
  '-->', '<--', '---', '-.-', '===',
  '--o', 'o--', '--x', 'x--',
];

function depthAt(line, index) {
  let depth = 0;
  let quote = '';
  for (let i = 0; i < index; i += 1) {
    const char = line[i];
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if ('[({'.includes(char)) depth += 1;
    if ('])}'.includes(char)) depth = Math.max(0, depth - 1);
  }
  return depth;
}

function findLink(line) {
  const text = line.trim();
  const spoken = text.match(/^(.*?)\s+--\s+(?:"([^"]*)"|'([^']*)'|([^-\s][^]*?))\s+-->\s+(.*)$/);
  if (spoken && depthAt(text, text.lastIndexOf('-->')) === 0) {
    return {
      op: '-->',
      left: spoken[1].trim(),
      right: spoken[5].trim(),
      label: spoken[2] || spoken[3] || spoken[4] || '',
    };
  }
  const labeled = text.match(/^(.*?)\s+([-.=ox<>]+)\s+(?:"([^"]*)"|'([^']*)'|\|([^|]+)\|)\s+([-.=ox<>]+)\s+(.*)$/);
  if (labeled && depthAt(text, labeled[1].length + 1) === 0) {
    return {
      op: `${labeled[2]}>${labeled[6]}`,
      left: labeled[1].trim(),
      right: labeled[7].trim(),
      label: labeled[3] || labeled[4] || labeled[5] || '',
    };
  }
  for (const op of LINK_OPS) {
    let from = 0;
    while (from <= text.length - op.length) {
      const at = text.indexOf(op, from);
      if (at < 0) break;
      if (depthAt(text, at) === 0 && at > 0) {
        return { op, at, left: text.slice(0, at).trim(), right: text.slice(at + op.length).trim() };
      }
      from = at + 1;
    }
  }
  return null;
}

function linkSpec(op, extraLabel = '') {
  const token = op || '';
  const dashed = token.includes('.') || token.includes('-.-');
  let arrow = 'end';
  if (token.includes('<') && token.includes('>')) arrow = 'both';
  else if (!token.includes('>') && !token.includes('<') && !token.includes('o') && !token.includes('x')) arrow = 'none';
  else if (token.endsWith('<') || token.startsWith('<') && !token.includes('>')) arrow = 'end';
  return { dashed, arrow, label: extraLabel };
}

function parseNodeToken(token) {
  const text = token.trim().replace(/:\d+\s*$/, '');
  const shaped = text.match(/^([A-Za-z0-9_~:.-]+|"[^"]+")\s*([\[\(\{<].*)?$/);
  if (!shaped) return { id: text.replace(/\W+/g, '_') || 'n', label: decodeLabel(text), kind: 'service' };
  const id = unwrapQuotes(shaped[1]);
  if (!shaped[2]) return { id, label: id, kind: 'service' };
  const shape = parseNodeShape(shaped[2]);
  return { id, label: shape.label || id, kind: shape.kind };
}

function takeNode(ir, token, parent) {
  const parsed = parseNodeToken(token);
  ensureNode(ir, parsed.id, { label: parsed.label, kind: parsed.kind, parent });
  return parsed.id;
}

function ingestLink(ir, line, parent) {
  const found = findLink(line);
  if (!found) return false;
  let right = found.right;
  let label = found.label || '';
  const pipe = right.match(/^\|([^|]+)\|\s*(.*)$/);
  if (pipe) {
    label = pipe[1];
    right = pipe[2];
  }
  const quoted = right.match(/^"([^"]*)"\s+([-.=ox<>]+)\s+(.*)$/);
  if (quoted) {
    label = quoted[1];
    right = quoted[3];
  }
  const from = takeNode(ir, found.left, parent);
  const to = takeNode(ir, right, parent);
  addEdge(ir, from, to, { ...linkSpec(found.op, label), label });
  return true;
}

function parseFlowchart(body, title) {
  const ir = emptyIr(title);
  ir.direction = 'TB';
  const lines = commentless(body).split('\n');
  const stack = [null];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)?/i);
    if (head) {
      ir.direction = head[1] === 'TD' ? 'TB' : head[1] || 'TB';
      continue;
    }
    if (/^direction\s+(TB|TD|BT|LR|RL)/i.test(line)) {
      ir.direction = RegExp.$1 === 'TD' ? 'TB' : RegExp.$1;
      continue;
    }
    const sub = line.match(/^subgraph\s+(.+)$/i);
    if (sub) {
      let id = sub[1].trim();
      let label = id;
      const named = id.match(/^([A-Za-z0-9_~:-]+)\s*\[\s*(.*)\s*\]$/);
      const titled = id.match(/^([A-Za-z0-9_~:-]+)\s+"([^"]+)"$/);
      if (named) {
        id = named[1];
        label = decodeLabel(named[2]);
      } else if (titled) {
        id = titled[1];
        label = titled[2];
      } else {
        id = unwrapQuotes(id).replace(/\s+/g, '_');
        label = unwrapQuotes(sub[1]);
      }
      ensureNode(ir, id, { label, kind: 'zone', parent: stack[stack.length - 1] });
      stack.push(id);
      continue;
    }
    if (/^end\b/i.test(line)) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (/^(classDef|class |click |linkStyle|style )\b/i.test(line) === false && ingestLink(ir, line, stack[stack.length - 1])) {
      continue;
    }
    const style = line.match(/^style\s+(\S+)\s+(.+)$/i);
    if (style) {
      applyStyle(ir, unwrapQuotes(style[1]), parseStyle(style[2]));
      continue;
    }
    if (/^(classDef|class |click |linkStyle|accTitle|accDescr)\b/i.test(line)) continue;
    takeNode(ir, line.replace(/::$/, ''), stack[stack.length - 1]);
  }
  return ir;
}

function parseBlockBody(lines, start) {
  const items = [];
  let columns = 1;
  let i = start;
  const links = [];
  const styles = [];
  while (i < lines.length) {
    const line = lines[i].trim();
    i += 1;
    if (!line || line.startsWith('%%')) continue;
    if (/^end\b/i.test(line)) break;
    const cols = line.match(/^columns\s+(\d+)/i);
    if (cols) {
      columns = Number(cols[1]) || 1;
      continue;
    }
    const space = line.match(/^space(?::(\d+))?$/i);
    if (space) {
      items.push({ kind: 'space', span: Number(space[1] || columns) });
      continue;
    }
    if (findLink(line) || /--\s+".*"\s+[-.=]/.test(line)) {
      links.push(line);
      continue;
    }
    const style = line.match(/^style\s+(\S+)\s+(.+)$/i);
    if (style) {
      styles.push(style);
      continue;
    }
    const block = line.match(/^block:([A-Za-z0-9_~:-]+)\s*(.*)$/);
    if (block) {
      const rest = block[2] || '';
      const spanMatch = rest.match(/:(\d+)\s*$/);
      const span = spanMatch ? Number(spanMatch[1]) : 1;
      const shapeRaw = rest.replace(/:\d+\s*$/, '').trim();
      const shape = shapeRaw ? parseNodeShape(shapeRaw) : { label: block[1], kind: 'zone' };
      const nested = parseBlockBody(lines, i);
      i = nested.i;
      const ghost = !shape.label.trim();
      items.push({
        kind: 'group',
        id: block[1],
        label: shape.label,
        span,
        columns: nested.columns,
        items: nested.items,
        ghost,
      });
      links.push(...nested.links);
      styles.push(...nested.styles);
      continue;
    }
    const spanMatch = line.match(/:(\d+)\s*$/);
    const span = spanMatch ? Number(spanMatch[1]) : 1;
    const token = line.replace(/:\d+\s*$/, '');
    const parsed = parseNodeToken(token);
    items.push({
      kind: 'node',
      id: parsed.id,
      label: parsed.label,
      nodeKind: parsed.kind,
      span,
    });
  }
  return { items, columns, i, links, styles };
}

function parseBlock(body, title) {
  const ir = emptyIr(title);
  const lines = commentless(body).split('\n').map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => /^(block|block-beta)\b/i.test(line));
  const parsed = parseBlockBody(lines, start + 1);
  applyGrid(ir, { columns: parsed.columns, items: parsed.items });
  for (const line of parsed.links) ingestLink(ir, line, null);
  for (const style of parsed.styles) applyStyle(ir, unwrapQuotes(style[1]), parseStyle(style[2]));
  const walk = (items) => {
    for (const item of items) {
      if (item.kind === 'node') ensureNode(ir, item.id, { label: item.label, kind: item.nodeKind });
      if (item.kind === 'group') {
        if (!item.ghost) ensureNode(ir, item.id, { label: item.label, kind: 'zone' });
        walk(item.items);
      }
    }
  };
  walk(parsed.items);
  const stamp = (items) => {
    for (const item of items) {
      if (item.kind === 'node' || item.kind === 'group') {
        const node = ir.nodes.find((row) => row.key === item.id);
        if (node) {
          item.fill = node.fill;
          item.fillColor = node.fillColor;
          item.ink = node.ink;
          item.dashed = node.dashed;
          item.weight = node.weight;
        }
      }
      if (item.kind === 'group') stamp(item.items);
    }
  };
  stamp(parsed.items);
  ir.direction = 'TB';
  return ir;
}

function parseSequence(body, title) {
  const ir = emptyIr(title || 'Sequence');
  ir.direction = 'LR';
  let parent = null;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^sequenceDiagram/i.test(line) || /^(autonumber|activate|deactivate)\b/i.test(line)) continue;
    const part = line.match(/^(?:participant|actor|boundary|control|entity|database)\s+(\S+)(?:\s+as\s+(.+))?$/i);
    if (part) {
      const kind = line.toLowerCase().startsWith('actor') ? 'actor' : line.toLowerCase().startsWith('database') ? 'database' : 'service';
      ensureNode(ir, part[1], { label: decodeLabel(part[2] || part[1]), kind, parent });
      continue;
    }
    if (/^(loop|alt|opt|par|critical|break|rect)\s+(.*)$/i.test(line)) {
      const id = `grp_${ir.nodes.length}`;
      ensureNode(ir, id, { label: decodeLabel(RegExp.$2 || RegExp.$1), kind: 'zone', parent });
      parent = id;
      continue;
    }
    if (/^else\b/i.test(line)) continue;
    if (/^end\b/i.test(line)) {
      parent = null;
      continue;
    }
    const note = line.match(/^Note\s+(?:left of|right of|over)\s+([^:]+):\s*(.*)$/i);
    if (note) {
      ensureNode(ir, `note_${ir.nodes.length}`, { label: decodeLabel(note[2]), kind: 'note', parent });
      continue;
    }
    const msg = line.match(/^(\S+)\s*(-->>?|->>?|--x|-x|-\))\s*([+-]?\S+)\s*:\s*(.*)$/);
    if (msg) {
      const from = msg[1].replace(/^[+-]/, '');
      const to = msg[3].replace(/^[+-]/, '');
      ensureNode(ir, from, { parent });
      ensureNode(ir, to, { parent });
      addEdge(ir, from, to, { label: decodeLabel(msg[4]), dashed: /--/.test(msg[2]) });
    }
  }
  return ir;
}

function parseClass(body, title) {
  const ir = emptyIr(title || 'Class diagram');
  ir.direction = 'TB';
  let current = null;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^classDiagram/i.test(line)) continue;
    const cls = line.match(/^class\s+(\S+)(?:\s*\{)?$/);
    if (cls) {
      current = cls[1];
      ensureNode(ir, current, { label: current, kind: 'card' });
      if (!line.includes('{')) current = line.endsWith('{') ? current : null;
      if (line.endsWith('{')) current = cls[1];
      continue;
    }
    if (line === '}' ) {
      current = null;
      continue;
    }
    if (current && !/[<|*.o-]{2}/.test(line)) {
      const node = ir.nodes.find((item) => item.key === current);
      if (node) node.label = `${node.label}\n${line}`;
      continue;
    }
    const rel = line.match(/^(\S+)\s+([<|*.o\-]+)\s+(\S+)(?:\s*:\s*(.*))?$/);
    if (rel) {
      ensureNode(ir, rel[1], { kind: 'card' });
      ensureNode(ir, rel[3], { kind: 'card' });
      addEdge(ir, rel[1], rel[3], { label: decodeLabel(rel[4] || rel[2]) });
    }
  }
  return ir;
}

function parseState(body, title) {
  const ir = emptyIr(title || 'State');
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^stateDiagram/.test(line) || line === '[*]') continue;
    const named = line.match(/^state\s+"([^"]+)"\s+as\s+(\S+)/);
    if (named) {
      ensureNode(ir, named[2], { label: named[1], kind: 'stadium' });
      continue;
    }
    const block = line.match(/^state\s+(\S+)\s*\{/);
    if (block) {
      ensureNode(ir, block[1], { kind: 'zone' });
      continue;
    }
    if (line === '}') continue;
    const tr = line.match(/^(\S+)\s*-->\s*(\S+)(?:\s*:\s*(.*))?$/);
    if (tr) {
      const from = tr[1] === '[*]' ? 'start' : tr[1];
      const to = tr[2] === '[*]' ? 'end' : tr[2];
      ensureNode(ir, from, { kind: from === 'start' ? 'start' : 'stadium', label: from });
      ensureNode(ir, to, { kind: to === 'end' ? 'start' : 'stadium', label: to });
      addEdge(ir, from, to, { label: decodeLabel(tr[3] || '') });
    }
  }
  return ir;
}

function parseEr(body, title) {
  const ir = emptyIr(title || 'ER');
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^erDiagram/i.test(line)) continue;
    const rel = line.match(/^(\S+)\s+([|o}{\-]+)\s+(\S+)\s*:\s*(.*)$/);
    if (rel) {
      ensureNode(ir, rel[1], { kind: 'database' });
      ensureNode(ir, rel[3], { kind: 'database' });
      addEdge(ir, rel[1], rel[3], { label: decodeLabel(rel[4]) });
      continue;
    }
    const ent = line.match(/^(\S+)\s*\{/);
    if (ent) ensureNode(ir, ent[1], { kind: 'database' });
  }
  return ir;
}

function parseC4(body, title) {
  const ir = emptyIr(title || 'C4');
  const stack = [null];
  const call = (line) => {
    const match = line.match(/^(\w+)\s*\((.*)\)$/);
    if (!match) return null;
    return { name: match[1], args: splitArgs(match[2]) };
  };
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^C4(Context|Container|Component|Dynamic|Deployment)/i.test(line)) continue;
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = RegExp.$1.trim();
      continue;
    }
    if (line === '}') {
      stack.pop();
      continue;
    }
    const fn = call(line.replace(/\s*\{\s*$/, ''));
    if (!fn) continue;
    const parent = stack[stack.length - 1];
    if (/Boundary$/i.test(fn.name) || fn.name === 'Enterprise_Boundary' || fn.name === 'System_Boundary') {
      ensureNode(ir, fn.args[0], { label: fn.args[1] || fn.args[0], kind: 'zone', parent });
      if (line.endsWith('{')) stack.push(fn.args[0]);
      continue;
    }
    if (/^Rel/i.test(fn.name) || fn.name === 'BiRel') {
      addEdge(ir, fn.args[0], fn.args[1], { label: fn.args[2] || '', arrow: fn.name === 'BiRel' ? 'both' : 'end' });
      continue;
    }
    const kind = /Person/i.test(fn.name)
      ? 'actor'
      : /Db/i.test(fn.name)
        ? 'database'
        : /Queue/i.test(fn.name)
          ? 'queue'
          : /Ext/i.test(fn.name)
            ? 'cloud'
            : /Container/i.test(fn.name)
              ? 'container'
              : 'service';
    if (fn.args[0]) ensureNode(ir, fn.args[0], { label: fn.args[1] || fn.args[0], kind, parent });
    if (line.endsWith('{') && fn.args[0]) stack.push(fn.args[0]);
  }
  return ir;
}

function parseMindmap(body, title) {
  const ir = emptyIr(title || 'Mindmap');
  ir.direction = 'LR';
  const stack = [{ indent: -1, id: null }];
  for (const raw of commentless(body).split('\n')) {
    if (/^mindmap\b/i.test(raw.trim())) continue;
    if (!raw.trim()) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const token = raw.trim();
    const parsed = parseNodeToken(token.replace(/^[-+*]\s*/, ''));
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]?.id;
    ensureNode(ir, parsed.id, { label: parsed.label, kind: parsed.kind === 'service' ? 'topic' : parsed.kind, parent });
    if (parent) addEdge(ir, parent, parsed.id, { arrow: 'none' });
    stack.push({ indent, id: parsed.id });
  }
  return ir;
}

function parseGantt(body, title) {
  const ir = emptyIr(title || 'Gantt');
  ir.direction = 'TB';
  let section = null;
  let x = 0;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^gantt/i.test(line) || /^(dateFormat|axisFormat|excludes|todayMarker)/i.test(line)) continue;
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = RegExp.$1.trim();
      continue;
    }
    if (/^section\s+(.+)/i.test(line)) {
      section = RegExp.$1.trim().replace(/\s+/g, '_');
      ensureNode(ir, section, { label: RegExp.$1.trim(), kind: 'zone' });
      continue;
    }
    const task = line.match(/^(.+?):\s*(.*)$/);
    if (task) {
      const id = `t${ir.nodes.length}`;
      ensureNode(ir, id, { label: task[1].trim(), kind: 'process', parent: section });
      x += 1;
      void x;
    }
  }
  return ir;
}

function parsePie(body, title) {
  const ir = emptyIr(title || 'Pie');
  ir.direction = 'LR';
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^pie\b/i.test(line) || /^showData$/i.test(line)) continue;
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = RegExp.$1.trim();
      continue;
    }
    const slice = line.match(/^"([^"]+)"\s*:\s*([0-9.]+)/) || line.match(/^([^:]+):\s*([0-9.]+)/);
    if (slice) ensureNode(ir, `p${ir.nodes.length}`, { label: `${decodeLabel(slice[1])} (${slice[2]})`, kind: 'card' });
  }
  return ir;
}

function parseJourney(body, title) {
  const ir = emptyIr(title || 'Journey');
  let section = null;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^journey/i.test(line)) continue;
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = RegExp.$1.trim();
      continue;
    }
    if (/^section\s+(.+)/i.test(line)) {
      section = `s${ir.nodes.length}`;
      ensureNode(ir, section, { label: RegExp.$1.trim(), kind: 'zone' });
      continue;
    }
    const step = line.match(/^(.+?):\s*(.*)$/);
    if (step) ensureNode(ir, `j${ir.nodes.length}`, { label: step[1].trim(), kind: 'process', parent: section });
  }
  return ir;
}

function parseGit(body, title) {
  const ir = emptyIr(title || 'Git graph');
  ir.direction = 'LR';
  let last = null;
  let n = 0;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^gitGraph/i.test(line)) continue;
    const commit = line.match(/^commit(?:\s+id:\s*"([^"]+)")?/i);
    if (commit) {
      const id = `c${n++}`;
      ensureNode(ir, id, { label: commit[1] || `commit ${n}`, kind: 'round' });
      if (last) addEdge(ir, last, id);
      last = id;
      continue;
    }
    const br = line.match(/^branch\s+(\S+)/i);
    if (br) ensureNode(ir, br[1], { kind: 'topic' });
    const mer = line.match(/^merge\s+(\S+)/i);
    if (mer && last) addEdge(ir, mer[1], last, { label: 'merge' });
  }
  return ir;
}

function parseTimeline(body, title) {
  const ir = emptyIr(title || 'Timeline');
  ir.direction = 'LR';
  let section = null;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^timeline/i.test(line)) continue;
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = RegExp.$1.trim();
      continue;
    }
    if (/^section\s+(.+)/i.test(line)) {
      section = `s${ir.nodes.length}`;
      ensureNode(ir, section, { label: RegExp.$1.trim(), kind: 'zone' });
      continue;
    }
    ensureNode(ir, `tl${ir.nodes.length}`, { label: line.replace(/^:\s*/, ''), kind: 'process', parent: section });
  }
  return ir;
}

function parseKanban(body, title) {
  const ir = emptyIr(title || 'Kanban');
  ir.direction = 'LR';
  let column = null;
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^kanban/i.test(line)) continue;
    if (!line.startsWith('[') && !line.includes(':') && !/^kanban/i.test(line)) {
      column = line.replace(/\[$/, '').trim() || `col${ir.nodes.length}`;
      ensureNode(ir, column.replace(/\W+/g, '_') || `col${ir.nodes.length}`, { label: column, kind: 'zone' });
      continue;
    }
    if (column) {
      const parent = column.replace(/\W+/g, '_') || column;
      ensureNode(ir, `k${ir.nodes.length}`, { label: line.replace(/^\[|\]$/g, ''), kind: 'card', parent });
    }
  }
  return ir;
}

function parseSankey(body, title) {
  const ir = emptyIr(title || 'Sankey');
  ir.direction = 'LR';
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^sankey/i.test(line)) continue;
    const parts = line.split(',').map((part) => part.trim());
    if (parts.length >= 2) {
      ensureNode(ir, parts[0], { kind: 'process' });
      ensureNode(ir, parts[1], { kind: 'process' });
      addEdge(ir, parts[0], parts[1], { label: parts[2] || '' });
    }
  }
  return ir;
}

function parseArchitecture(body, title) {
  const ir = emptyIr(title || 'Architecture');
  const stack = [null];
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^architecture/i.test(line)) continue;
    if (line === '}') {
      stack.pop();
      continue;
    }
    const group = line.match(/^group\s+([A-Za-z0-9_~.-]+)(?:\(([^)]*)\))?(?:\s*\[([^\]]*)\])?\s*\{?$/);
    if (group) {
      ensureNode(ir, group[1], { label: decodeLabel(group[3] || group[1]), kind: 'zone', parent: stack[stack.length - 1] });
      if (line.endsWith('{')) stack.push(group[1]);
      continue;
    }
    const svc = line.match(/^service\s+([A-Za-z0-9_~.-]+)(?:\(([^)]*)\))?(?:\s*\[([^\]]*)\])?(?:\s+in\s+(\S+))?$/);
    if (svc) {
      ensureNode(ir, svc[1], {
        label: decodeLabel(svc[3] || svc[1]),
        kind: 'service',
        parent: svc[4] || stack[stack.length - 1],
      });
      continue;
    }
    const junction = line.match(/^junction\s+(\S+)/);
    if (junction) {
      ensureNode(ir, junction[1], { label: junction[1], kind: 'round', parent: stack[stack.length - 1] });
      continue;
    }
    const edge = line.match(/^([A-Za-z0-9_~.-]+)(?::[A-Z]+)?\s+(-->|<--|---)\s+([A-Za-z0-9_~.-]+)(?::[A-Z]+)?$/);
    if (edge) {
      ensureNode(ir, edge[1], { parent: stack[stack.length - 1] });
      ensureNode(ir, edge[3], { parent: stack[stack.length - 1] });
      addEdge(ir, edge[1], edge[3], { arrow: edge[2] === '---' ? 'none' : 'end' });
      continue;
    }
    ingestLink(ir, line, stack[stack.length - 1]);
  }
  return ir;
}

function parseRequirement(body, title) {
  const ir = emptyIr(title || 'Requirements');
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^requirementDiagram/i.test(line)) continue;
    const req = line.match(/^(requirement|element|risk|testCase)\s+"?([^"{]+?)"?\s*\{?$/);
    if (req) {
      const id = req[2].trim().replace(/\s*\{$/, '');
      ensureNode(ir, id, { kind: req[1] === 'element' ? 'component' : 'document' });
      continue;
    }
    const rel = line.match(/^(\S+)\s+-\s+(\w+)\s+->\s+(\S+)/);
    if (rel) addEdge(ir, rel[1], rel[3], { label: rel[2] });
  }
  return ir;
}

function parseQuadrant(body, title) {
  const ir = emptyIr(title || 'Quadrant');
  const zones = ['q1', 'q2', 'q3', 'q4'];
  zones.forEach((id, index) => ensureNode(ir, id, { label: ['NE', 'NW', 'SE', 'SW'][index], kind: 'zone' }));
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^quadrantChart/i.test(line) || /^(title|x-axis|y-axis|quadrant-)/i.test(line)) continue;
    const point = line.match(/^(\S+(?:\s+\S+)*):\s*\[([0-9.]+),\s*([0-9.]+)\]/);
    if (point) {
      const x = Number(point[2]);
      const y = Number(point[3]);
      const q = x >= 0.5 ? (y >= 0.5 ? 'q1' : 'q3') : (y >= 0.5 ? 'q2' : 'q4');
      ensureNode(ir, `p${ir.nodes.length}`, { label: point[1], kind: 'card', parent: q });
    }
  }
  return ir;
}

function parseXy(body, title) {
  const ir = emptyIr(title || 'Chart');
  for (const raw of commentless(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^xychart/i.test(line) || /^(title|x-axis|y-axis|line|bar)/i.test(line) && !line.includes('[')) {
      if (/^title\s+(.+)/i.test(line)) ir.title = RegExp.$1.trim();
      continue;
    }
    const nums = line.match(/\[(.*?)\]/);
    if (nums) {
      nums[1].split(',').forEach((value) => {
        const label = String(value.trim()).replace(/^["']|["']$/g, '');
        if (label) ensureNode(ir, `v${ir.nodes.length}`, { label, kind: 'process' });
      });
    }
  }
  return ir;
}

function firstLineKind(text) {
  const line = commentless(text).split('\n').map((item) => item.trim()).find(Boolean) || '';
  return line;
}

export function detectMermaidKind(text) {
  const head = firstLineKind(text).toLowerCase();
  if (head.startsWith('block')) return 'block';
  if (head.startsWith('sequence')) return 'sequence';
  if (head.startsWith('class')) return 'class';
  if (head.startsWith('state')) return 'state';
  if (head.startsWith('erdiagram')) return 'er';
  if (head.startsWith('c4')) return 'c4';
  if (head.startsWith('mindmap')) return 'mindmap';
  if (head.startsWith('gantt')) return 'gantt';
  if (head.startsWith('pie')) return 'pie';
  if (head.startsWith('journey')) return 'journey';
  if (head.startsWith('gitgraph')) return 'git';
  if (head.startsWith('timeline')) return 'timeline';
  if (head.startsWith('kanban')) return 'kanban';
  if (head.startsWith('sankey')) return 'sankey';
  if (head.startsWith('architecture')) return 'architecture';
  if (head.startsWith('requirement')) return 'requirement';
  if (head.startsWith('quadrant')) return 'quadrant';
  if (head.startsWith('xychart')) return 'xy';
  if (head.startsWith('flowchart') || head.startsWith('graph ') || head.startsWith('graph$')) return 'flow';
  if (/\b(flowchart|graph)\s+(TB|TD|BT|LR|RL)\b/i.test(text)) return 'flow';
  if (/-->|---|-\.->/.test(text)) return 'flow';
  return 'flow';
}

export function parseMermaid(text, title = 'Mermaid') {
  const kind = detectMermaidKind(text);
  const parsers = {
    block: parseBlock,
    sequence: parseSequence,
    class: parseClass,
    state: parseState,
    er: parseEr,
    c4: parseC4,
    mindmap: parseMindmap,
    gantt: parseGantt,
    pie: parsePie,
    journey: parseJourney,
    git: parseGit,
    timeline: parseTimeline,
    kanban: parseKanban,
    sankey: parseSankey,
    architecture: parseArchitecture,
    requirement: parseRequirement,
    quadrant: parseQuadrant,
    xy: parseXy,
    flow: parseFlowchart,
  };
  const ir = (parsers[kind] || parseFlowchart)(text, title);
  ir.source = { kind: 'mermaid', text: stripBom(text) };
  if (!ir.nodes.length && !ir.grid) {
    const fallback = parseFlowchart(text, title);
    if (fallback.nodes.length) fallback.nodes.forEach((node) => ir.nodes.push(node));
    else ensureNode(ir, 'source', { label: stripBom(text).trim().slice(0, 4000), kind: 'note' });
  }
  return ir;
}

export function splitMermaidDocuments(text) {
  const clean = stripBom(text).trim();
  if (!clean) return [];
  const chunks = clean.split(/\n\s*---\s*\n/);
  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}
