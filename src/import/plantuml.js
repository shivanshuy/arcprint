import { addEdge, emptyIr, ensureNode } from './build.js';

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function stripComments(text) {
  return stripBom(text)
    .replace(/\/'[\s\S]*?'\//g, '\n')
    .replace(/^\s*'.*$/gm, '');
}

function decode(value) {
  return String(value || '')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/<color:[^>]+>/g, '')
    .replace(/<\/color>/g, '')
    .trim();
}

const SHAPE_KIND = {
  rectangle: 'service',
  node: 'server',
  database: 'database',
  cloud: 'cloud',
  actor: 'actor',
  component: 'container',
  interface: 'api',
  folder: 'folder',
  frame: 'zone',
  package: 'package',
  rectangle_pack: 'zone',
  storage: 'storage',
  queue: 'queue',
  stack: 'stack',
  card: 'card',
  file: 'document',
  artifact: 'artifact',
  hexagon: 'hex',
  usecase: 'usecase',
  label: 'text',
  collections: 'queue',
  agent: 'worker',
  boundary: 'zone',
  control: 'round',
  entity: 'card',
  participant: 'service',
  collections_db: 'database',
};

function kindFromShape(shape) {
  return SHAPE_KIND[String(shape || '').toLowerCase()] || 'service';
}

function parseColorBits(bits) {
  const patch = {};
  const token = String(bits || '').trim();
  if (!token) return patch;
  const hex = token.match(/#([0-9a-fA-F]{6})/);
  if (hex) {
    patch.fillColor = `#${hex[1].toLowerCase()}`;
    patch.fill = 'tint';
  }
  if (/dashed/i.test(token)) patch.dashed = true;
  if (/line:([0-9a-fA-F]{6})/i.test(token)) patch.ink = `#${RegExp.$1.toLowerCase()}`;
  if (/thickness=(\d+)/i.test(token)) {
    const n = Number(RegExp.$1);
    patch.weight = n >= 3 ? 'l' : n <= 1 ? 's' : 'm';
  }
  return patch;
}

function parseArrow(token) {
  const t = token.replace(/\s+/g, '');
  const dashed = /dotted|dashed|\./i.test(t) || t.includes('-.');
  let arrow = 'end';
  if (t.includes('<') && t.includes('>')) arrow = 'both';
  else if (!t.includes('>') && !t.includes('<')) arrow = 'none';
  const hidden = /hidden/i.test(t);
  return { dashed, arrow, hidden };
}

export function splitPlantDocuments(text) {
  const clean = stripBom(text);
  const blocks = [];
  const re = /@start(uml|mindmap|wbs|gantt|salt|json|yaml|ditaa|nwdiag|activity)\b([\s\S]*?)@end\1/gi;
  let match;
  while ((match = re.exec(clean))) {
    blocks.push({ kind: match[1].toLowerCase(), body: match[2], full: match[0] });
  }
  if (!blocks.length && clean.trim()) blocks.push({ kind: 'uml', body: clean, full: clean });
  return blocks;
}

function parseSequence(body, title) {
  const ir = emptyIr(title || 'Sequence');
  ir.direction = 'LR';
  for (const raw of stripComments(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^(skinparam|hide |show |autonumber|==)/i.test(line)) continue;
    const part = line.match(/^(?:actor|participant|boundary|control|entity|database|collections|queue)\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?/i);
    if (part) {
      const label = part[1] || part[2];
      const id = part[3] || label.replace(/\s+/g, '_');
      const kind = line.toLowerCase().startsWith('actor') ? 'actor' : line.toLowerCase().startsWith('database') ? 'database' : 'service';
      ensureNode(ir, id, { label: decode(label), kind });
      continue;
    }
    const note = line.match(/^note\s+(?:left|right|over).*?:\s*(.*)$/i);
    if (note) {
      ensureNode(ir, `note_${ir.nodes.length}`, { label: decode(note[1]), kind: 'note' });
      continue;
    }
    const msg = line.match(/^(\S+)\s*(->|-->|->>|-->>|<->|<-->)\s*(\S+)\s*(?::\s*(.*))?$/);
    if (msg) {
      ensureNode(ir, msg[1]);
      ensureNode(ir, msg[3]);
      addEdge(ir, msg[1], msg[3], { label: decode(msg[4] || ''), dashed: msg[2].includes('--'), arrow: msg[2].includes('<') ? 'both' : 'end' });
    }
  }
  return ir;
}

function parseClass(body, title) {
  const ir = emptyIr(title || 'Class');
  let current = null;
  for (const raw of stripComments(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^(skinparam|hide |show )/i.test(line)) continue;
    const cls = line.match(/^(?:abstract\s+)?class\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?\s*\{?/);
    if (cls) {
      current = cls[3] || cls[1] || cls[2];
      ensureNode(ir, current, { label: decode(cls[1] || cls[2]), kind: 'card' });
      if (!line.includes('{')) current = line.endsWith('{') ? current : null;
      continue;
    }
    if (line === '}') {
      current = null;
      continue;
    }
    if (current && !/(<\|)|(\*)|(o\|)|(\.\.)/.test(line)) {
      const node = ir.nodes.find((item) => item.key === current);
      if (node) node.label = `${node.label}\n${line}`;
      continue;
    }
    const rel = line.match(/^(\S+)\s+([.\-|<o*]+)\s+(\S+)(?:\s*:\s*(.*))?$/);
    if (rel) {
      ensureNode(ir, rel[1], { kind: 'card' });
      ensureNode(ir, rel[3], { kind: 'card' });
      addEdge(ir, rel[1], rel[3], { label: decode(rel[4] || '') });
    }
  }
  return ir;
}

function parseActivity(body, title) {
  const ir = emptyIr(title || 'Activity');
  let last = null;
  let n = 0;
  const add = (label, kind = 'process') => {
    const id = `a${n++}`;
    ensureNode(ir, id, { label, kind });
    if (last) addEdge(ir, last, id);
    last = id;
    return id;
  };
  for (const raw of stripComments(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^(skinparam|startuml|title )/i.test(line)) continue;
    if (/^start$/i.test(line)) {
      last = add('start', 'start');
      continue;
    }
    if (/^stop$/i.test(line) || /^end$/i.test(line)) {
      add('end', 'start');
      continue;
    }
    const action = line.match(/^:(.*);$/);
    if (action) {
      add(decode(action[1]));
      continue;
    }
    const iff = line.match(/^if\s*\((.*)\)/i);
    if (iff) add(decode(iff[1]), 'decision');
  }
  return ir;
}

function parseMindmap(body, title) {
  const ir = emptyIr(title || 'Mindmap');
  ir.direction = 'LR';
  const stack = [{ indent: -1, id: null }];
  for (const raw of stripComments(body).split('\n')) {
    if (!raw.trim() || /^@/.test(raw.trim())) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const label = raw.trim().replace(/^\*+\s*/, '');
    const id = `m${ir.nodes.length}`;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]?.id;
    ensureNode(ir, id, { label: decode(label), kind: 'topic', parent });
    if (parent) addEdge(ir, parent, id, { arrow: 'none' });
    stack.push({ indent, id });
  }
  return ir;
}

function parseGantt(body, title) {
  const ir = emptyIr(title || 'Gantt');
  for (const raw of stripComments(body).split('\n')) {
    const line = raw.trim();
    if (!line || /^(project starts|printscale|saturday|sunday)/i.test(line)) continue;
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = RegExp.$1.trim();
      continue;
    }
    const task = line.match(/^\[(.+)\]/);
    if (task) ensureNode(ir, `g${ir.nodes.length}`, { label: task[1], kind: 'process' });
  }
  return ir;
}

function parseC4(body, title) {
  const ir = emptyIr(title || 'C4');
  const stack = [null];
  for (const raw of stripComments(body).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '}') {
      stack.pop();
      continue;
    }
    const call = line.replace(/\s*\{\s*$/, '').match(/^(\w+)\s*\((.*)\)$/);
    if (!call) continue;
    const args = [];
    let cur = '';
    let q = '';
    for (const char of call[2]) {
      if (q) {
        if (char === q) q = '';
        cur += char;
        continue;
      }
      if (char === '"' || char === "'") {
        q = char;
        cur += char;
        continue;
      }
      if (char === ',') {
        args.push(decode(cur));
        cur = '';
        continue;
      }
      cur += char;
    }
    if (cur.trim()) args.push(decode(cur));
    const name = call[1];
    const parent = stack[stack.length - 1];
    if (/Boundary/i.test(name)) {
      ensureNode(ir, args[0], { label: args[1] || args[0], kind: 'zone', parent });
      if (line.endsWith('{')) stack.push(args[0]);
      continue;
    }
    if (/^Rel/i.test(name) || name === 'BiRel') {
      addEdge(ir, args[0], args[1], { label: args[2] || '', arrow: name === 'BiRel' ? 'both' : 'end' });
      continue;
    }
    const kind = /Person/i.test(name)
      ? 'actor'
      : /Db/i.test(name)
        ? 'database'
        : /Queue/i.test(name)
          ? 'queue'
          : /Ext/i.test(name)
            ? 'cloud'
            : /Container/i.test(name)
              ? 'container'
              : 'service';
    if (args[0]) ensureNode(ir, args[0], { label: args[1] || args[0], kind, parent });
  }
  return ir;
}

function parseComponent(body, title) {
  const ir = emptyIr(title);
  const stack = [null];
  const lines = stripComments(body).split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].trim();
    if (!line) continue;
    if (/^(skinparam|hide |show |!|left to right|top to bottom|scale |caption )/i.test(line)) {
      if (/left to right/i.test(line)) ir.direction = 'LR';
      if (/top to bottom/i.test(line)) ir.direction = 'TB';
      if (/^title\s+(.+)/i.test(line)) ir.title = decode(RegExp.$1);
      continue;
    }
    if (/^title\s+(.+)/i.test(line)) {
      ir.title = decode(RegExp.$1);
      continue;
    }
    if (line === '}') {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (/^together\s*\{/.test(line)) continue;
    const parent = stack[stack.length - 1];
    const shape = line.match(/^(rectangle|node|database|cloud|actor|component|interface|folder|frame|package|storage|queue|stack|card|file|artifact|hexagon|usecase|label|collections|agent|boundary|control|entity)\s+(?:"([^"]*)"|(\([^)]+\)|\S+))\s*(?:as\s+(\S+))?\s*(#.*)?\s*(\{)?$/i);
    if (shape) {
      const label = decode(shape[2] || shape[3]).replace(/^\((.*)\)$/, '$1');
      const id = shape[4] || label.replace(/\W+/g, '_') || `n${ir.nodes.length}`;
      const patch = { label, kind: kindFromShape(shape[1]), parent, ...parseColorBits(shape[5]) };
      ensureNode(ir, id, patch);
      if (shape[6] || line.endsWith('{')) stack.push(id);
      continue;
    }
    const shortComp = line.match(/^\[([^\]]+)\](?:\s+as\s+(\S+))?/);
    if (shortComp) {
      ensureNode(ir, shortComp[2] || shortComp[1].replace(/\W+/g, '_'), { label: decode(shortComp[1]), kind: 'container', parent });
      continue;
    }
    const usecase = line.match(/^\((.+)\)(?:\s+as\s+(\S+))?/);
    if (usecase) {
      const label = decode(usecase[1]).replace(/^\((.*)\)$/, '$1');
      ensureNode(ir, usecase[2] || label.replace(/\W+/g, '_'), { label, kind: 'usecase', parent });
      continue;
    }
    const actor = line.match(/^:(.+):(?:\s+as\s+(\S+))?/);
    if (actor) {
      ensureNode(ir, actor[2] || actor[1].replace(/\W+/g, '_'), { label: decode(actor[1]), kind: 'actor', parent });
      continue;
    }
    const ident = '(?:"[^"]+"|\\[[^\\]]+\\]|\\([^)]+\\)|:[^:]+:|[A-Za-z0-9_$.-]+)';
    const link = line.match(new RegExp(`^(${ident})\\s+([-.<|ox*>#\\[\\]()a-zA-Z0-9,=]+)\\s+(${ident})(?:\\s*:\\s*(.*))?$`));
    if (link) {
      const spec = parseArrow(link[2]);
      if (spec.hidden) continue;
      const from = decode(link[1]).replace(/^\((.*)\)$/, '$1').replace(/^\[(.*)\]$/, '$1');
      const to = decode(link[3]).replace(/^\((.*)\)$/, '$1').replace(/^\[(.*)\]$/, '$1');
      const fromKey = from.replace(/\W+/g, '_') || from;
      const toKey = to.replace(/\W+/g, '_') || to;
      ensureNode(ir, fromKey, {
        label: from,
        parent: parent && !ir.nodes.find((n) => n.key === fromKey) ? parent : undefined,
      });
      ensureNode(ir, toKey, { label: to });
      addEdge(ir, fromKey, toKey, { label: decode(link[4] || ''), dashed: spec.dashed, arrow: spec.arrow });
    }
  }
  return ir;
}

