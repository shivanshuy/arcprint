# Arcprint

Arcprint is a blueprint-style sketchpad for software architecture diagrams. It runs in the browser and keeps every project in this browser. There is no account and no server.

## Draw

- Place services, databases, queues, gateways, workers, clouds, and the other symbols in the left rail.
- Click a symbol, then click or drag on the sheet. Click the same symbol again to return to select.
- Drag from the small circles on a shape, or use the connector tool, to connect two parts of a system.
- Double-click a shape to edit its label. Double-click empty sheet to drop a text label.
- Switch between blueprint (white on blue) and whiteprint (blue on warm paper).
- Snap, dimension marks, undo, redo, copy, paste, and nudge are on the keys panel (`?`).

## Sheets and projects

- A project can hold several numbered sheets. **New** starts a blank project or adds a template: three-tier web, microservices, an event pipeline, or sign-in.
- **Projects** lists everything saved in this browser. **Open** (or drop a file on the sheet) reads Arcprint JSON, Mermaid (`.mmd`, `.mermaid`), PlantUML (`.puml`, `.plantuml`, `.wsd`, `.iuml`, `.pu`, `.uml`), plain text that contains those dialects, or markdown with `mermaid` / `plantuml` fences.
- Mermaid and PlantUML are placed as native shapes and connectors. Labels, groups, arrows, dashed links, and colors are kept. The original text is stored on the sheet until you edit the drawing.
- Supported Mermaid: flowchart, graph, block, sequence, class, state, ER, C4, architecture, mindmap, gantt, pie, journey, gitGraph, timeline, kanban, sankey, requirement, quadrant, xy chart. Unusual dialects still open as a note so the file is not lost.
- Supported PlantUML: component / deployment boxes, nested packages, usecase, sequence, class, activity, C4, mindmap, gantt. Several `@startuml` blocks become several sheets.
- **Share** puts the whole project in the link after `#`. The browser does not send that part to a server.
- Export the current sheet as PNG, SVG, PDF, Mermaid, or PlantUML, or the whole project as JSON. Mermaid and PlantUML open a preview first so you can see the drawing, edit the text, then copy or download. PlantUML renders in this browser.

## Run it locally

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

The dev server prints a local URL. `npm run build` writes a static site to `dist/`.
