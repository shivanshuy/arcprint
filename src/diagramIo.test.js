import test from 'node:test';
import assert from 'node:assert/strict';
import { mermaidOutput, plantUmlDrafts, plantUmlOutput, toMermaid, toMermaidBlock, toPlantUml } from './diagramText.js';
import { DIAGRAM_FILE_ACCEPT, detectDiagram, projectFromText } from './diagramImport.js';
import { blankProject } from './model.js';
import { makeNode, symbolById } from './library.js';

function labels(project) {
  return project.sheets.flatMap((sheet) => (sheet.nodes || []).map((node) => String(node.label || '').replace(/\s+/g, ' ').trim()));
}

function blob(project) {
  return labels(project).join(' | ').toLowerCase();
}

function hasLabel(project, value) {
  assert.match(blob(project), new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

function opens(text, filename, ...need) {
  const doc = projectFromText(text, filename);
  assert.ok(doc.sheets.length >= 1, `no sheets for ${filename}`);
  const joined = blob(doc);
  for (const item of need) {
    assert.match(joined, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${filename} missing ${item} in: ${joined}`);
  }
  return doc;
}

function generatedCanvas() {
  const web = makeNode(symbolById('service'), 80, 80);
  web.label = 'Web';
  const db = makeNode(symbolById('database'), 320, 80);
  db.label = 'Orders';
  const zone = makeNode(symbolById('zone'), 40, 40, { w: 420, h: 180 });
  zone.label = 'Prod';
  const project = blankProject();
  project.sheets[0].nodes = [zone, web, db];
  project.sheets[0].edges = [{
    id: 'e1', from: web.id, to: db.id, fromSide: 'right', toSide: 'left',
    fromAt: 0.5, toAt: 0.5, route: 'elbow', arrow: 'end', label: 'SQL', weight: 'm', dashed: true,
  }];
  return project;
}

test('open accepts mermaid, plantuml, markdown, json, and text extensions', () => {
  assert.equal(detectDiagram('flowchart LR\nA-->B', 'note.txt'), 'mermaid');
  assert.equal(detectDiagram('@startuml\nA --> B\n@enduml', 'seq.wsd'), 'plantuml');
  assert.equal(detectDiagram('@startuml\nA --> B\n@enduml', 'box.iuml'), 'plantuml');
  assert.equal(detectDiagram('@startuml\nA --> B\n@enduml', 'box.pu'), 'plantuml');
  assert.equal(detectDiagram('@startuml\nA --> B\n@enduml', 'box.uml'), 'plantuml');
  assert.equal(detectDiagram('graph TD\nA-->B', 'flow.mermaid'), 'mermaid');
  assert.match(DIAGRAM_FILE_ACCEPT, /\.mmd/);
  assert.match(DIAGRAM_FILE_ACCEPT, /\.puml/);
  assert.match(DIAGRAM_FILE_ACCEPT, /\.wsd/);
  assert.match(DIAGRAM_FILE_ACCEPT, /\.txt/);
  assert.match(DIAGRAM_FILE_ACCEPT, /\.uml/);
});

test('flowchart dialects, shapes, spoken labels, and styles import', () => {
  const doc = opens(`flowchart TB
    subgraph zone [Prod]
      web[Web]
      db[(Orders)]
      job[[Batch]]
      wait[/Wait/]
      delay[\\Hold/]
      q[>Jobs]
    end
    start([Ready]) --> choice{Route?}
    choice -->|HTTPS| web
    user((User)) -- hello --> web
    web -.-> db
    job --- wait
    "User Gateway"[Gateway] --> web
  `, 'shop.mmd', 'web', 'orders', 'prod', 'ready', 'gateway', 'jobs');
  assert.ok(doc.sheets[0].edges.some((edge) => /https/i.test(edge.label)));
  assert.ok(doc.sheets[0].edges.some((edge) => /hello/i.test(edge.label)));
  assert.ok(doc.sheets[0].nodes.some((node) => node.type === 'database'));
  assert.equal(doc.sheets[0].source.kind, 'mermaid');

  opens('graph TD\nA[Left] --> B[Right]', 'legacy.mmd', 'left', 'right');
  opens(`flowchart LR
    A[One]
    style A fill:#f96,stroke:#333
    A --> B[Two]
  `, 'style.mmd', 'one', 'two');
});

test('bom, mermaid init, and multi-document mermaid import', () => {
  const bom = `\uFEFFflowchart LR\nA[Alpha] --> B[Beta]`;
  opens(bom, 'bom.mmd', 'alpha', 'beta');
  const init = `%%{init: {"theme":"base"}}%%\nflowchart LR\nA[One] --> B[Two]`;
  opens(init, 'init.mmd', 'one', 'two');
  const many = `flowchart LR
A[First] --> B[Second]
---
sequenceDiagram
Alice->>Bob: ping
`;
  const doc = projectFromText(many, 'pack.mmd');
  assert.ok(doc.sheets.length >= 2);
  assert.match(blob(doc), /first/);
  assert.match(blob(doc), /alice|bob/i);
});

test('sequence, class, state, er, and c4 mermaid import', () => {
  opens(`sequenceDiagram
    actor Alice
    participant Bob
    Alice->>+Bob: ping
    Bob-->>-Alice: pong
  `, 'seq.mmd', 'alice', 'bob');

  const cls = opens(`classDiagram
    Animal <|-- Duck
    class Animal {
      +eat()
    }
    Animal --> Food : eats
  `, 'class.mmd', 'animal', 'duck');
  assert.ok(cls.sheets[0].edges.length >= 1);

  opens(`stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving : go
    state "On" as Moving
  `, 'state.mmd', 'still', 'on');

  opens(`erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE : contains
  `, 'er.mmd', 'customer', 'order');

  const c4 = opens(`C4Context
    title Shop context
    Person(user, "Customer")
    System_Boundary(shop, "Shop") {
      System(api, "API")
    }
    Rel(user, api, "Buys")
  `, 'c4.mmd', 'customer', 'api');
  assert.ok(c4.sheets[0].edges.length >= 1);
});

test('mindmap, gantt, pie, journey, git, timeline, and kanban mermaid import', () => {
  opens(`mindmap
    root((Plan))
      Origins
        Long history
      Research
  `, 'mind.mmd', 'plan', 'origins');

  opens(`gantt
    title Ship
    dateFormat YYYY-MM-DD
    section Build
    Code :a1, 2026-01-01, 30d
  `, 'gantt.mmd', 'build', 'code');

  opens(`pie title Pets
    "Dogs" : 386
    "Cats" : 85
  `, 'pie.mmd', 'dogs', 'cats');

  opens(`journey
    title Day
    section Morning
      Tea: 5: Me
  `, 'journey.mmd', 'morning', 'tea');

  opens(`gitGraph
    commit id: "one"
    commit id: "two"
    branch develop
    checkout develop
    commit id: "three"
    checkout main
    merge develop
  `, 'git.mmd', 'one', 'two');

  opens(`timeline
    title History
    section 2020
      Launch
  `, 'time.mmd', '2020', 'launch');

  opens(`kanban
    Todo
      [Write spec]
    Done
      [Ship]
  `, 'kanban.mmd', 'todo', 'write spec', 'ship');
});

test('architecture, sankey, requirement, quadrant, and xy mermaid import', () => {
  const arch = opens(`architecture-beta
    group api(cloud)[API]
    service web(server)[Web] in api
    service db(database)[Orders] in api
    web:R --> db:L
  `, 'arch.mmd', 'api', 'web', 'orders');
  assert.ok(arch.sheets[0].edges.length >= 1);

  opens(`sankey-beta
    Source,Target,Value
    Farm,Market,40
  `, 'sankey.mmd', 'farm', 'market');

  opens(`requirementDiagram
    requirement test_req {
      id: 1
      text: the test
    }
    element test_entity {
      type: simulation
    }
    test_entity - satisfies -> test_req
  `, 'req.mmd', 'test_req', 'test_entity');

  opens(`quadrantChart
    title Reach
    x-axis Low --> High
    y-axis Low --> High
    Campaign A: [0.3, 0.6]
  `, 'quad.mmd', 'campaign a');

  opens(`xychart-beta
    title Sales
    x-axis [jan, feb, mar]
    bar [5000, 6000, 7500]
  `, 'xy.mmd', '5000');
});

test('unknown mermaid dialects still open as a note', () => {
  const doc = projectFromText(`packet-beta
0-15: "Source"
16-31: "Dest"
`, 'packet.mmd');
  assert.ok(doc.sheets[0].nodes.length >= 1);
  assert.equal(doc.sheets[0].source.kind, 'mermaid');
});

test('plantuml component, deployment, usecase, and directed arrows import', () => {
  const doc = opens(`@startuml
left to right direction
actor "Shopper" as user
rectangle "Shop" as shop #AABBCC {
  database "Catalog" as db
  [API] as api
  queue "Jobs" as jobs
  storage "S3" as s3
  cloud "AWS" as aws
  node "Host" as host {
    artifact "App" as app
  }
}
user --> api : browse
api -down-> db : SQL
api ..> jobs
api -[#ee4455]-> s3
@enduml
`, 'shop.puml', 'shopper', 'catalog', 'api', 'jobs', 's3', 'aws', 'app');
  assert.ok(doc.sheets[0].edges.some((edge) => /browse/i.test(edge.label)));
  assert.equal(doc.sheets[0].source.kind, 'plantuml');

  opens(`@startuml
left to right direction
actor Guest as guest
usecase (Login) as UC1
guest --> UC1
@enduml
`, 'use.puml', 'guest', 'login');
});

test('plantuml sequence, class, activity, c4, mindmap, and gantt import', () => {
  opens(`@startuml
actor User
participant "Web" as web
User -> web : GET
web --> User : HTML
@enduml
`, 'seq.puml', 'user', 'web');

  opens(`@startuml
class Animal {
  +eat()
}
class Duck
Animal <|-- Duck
@enduml
`, 'class.puml', 'animal', 'duck');

  opens(`@startuml
start
:Collect;
if (Ready?) then (yes)
:Ship;
endif
stop
@enduml
`, 'act.puml', 'collect', 'ship');

  opens(`@startuml
!include <C4/C4_Context>
Person(user, "Customer")
System(shop, "Shop")
Rel(user, shop, "Buys")
@enduml
`, 'c4.puml', 'customer', 'shop');

  opens(`@startmindmap
* Plan
** Origins
@endmindmap
`, 'mind.puml', 'plan', 'origins');

  opens(`@startgantt
[Prototype] lasts 10 days
[Build] lasts 20 days
@endgantt
`, 'gantt.puml', 'prototype', 'build');
});

test('multiple plantuml blocks and markdown fences import', () => {
  const doc = projectFromText(`@startuml
rectangle "Left" as L
rectangle "Right" as R
L --> R
@enduml
@startuml
actor A
participant B
A -> B : hi
@enduml
`, 'two.puml');
  assert.ok(doc.sheets.length >= 2);

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
  hasLabel(md, 'one');
  hasLabel(md, 'left');
});

test('imported mermaid and plantuml export the original file text', () => {
  const mermaid = `sequenceDiagram
    Alice->>Bob: ping
`;
  const mdoc = projectFromText(mermaid, 'talk.mmd');
  assert.equal(mermaidOutput(mdoc).replace(/\r\n/g, '\n').trim(), mermaid.trim());

  const plant = `@startuml
actor User
User -> Web : GET
@enduml`;
  const pdoc = projectFromText(plant, 'talk.puml');
  assert.equal(plantUmlOutput(pdoc).replace(/\r\n/g, '\n').trim(), plant.trim());
});

test('canvas mermaid export is a flowchart mermaid editors can open', () => {
  const project = generatedCanvas();
  const mermaid = toMermaid(project);
  assert.match(mermaid, /^%% /);
  assert.match(mermaid, /^flowchart /m);
  assert.doesNotMatch(mermaid, /%%\{init:/);
  assert.doesNotMatch(mermaid, /<\[\" \"\]>\([a-z]+\):\d/);
  assert.match(mermaid, /-->|-\./);
  const back = projectFromText(mermaid, 'flow.mmd');
  hasLabel(back, 'web');
  hasLabel(back, 'orders');
});

test('canvas plantuml export is a plantuml file editors can open', () => {
  const project = generatedCanvas();
  const drafts = plantUmlDrafts(project);
  assert.equal(drafts.original, '');
  assert.match(drafts.canvas, /@startuml/);
  assert.match(drafts.canvas, /@enduml/);
  assert.match(plantUmlOutput(project), /@startuml/);
});

test('canvas plantuml follows left-to-right sheets instead of forcing top to bottom', () => {
  const across = generatedCanvas();
  const plant = toPlantUml(across);
  assert.match(plant, /left to right direction/);
  assert.doesNotMatch(plant, /top to bottom direction/);
  assert.match(toMermaid(across), /flowchart LR/);

  const tall = blankProject();
  const web = makeNode(symbolById('service'), 80, 80);
  web.label = 'Web';
  const db = makeNode(symbolById('database'), 80, 280);
  db.label = 'Orders';
  tall.sheets[0].nodes = [web, db];
  tall.sheets[0].edges = [{
    id: 'e1', from: web.id, to: db.id, fromSide: 'bottom', toSide: 'top',
    fromAt: 0.5, toAt: 0.5, route: 'elbow', arrow: 'end', label: 'SQL', weight: 'm',
  }];
  assert.match(toPlantUml(tall), /top to bottom direction/);
  assert.match(toMermaid(tall), /flowchart TB/);
});

test('block mermaid export uses block-beta without empty arrow spans', () => {
  const project = generatedCanvas();
  const block = toMermaidBlock(project);
  assert.match(block, /^block-beta/m);
  assert.doesNotMatch(block, /<\[\" \"\]>\([a-z]+\):\d/);
});

test('canvas mermaid and plantuml export re-open with labels and links', () => {
  const project = generatedCanvas();
  const mermaid = toMermaid(project);
  const backM = projectFromText(mermaid, 'round.mmd');
  hasLabel(backM, 'web');
  hasLabel(backM, 'orders');
  assert.ok(backM.sheets[0].edges.length >= 1);

  const plant = toPlantUml(project);
  const backP = projectFromText(plant, 'round.puml');
  hasLabel(backP, 'web');
  hasLabel(backP, 'orders');
  assert.ok(backP.sheets[0].edges.some((edge) => /sql/i.test(edge.label)));
});

test('empty canvas mermaid and plantuml still open after export', () => {
  const empty = blankProject();
  const mermaid = toMermaid(empty);
  const backM = projectFromText(mermaid, 'empty.mmd');
  assert.ok(backM.sheets.length >= 1);
  const plant = toPlantUml(empty);
  const backP = projectFromText(plant, 'empty.puml');
  assert.ok(backP.sheets.length >= 1);
});

test('cross-format export from imported diagrams still opens', () => {
  const mermaid = projectFromText(`flowchart LR
    web[Web] -->|SQL| db[(Orders)]
  `, 'shop.mmd');
  const plant = toPlantUml(mermaid);
  const asPlant = projectFromText(plant, 'shop.puml');
  hasLabel(asPlant, 'web');
  hasLabel(asPlant, 'orders');

  const uml = projectFromText(`@startuml
rectangle "Web" as web
database "Orders" as db
web --> db : SQL
@enduml
`, 'shop.puml');
  const asMermaid = projectFromText(toMermaid(uml), 'shop.mmd');
  hasLabel(asMermaid, 'web');
  hasLabel(asMermaid, 'orders');
});