export function parsePlantUml(text, title = 'PlantUML') {
  const blocks = splitPlantDocuments(text);
  const docs = blocks.length ? blocks : [{ kind: 'uml', body: text, full: text }];
  return docs.map((block, index) => {
    const head = block.body.trim();
    let ir;
    if (
      /^\s*sequenceDiagram|^\s*actor |^\s*participant /im.test(head)
      && /->/.test(head)
      && !/\b(rectangle|package|component|usecase|cloud|database|node|queue|storage|folder|frame|interface)\b/i.test(head)
    ) {
      ir = parseSequence(block.body, title);
    } else if (/^\s*class\s+/im.test(head) && /class\s+\S+\s*\{/m.test(head)) {
      ir = parseClass(block.body, title);
    } else if (block.kind === 'mindmap' || /^\s*\*/m.test(head) && block.kind === 'mindmap') {
      ir = parseMindmap(block.body, title);
    } else if (block.kind === 'gantt' || /^\s*\[.+\]\s+lasts/im.test(head)) {
      ir = parseGantt(block.body, title);
    } else if (/Person\(|System\(|Container\(|Rel\(/m.test(head)) {
      ir = parseC4(block.body, title);
    } else if (/^\s*(start|partition |:.*;)/m.test(head) && /@startuml|start\b/.test(block.full)) {
      ir = /rectangle |package |database /i.test(head) ? parseComponent(block.body, title) : parseActivity(block.body, title);
    } else {
      ir = parseComponent(block.body, title);
    }
    if (!ir.nodes.length) ir = parseComponent(block.body, title);
    if (!ir.nodes.length) {
      ensureNode(ir, 'source', { label: block.body.trim().slice(0, 4000), kind: 'note' });
    }
    ir.source = { kind: 'plantuml', text: block.full.trim() };
    if (docs.length > 1 && ir.title === title) ir.title = `${title} ${index + 1}`;
    return ir;
  });
}
