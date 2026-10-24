import { isProject, normalizeProject, uid } from './model.js';
import { irToSheet, sheetsToProject } from './import/build.js';
import { parseMermaid, splitMermaidDocuments } from './import/mermaid.js';
import { parsePlantUml } from './import/plantuml.js';

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function baseName(filename) {
  return String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || 'Imported diagram';
}

function extOf(filename) {
  const name = String(filename || '').toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot) : '';
}

export function detectDiagram(text, filename = '') {
  const ext = extOf(filename);
  const body = stripBom(text).trim();
  if (['.puml', '.plantuml', '.wsd', '.iuml', '.pu', '.uml'].includes(ext)) return 'plantuml';
  if (['.mmd', '.mermaid'].includes(ext)) return 'mermaid';
  if (['.md', '.markdown'].includes(ext)) return 'markdown';
  if (['.json', '.arcprint.json'].includes(ext) || ext === '.arcprint') return 'json';
  if (/@start(uml|mindmap|wbs|gantt|salt|json|yaml|nwdiag)\b/i.test(body)) return 'plantuml';
  if (/```(?:mermaid|plantuml|puml)\b/i.test(body)) return 'markdown';
  if (/^(?:flowchart|graph\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|C4|architecture|mindmap|gantt|pie\b|gitGraph|journey|block\b|quadrantChart|requirementDiagram|sankey|kanban|timeline|packet|radar|xyChart)/im.test(body)) {
    return 'mermaid';
  }
  if (body.startsWith('{')) {
    try {
      const raw = JSON.parse(body);
      if (isProject(raw)) return 'json';
    } catch {
      /* fall through */
    }
  }
  if (/-->|---|-\.->/.test(body) && /\[|\(|flowchart|graph /.test(body)) return 'mermaid';
  if (/\b(rectangle|database|actor|component|package)\b/i.test(body) && /(->|-->)/.test(body)) return 'plantuml';
  return '';
}

export function extractMarkdownDiagrams(text) {
  const blocks = [];
  const re = /```(mermaid|plantuml|puml|wsd)\s*\n([\s\S]*?)```/gi;
  let match;
  while ((match = re.exec(text))) {
    const lang = match[1].toLowerCase();
    blocks.push({
      kind: lang === 'mermaid' ? 'mermaid' : 'plantuml',
      text: match[2].trim(),
    });
  }
  return blocks;
}

function projectFromIrs(irs, name) {
  const sheets = irs.filter((ir) => ir && (ir.nodes.length || ir.grid)).map((ir, index) => irToSheet(ir, index + 1));
  if (!sheets.length) {
    throw new Error('No shapes were found in that diagram.');
  }
  return normalizeProject(sheetsToProject(sheets, name));
}

export function projectFromMermaid(text, filename = '') {
  const name = baseName(filename);
  const chunks = splitMermaidDocuments(text);
  const irs = (chunks.length ? chunks : [text]).map((chunk, index) => (
    parseMermaid(chunk, chunks.length > 1 ? `${name} ${index + 1}` : name)
  ));
  return projectFromIrs(irs, name);
}

export function projectFromPlantUml(text, filename = '') {
  const name = baseName(filename);
  const irs = parsePlantUml(text, name);
  return projectFromIrs(irs, name);
}

export function projectFromMarkdown(text, filename = '') {
  const name = baseName(filename);
  const blocks = extractMarkdownDiagrams(text);
  if (!blocks.length) throw new Error('No Mermaid or PlantUML fences in that markdown.');
  const irs = [];
  blocks.forEach((block, index) => {
    const title = `${name} ${index + 1}`;
    if (block.kind === 'mermaid') {
      splitMermaidDocuments(block.text).forEach((chunk) => irs.push(parseMermaid(chunk, title)));
    } else {
      parsePlantUml(block.text, title).forEach((ir) => irs.push(ir));
    }
  });
  return projectFromIrs(irs, name);
}

export function projectFromText(text, filename = '') {
  const kind = detectDiagram(text, filename);
  if (kind === 'json') {
    const raw = JSON.parse(text);
    if (!isProject(raw)) throw new Error('That JSON is not an Arcprint project.');
    return normalizeProject({ ...raw, id: uid() });
  }
  if (kind === 'mermaid') return projectFromMermaid(text, filename);
  if (kind === 'plantuml') return projectFromPlantUml(text, filename);
  if (kind === 'markdown') return projectFromMarkdown(text, filename);
  throw new Error('That file is not Arcprint JSON, Mermaid, or PlantUML.');
}

export const DIAGRAM_FILE_ACCEPT = [
  'application/json',
  '.json',
  '.arcprint.json',
  '.mmd',
  '.mermaid',
  '.puml',
  '.plantuml',
  '.wsd',
  '.iuml',
  '.pu',
  '.uml',
  '.txt',
  '.md',
  '.markdown',
  'text/plain',
  'text/markdown',
].join(',');
