import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function pkg(name) {
  return JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
}

function licenseText(name) {
  return readFileSync(join(root, 'node_modules', name, 'LICENSE'), 'utf8');
}

test('mermaid preview uses the official MIT package', () => {
  const mermaid = pkg('mermaid');
  assert.equal(mermaid.name, 'mermaid');
  assert.equal(mermaid.license, 'MIT');
  assert.match(mermaid.repository.url, /github\.com\/mermaid-js\/mermaid/);
  assert.match(String(mermaid.version), /^12\./);
  assert.match(licenseText('mermaid'), /MIT License/);
});

test('PlantUML preview uses the official MIT browser engine', () => {
  const plantuml = pkg('@plantuml/core');
  assert.equal(plantuml.name, '@plantuml/core');
  assert.equal(plantuml.license, 'MIT');
  assert.match(plantuml.repository.url, /github\.com\/plantuml\/plantuml/);
  assert.match(plantuml.description, /no server and no Java/i);
  assert.match(licenseText('@plantuml/core'), /MIT License/);
  assert.ok(plantuml.exports['./viz-global.js'], 'Graphviz layout must ship with the package');
  assert.ok(plantuml.exports['./themes.js'], 'themes must ship with the package');
});

test('mermaid preview imports the dist build Vite can resolve', () => {
  const src = readFileSync(join(root, 'src', 'mermaidView.js'), 'utf8');
  assert.match(src, /mermaid\/dist\/mermaid\.core\.mjs/);
  assert.doesNotMatch(src, /import\('mermaid'\)/);
});

test('mermaid 12 ships loaders for complex diagram kinds', () => {
  const src = readFileSync(join(root, 'node_modules', 'mermaid', 'dist', 'mermaid.core.mjs'), 'utf8');
  const needed = [
    'flowchart-v2',
    'sequence',
    'classDiagram',
    'stateDiagram',
    'er',
    'c4',
    'gantt',
    'mindmap',
    'block',
    'architecture',
    'requirement',
    'sankey',
  ];
  for (const id of needed) {
    assert.match(src, new RegExp(`id\\d* = "${id}"`), `missing mermaid loader for ${id}`);
    assert.match(src, new RegExp(`chunks/mermaid\\.core/[^"]+\\.mjs`), `missing lazy chunk import`);
  }
});

test('PlantUML engine documents offline Graphviz plus OSS C4 stdlib', () => {
  const readme = readFileSync(join(root, 'node_modules', '@plantuml', 'core', 'README.md'), 'utf8');
  const integration = readFileSync(join(root, 'node_modules', '@plantuml', 'core', 'GITHUB_INTEGRATION.md'), 'utf8');
  assert.match(readme, /viz-global\.js/);
  assert.match(readme, /renderToString/);
  assert.match(integration, /!include <C4\/C4_Context>/);
  assert.match(integration, /plantuml\.github\.io\/plantuml\/js-plantuml/);
});
