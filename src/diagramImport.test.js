import test from 'node:test';
import assert from 'node:assert/strict';
import { toMermaid, toPlantUml } from './diagramText.js';
import { detectDiagram, extractMarkdownDiagrams, projectFromText } from './diagramImport.js';
import { blankProject } from './model.js';
import { makeNode, symbolById } from './library.js';

function labels(project) {
  return project.sheets.flatMap((sheet) => sheet.nodes.map((node) => node.label.replace(/\s+/g, ' ').trim()));
}

test('detect mermaid, plantuml, json, markdown', () => {
  assert.equal(detectDiagram('flowchart LR\nA-->B', 'x.mmd'), 'mermaid');
  assert.equal(detectDiagram('@startuml\nA --> B\n@enduml', 'x.puml'), 'plantuml');
  assert.equal(detectDiagram('{"sheets":[{"id":"1","nodes":[],"edges":[]}]}', 'x.json'), 'json');
  assert.equal(detectDiagram('```mermaid\nA-->B\n```', 'note.md'), 'markdown');
});

test('flowchart import keeps labels, shapes, and links', () => {
  const doc = projectFromText(`flowchart TB
    subgraph zone [Prod]
      web[Web]
      db[(Orders)]
    end
    user((User)) -->|HTTPS| web
    web -.-> db
  `, 'shop.mmd');
  const text = labels(doc).join(' | ');
  assert.match(text, /Web/);
  assert.match(text, /Orders/);
  assert.match(text, /User/);
  assert.match(text, /Prod/);
  assert.ok(doc.sheets[0].edges.length >= 2);
  assert.equal(doc.sheets[0].source.kind, 'mermaid');
  assert.ok(doc.sheets[0].nodes.some((node) => node.type === 'database'));
});

test('plantuml component import keeps packages and arrows', () => {
  const doc = projectFromText(`@startuml
    left to right direction
    actor "Shopper" as user
    rectangle "Shop" as shop #AABBCC {
      database "Catalog" as db
      [API] as api
    }
    user --> api : browse
    api --> db
    @enduml
  `, 'shop.puml');
  const text = labels(doc).join(' | ');
  assert.match(text, /Shopper/);
  assert.match(text, /Catalog/);
  assert.match(text, /API/);
  assert.ok(doc.sheets[0].edges.some((edge) => edge.label === 'browse'));
  assert.equal(doc.sheets[0].source.kind, 'plantuml');
});

test('sequence, class, C4, and markdown fences', () => {
  const seq = projectFromText(`sequenceDiagram
    actor Alice
    participant Bob
    Alice->>Bob: ping
    Bob-->>Alice: pong
  `);
  assert.ok(seq.sheets[0].nodes.length >= 2);
  assert.ok(seq.sheets[0].edges.length >= 1);

  const cls = projectFromText(`classDiagram
    Animal <|-- Duck
    class Animal {
      +eat()
    }
  `);
  assert.ok(cls.sheets[0].nodes.length >= 2);

  const c4 = projectFromText(`C4Context
    Person(user, "Customer")
    System(shop, "Shop")
    Rel(user, shop, "Buys")
  `);
  assert.match(labels(c4).join(' '), /Customer/);
  assert.ok(c4.sheets[0].edges.length >= 1);

  const md = projectFromText(`# Docs
\`\`\`mermaid
flowchart LR
  A[One] --> B[Two]
\`\`\`
\`\`\`plantuml
@startuml
rectangle "Left" as L
rectangle "Right" as R
L --> R
@enduml
\`\`\`
`, 'arch.md');
  assert.equal(md.sheets.length, 2);
  assert.equal(extractMarkdownDiagrams(`\`\`\`mermaid\nA-->B\n\`\`\``).length, 1);
});

test('block / plantuml round-trip from an Arcprint sheet', () => {
  const specA = symbolById('service');
  const specB = symbolById('database');
  const a = makeNode(specA, 80, 80);
  a.label = 'Web';
  const b = makeNode(specB, 320, 80);
  b.label = 'Orders';
  const project = blankProject();
  project.sheets[0].nodes = [a, b];
  project.sheets[0].edges = [{
    id: 'e1', from: a.id, to: b.id, fromSide: 'right', toSide: 'left',
    fromAt: 0.5, toAt: 0.5, route: 'elbow', arrow: 'end', label: 'SQL', weight: 'm', dashed: false,
  }];
  const mermaid = toMermaid(project);
  const backM = projectFromText(mermaid, 'round.mmd');
  assert.match(labels(backM).join(' | '), /web/i);
  assert.match(labels(backM).join(' | '), /orders/i);

  const plant = toPlantUml(project);
  const backP = projectFromText(plant, 'round.puml');
  assert.match(labels(backP).join(' | '), /web/i);
  assert.match(labels(backP).join(' | '), /orders/i);
});
