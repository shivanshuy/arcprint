import { SYMBOLS } from '../library.js';
import { PACKS } from '../packs.js';

export const CAPABILITIES = 'I can change the theme, stencil, grid, snap, dims, lettering, and connectors, switch tools and sheets, edit the selection, place a shape, add a template, or export PNG, SVG, PDF, JSON, Mermaid, and PlantUML. Ask for one of those.';

function action(id, title, phrases, done, run, extra = {}) {
  return { id, kind: 'action', title, phrases, done, run, confirm: Boolean(extra.confirm), confirmText: extra.confirmText || '' };
}

function help(id, title, phrases, answer) {
  return { id, kind: 'help', title, phrases, answer, done: answer, confirm: false };
}

export const CARDS = [
  action('theme.blue', 'Blue theme', [
    'switch to the blue theme',
    'blueprint blue sheet',
    'make the page blue',
  ], 'Switched to the blue theme.', (api) => api.theme('blue')),
  action('theme.white', 'White theme', [
    'switch to the white theme',
    'cream whiteprint sheet',
    'use the warm white theme',
  ], 'Switched to the white theme.', (api) => api.theme('white')),
  action('theme.green', 'Green theme', [
    'switch to the green theme',
    'cutting mat green',
    'leather cutting mat color',
  ], 'Switched to the green cutting-mat theme.', (api) => api.theme('green')),
  action('theme.snow', 'Snow theme', [
    'switch to snow',
    'full white sheet',
    'pure white page with black ink',
  ], 'Switched to Snow.', (api) => api.theme('snow')),

  action('library.technical', 'Technical stencil', [
    'use the technical shapes',
    'switch back to the technical stencil',
    'show the generic architecture shapes',
  ], 'Showing the technical stencil.', (api) => api.library('technical')),
  action('library.aws', 'AWS stencil', [
    'show the aws shapes',
    'switch to the aws stencil',
    'cloud icons for aws',
  ], 'Showing the AWS stencil.', (api) => api.library('aws')),
  action('library.azure', 'Azure stencil', [
    'show the azure shapes',
    'switch to the azure stencil',
    'cloud icons for azure',
  ], 'Showing the Azure stencil.', (api) => api.library('azure')),
  action('library.gcp', 'GCP stencil', [
    'show the gcp shapes',
    'switch to the google cloud stencil',
    'cloud icons for gcp',
  ], 'Showing the GCP stencil.', (api) => api.library('gcp')),

  action('grid.on', 'Show grid', [
    'show the grid',
    'turn the sheet grid on',
    'draw with grid lines',
  ], 'Grid lines are on.', (api) => api.setting('showGrid', true)),
  action('grid.off', 'Hide grid', [
    'hide the grid',
    'plain sheet without grid lines',
    'turn the grid off',
  ], 'Grid lines are hidden.', (api) => api.setting('showGrid', false)),
  action('snap.on', 'Snap on', [
    'turn snap on',
    'snap to the grid',
    'enable snapping',
  ], 'Snap is on.', (api) => api.setting('snap', true)),
  action('snap.off', 'Snap off', [
    'turn snap off',
    'stop snapping to the grid',
    'disable snap',
  ], 'Snap is off.', (api) => api.setting('snap', false)),
  action('dims.on', 'Dims on', [
    'show dimensions',
    'turn dims on',
    'show the width and height',
  ], 'Dims are on.', (api) => api.setting('dims', true)),
  action('dims.off', 'Dims off', [
    'hide dimensions',
    'turn dims off',
    'stop showing width and height',
  ], 'Dims are off.', (api) => api.setting('dims', false)),

  action('tool.select', 'Select tool', [
    'select tool',
    'go back to the pointer',
    'use the select tool',
  ], 'Select tool is on.', (api) => api.tool('select')),
  action('tool.hand', 'Pan tool', [
    'pan the sheet',
    'use the hand tool',
    'switch to pan',
  ], 'Pan tool is on.', (api) => api.tool('hand')),
  action('tool.connector', 'Angled connector', [
    'connector tool',
    'draw a connector',
    'switch to the connector',
    'angled connector without an arrow',
  ], 'Angled connector is on.', (api) => api.tool('connector')),
  action('tool.elbow', 'Angled arrow', [
    'angled arrow',
    'elbow with an arrow',
    'angled connector with an arrow',
  ], 'Angled arrow is on.', (api) => api.tool('elbow')),
  action('tool.arrow', 'Arrow tool', [
    'arrow tool',
    'draw an arrow',
    'switch to the arrow tool',
  ], 'Arrow tool is on.', (api) => api.tool('arrow')),

  action('clean.on', 'Clean mode', [
    'clean mode',
    'hide the chrome',
    'show only the sheet',
  ], 'Clean mode is on.', (api) => api.clean(true)),
  action('clean.off', 'Show chrome', [
    'show the chrome',
    'exit clean mode',
    'bring the tools back',
  ], 'Chrome is back.', (api) => api.clean(false)),
  action('view.fit', 'Fit sheet', [
    'fit the sheet',
    'zoom to fit the drawing',
    'fit everything on screen',
  ], 'Fitted the sheet.', (api) => api.fit()),
  action('view.zoom.in', 'Zoom in', [
    'zoom in',
    'make the sheet bigger',
    'zoom closer',
  ], 'Zoomed in.', (api) => api.zoom(1.1)),
  action('view.zoom.out', 'Zoom out', [
    'zoom out',
    'make the sheet smaller',
    'zoom away',
  ], 'Zoomed out.', (api) => api.zoom(1 / 1.1)),
  action('view.zoom.reset', 'Actual size', [
    'zoom to one hundred percent',
    'actual size',
    'reset the zoom',
  ], 'Zoom is 100%.', (api) => api.zoomReset()),
  action('edit.undo', 'Undo', [
    'undo',
    'undo the last change',
    'go back one step',
  ], 'Undid the last change.', (api) => api.undo()),
  action('edit.redo', 'Redo', [
    'redo',
    'redo the last undo',
    'put that change back',
  ], 'Redid the change.', (api) => api.redo()),

  action('panel.projects', 'Projects', [
    'open my projects',
    'show the project list',
    'switch project',
  ], 'Opened Projects.', (api) => api.panel('projects')),
  action('panel.new', 'New', [
    'show the templates',
    'open the new menu',
    'what templates are there',
  ], 'Opened New.', (api) => api.panel('new')),
  action('panel.setup', 'Setup', [
    'open setup',
    'change the grid size',
    'open project settings',
  ], 'Opened Setup.', (api) => api.panel('setup')),
  action('panel.keys', 'Keys', [
    'show the keyboard shortcuts',
    'what are the keys',
    'open the keys panel',
  ], 'Opened Keys.', (api) => api.panel('keys')),
  action('panel.share', 'Share', [
    'share this project',
    'make a share link',
    'open share',
  ], 'Opened Share.', (api) => api.panel('share')),
  action('panel.close', 'Close panel', [
    'close the panel',
    'dismiss the open panel',
    'close that menu',
  ], 'Closed the panel.', (api) => api.panel(null)),
  action('file.open', 'Open a file', [
    'open a project file',
    'import a json project',
    'load a project from disk',
  ], 'Choose an Arcprint JSON file.', (api) => api.openFile()),

  action('sheet.add', 'Add a sheet', [
    'add a blank sheet',
    'new sheet',
    'add another page',
  ], 'Added a blank sheet.', (api) => api.addSheet()),
  action('sheet.clear', 'Clear content', [
    'clear',
    'clean',
    'clear the content',
    'clean the sheet',
    'wipe the drawing',
    'empty the sheet',
  ], 'Cleared the shapes on this sheet.', (api) => api.clearSheet(), {
    confirm: true,
    confirmText: 'Clear every shape on this sheet?',
  }),
  action('sheet.delete', 'Delete sheet', [
    'delete this sheet',
    'remove the current sheet',
    'delete the page',
  ], 'Deleted the sheet.', (api) => api.deleteSheet(), {
    confirm: true,
    confirmText: 'Delete the current sheet?',
  }),
  action('edit.delete', 'Delete selection', [
    'delete the selection',
    'remove the selected shapes',
    'delete what is selected',
  ], 'Deleted the selection.', (api) => api.deleteSelection()),

  action('export.png', 'Export PNG', [
    'export a png',
    'download a png',
    'save the sheet as a png',
  ], 'Exported a PNG.', (api) => api.exportPng()),
  action('export.svg', 'Export SVG', [
    'export an svg',
    'download an svg',
    'save the sheet as svg',
  ], 'Exported an SVG.', (api) => api.exportSvg()),
  action('export.pdf', 'Export PDF', [
    'export a pdf',
    'print to pdf',
    'save the sheet as pdf',
  ], 'Opened print for PDF.', (api) => api.exportPdf()),
  action('export.json', 'Export JSON', [
    'export json',
    'download the project file',
    'save the project as json',
  ], 'Exported JSON.', (api) => api.exportJson()),
  action('export.mermaid', 'Export Mermaid', [
    'export mermaid',
    'download a mermaid diagram',
    'save the sheet as mermaid',
  ], 'Exported Mermaid.', (api) => api.exportMermaid()),
  action('export.plantuml', 'Export PlantUML', [
    'export plantuml',
    'download a plantuml diagram',
    'save the sheet as plantuml',
    'export uml',
  ], 'Exported PlantUML.', (api) => api.exportPlant()),

  action('template.three', 'Three-tier template', [
    'add the three tier web template',
    'insert a three tier diagram',
    'new three tier sheet',
  ], 'Added the three-tier web sheet.', (api) => api.template('three-tier')),
  action('template.aws', 'AWS template', [
    'add the aws web stack',
    'insert an aws diagram',
    'new aws architecture sheet',
  ], 'Added the AWS web stack.', (api) => api.template('aws-web')),
  action('template.azure', 'Azure template', [
    'add the azure web stack',
    'insert an azure diagram',
    'new azure architecture sheet',
  ], 'Added the Azure web stack.', (api) => api.template('azure-web')),
  action('template.gcp', 'GCP template', [
    'add the gcp web stack',
    'insert a gcp diagram',
    'new google cloud architecture sheet',
  ], 'Added the GCP web stack.', (api) => api.template('gcp-web')),
  action('project.new', 'New project', [
    'start a new project',
    'create a blank project',
    'new architecture project',
  ], 'Started a new project. The previous one is still in Projects.', (api) => api.newProject()),
  action('project.copy', 'Copy project', [
    'copy this project',
    'duplicate the project',
    'make a copy of this project',
  ], 'Copied this project.', (api) => api.copyProject()),
  action('project.delete', 'Delete project', [
    'delete this project',
    'remove this project',
    'delete the project from this browser',
  ], 'Deleted this project.', (api) => api.deleteProject(), {
    confirm: true,
    confirmText: 'Delete this project from this browser?',
  }),

  action('grid.10', 'Grid 10', [
    'set the grid to 10',
    'grid size ten pixels',
    'use a fine grid',
  ], 'Grid size is 10.', (api) => api.setting('grid', 10)),
  action('grid.20', 'Grid 20', [
    'set the grid to 20',
    'grid size twenty pixels',
    'use the medium grid',
  ], 'Grid size is 20.', (api) => api.setting('grid', 20)),
  action('grid.25', 'Grid 25', [
    'set the grid to 25',
    'grid size twenty five pixels',
    'use a coarse grid',
  ], 'Grid size is 25.', (api) => api.setting('grid', 25)),
  action('route.elbow', 'Elbow routes', [
    'route connectors with elbows',
    'use elbow routing',
    'default connector is an elbow',
  ], 'New connectors use elbows.', (api) => api.setting('route', 'elbow')),
  action('route.straight', 'Straight routes', [
    'route connectors straight',
    'use straight routing',
    'default connector is straight',
  ], 'New connectors are straight.', (api) => api.setting('route', 'straight')),
  action('route.curve', 'Curved routes', [
    'route connectors with curves',
    'use curved routing',
    'default connector is a curve',
  ], 'New connectors are curved.', (api) => api.setting('route', 'curve')),
  action('letter.tech', 'Technical lettering', [
    'use technical lettering',
    'switch letters to tech',
    'plain technical type',
  ], 'Lettering is technical.', (api) => api.setting('lettering', 'technical')),
  action('letter.hand', 'Hand lettering', [
    'use hand lettering',
    'switch letters to handwriting',
    'handwritten labels',
  ], 'Lettering is hand.', (api) => api.setting('lettering', 'hand')),
  action('caps.on', 'Caps on', [
    'turn caps on',
    'labels in capitals',
    'uppercase the labels',
  ], 'Labels are in capitals.', (api) => api.setting('caps', true)),
  action('caps.off', 'Caps off', [
    'turn caps off',
    'stop using capitals',
    'sentence case labels',
  ], 'Labels are not forced to capitals.', (api) => api.setting('caps', false)),

  action('edit.duplicate', 'Duplicate', [
    'duplicate the selection',
    'duplicate the selected shapes',
    'make a copy beside it',
  ], 'Duplicated the selection.', (api) => api.duplicateSelection()),
  action('edit.copy', 'Copy selection', [
    'copy the selection',
    'copy the selected shapes',
    'copy to the clipboard',
  ], 'Copied the selection.', (api) => api.copySelection()),
  action('edit.paste', 'Paste', [
    'paste',
    'paste the copied shapes',
    'paste onto the sheet',
  ], 'Pasted.', (api) => api.pasteSelection()),
  action('edit.lock', 'Lock selection', [
    'lock the selection',
    'lock the selected shapes',
    'stop these shapes from moving',
  ], 'Locked the selection.', (api) => api.setLocked(true)),
  action('edit.unlock', 'Unlock selection', [
    'unlock the selection',
    'unlock the selected shapes',
    'let these shapes move',
  ], 'Unlocked the selection.', (api) => api.setLocked(false)),
  action('edit.front', 'Bring to front', [
    'bring to front',
    'put the selection in front',
    'raise the selected shapes',
  ], 'Brought the selection to the front.', (api) => api.orderSelection('front')),
  action('edit.back', 'Send to back', [
    'send to back',
    'put the selection behind',
    'lower the selected shapes',
  ], 'Sent the selection to the back.', (api) => api.orderSelection('back')),
  action('nudge.up', 'Nudge up', [
    'nudge up',
    'move the selection up',
    'shift the shapes up',
  ], 'Nudged up.', (api) => api.nudgeSelection('arrowup')),
  action('nudge.down', 'Nudge down', [
    'nudge down',
    'move the selection down',
    'shift the shapes down',
  ], 'Nudged down.', (api) => api.nudgeSelection('arrowdown')),
  action('nudge.left', 'Nudge left', [
    'nudge left',
    'move the selection left',
    'shift the shapes left',
  ], 'Nudged left.', (api) => api.nudgeSelection('arrowleft')),
  action('nudge.right', 'Nudge right', [
    'nudge right',
    'move the selection right',
    'shift the shapes right',
  ], 'Nudged right.', (api) => api.nudgeSelection('arrowright')),

  action('style.weight.s', 'Thin lines', [
    'make the lines thin',
    'small line weight',
    'use a thin stroke',
  ], 'Line weight is thin.', (api) => api.styleSelection({ weight: 's' }, 'mark')),
  action('style.weight.m', 'Medium lines', [
    'make the lines medium',
    'medium line weight',
    'use a medium stroke',
  ], 'Line weight is medium.', (api) => api.styleSelection({ weight: 'm' }, 'mark')),
  action('style.weight.l', 'Thick lines', [
    'make the lines thick',
    'large line weight',
    'use a thick stroke',
  ], 'Line weight is thick.', (api) => api.styleSelection({ weight: 'l' }, 'mark')),
  action('style.text.s', 'Small text', [
    'make the label small',
    'small text size',
    'shrink the lettering',
  ], 'Text size is small.', (api) => api.styleSelection({ text: 's' }, 'node')),
  action('style.text.m', 'Medium text', [
    'make the label medium',
    'medium text size',
    'normal lettering size',
  ], 'Text size is medium.', (api) => api.styleSelection({ text: 'm' }, 'node')),
  action('style.text.l', 'Large text', [
    'make the label large',
    'large text size',
    'bigger lettering',
  ], 'Text size is large.', (api) => api.styleSelection({ text: 'l' }, 'node')),
  action('style.fill.none', 'No fill', [
    'remove the fill',
    'no fill on the shape',
    'hollow shape',
  ], 'Fill is off.', (api) => api.styleSelection({ fill: 'none' }, 'node')),
  action('style.fill.tint', 'Tinted fill', [
    'tint the shape',
    'light fill',
    'use a tinted fill',
  ], 'Fill is tinted.', (api) => api.styleSelection({ fill: 'tint' }, 'node')),
  action('style.fill.solid', 'Solid fill', [
    'solid fill',
    'fill the shape',
    'use a solid fill',
  ], 'Fill is solid.', (api) => api.styleSelection({ fill: 'solid' }, 'node')),
  action('style.dash.on', 'Dashed lines', [
    'make it dashed',
    'use a dashed line',
    'dash the selection',
  ], 'The selection is dashed.', (api) => api.styleSelection({ dashed: true }, 'mark')),
  action('style.dash.off', 'Solid strokes', [
    'make it solid',
    'remove the dashes',
    'use a solid stroke',
  ], 'The selection is solid.', (api) => api.styleSelection({ dashed: false }, 'mark')),
  action('edge.elbow', 'Elbow this connector', [
    'make this connector an elbow',
    'elbow the selected connector',
    'selected line should elbow',
  ], 'The connector uses elbows.', (api) => api.styleSelection({ route: 'elbow' }, 'edge')),
  action('edge.straight', 'Straighten this connector', [
    'make this connector straight',
    'straighten the selected connector',
    'selected line should be straight',
  ], 'The connector is straight.', (api) => api.styleSelection({ route: 'straight' }, 'edge')),
  action('edge.curve', 'Curve this connector', [
    'make this connector curved',
    'curve the selected connector',
    'selected line should curve',
  ], 'The connector is curved.', (api) => api.styleSelection({ route: 'curve' }, 'edge')),
  action('edge.arrow.end', 'Arrow at end', [
    'arrow at the end',
    'one arrowhead on the connector',
    'point the connector one way',
  ], 'The connector has an arrow at the end.', (api) => api.styleSelection({ arrow: 'end' }, 'edge')),
  action('edge.arrow.both', 'Arrows both ends', [
    'arrows at both ends',
    'arrowheads on both sides',
    'two way arrow',
  ], 'The connector has arrows at both ends.', (api) => api.styleSelection({ arrow: 'both' }, 'edge')),
  action('edge.arrow.none', 'No arrow', [
    'remove the arrowhead',
    'no arrow on the connector',
    'plain connector with no arrow',
  ], 'The connector has no arrow.', (api) => api.styleSelection({ arrow: 'none' }, 'edge')),

  action('sheet.next', 'Next sheet', [
    'next sheet',
    'go to the next page',
    'switch to the following sheet',
  ], 'Opened the next sheet.', (api) => api.stepSheet(1)),
  action('sheet.prev', 'Previous sheet', [
    'previous sheet',
    'go to the previous page',
    'switch to the earlier sheet',
  ], 'Opened the previous sheet.', (api) => api.stepSheet(-1)),
  action('file.save', 'Save', [
    'save now',
    'save the project',
    'write the project to this browser',
  ], 'Saved.', (api) => api.save()),
  action('share.copy', 'Copy share link', [
    'copy the share link',
    'copy the project link',
    'put the share url on the clipboard',
  ], 'Copied the share link.', (api) => api.copyShare()),
  action('logo.pick', 'Choose logo', [
    'add a logo',
    'choose a project logo',
    'put a logo in the title block',
  ], 'Choose a logo image.', (api) => api.pickLogo()),
  action('logo.clear', 'Clear logo', [
    'remove the logo',
    'clear the project logo',
    'use the arcprint mark',
  ], 'Cleared the logo.', (api) => api.clearLogo()),
  action('panel.library', 'Shape library', [
    'open the shape library',
    'search the shapes',
    'show the library panel',
  ], 'Opened the library.', (api) => api.panel('library')),

  action('template.deploy', 'Web app deployment', [
    'add the web app deployment diagram',
    'cloudfront waf api gateway load balancer and a microservice',
  ], 'Added the web app deployment sheet.', (api) => api.template('aws-web-deploy')),
  action('template.multizone', 'Multi-zone deployment', [
    'add the multi-zone deployment diagram',
    'aws two availability zones with nat and a standby database',
  ], 'Added the multi-zone deployment sheet.', (api) => api.template('aws-multi-zone')),
  action('template.vpcnat', 'Private servers and NAT', [
    'add the private servers and nat diagram',
    'aws private subnet servers with nat gateways',
  ], 'Added the private servers and NAT sheet.', (api) => api.template('aws-vpc-nat')),
  action('template.serverless', 'Serverless web app', [
    'add the serverless web app diagram',
    'cloudfront api gateway lambda dynamodb',
  ], 'Added the serverless web app sheet.', (api) => api.template('aws-serverless-web')),
  action('template.micro', 'Microservices template', [
    'add the microservices template',
    'insert a microservices diagram',
    'new microservices sheet',
  ], 'Added the microservices sheet.', (api) => api.template('microservices')),
  action('template.events', 'Event pipeline', [
    'add the event pipeline',
    'insert an events diagram',
    'new event pipeline sheet',
  ], 'Added the event pipeline.', (api) => api.template('events')),
  action('template.signin', 'Sign-in template', [
    'add the sign in template',
    'insert a sign in diagram',
    'new authentication sheet',
  ], 'Added the sign-in sheet.', (api) => api.template('signin')),

  help('help.snap', 'What Snap does', [
    'what is snap',
    'what does snap do',
    'explain snapping',
  ], 'Snap is on by default. Clicks, drags, resizes, and arrow-key nudges land on the grid. Turn it off to move by single pixels.'),
  help('help.dims', 'What Dims does', [
    'what is dims',
    'what do dimensions do',
    'explain dims',
  ], 'Dims shows the selected shape’s width and height in pixels. Connectors are not measured. It is off until you turn it on.'),
  help('help.grid', 'Grid and Plain', [
    'what is the difference between grid and plain',
    'what does plain do',
    'explain the sheet grid',
  ], 'Grid draws the sheet lines. Plain hides those lines. Snap still uses the grid size from Setup when the lines are hidden.'),
  help('help.themes', 'Themes', [
    'what themes are there',
    'explain the color themes',
    'what is snow versus white',
  ], 'Blue is the blueprint. White is the warm cream sheet with blue ink. Green is the cutting-mat sheet. Snow is a pure white page with black ink.'),
  help('help.styles', 'Stencils', [
    'what are the stencil styles',
    'explain aws azure and gcp shapes',
    'what is the difference between technical and cloud shapes',
  ], 'Tech is the generic architecture stencil. AWS, Azure, and GCP are separate shape libraries with colored tiles and boundary boxes. Switching stencil does not restyle shapes already on the sheet.'),
  help('help.connect', 'How to connect', [
    'how do I connect two shapes',
    'how do connectors work',
    'how do I link boxes',
  ], 'Choose Connector, then drag from one shape to another. Double-click a shape to rename it.'),
  help('help.lettering', 'Lettering and caps', [
    'what is lettering',
    'what do caps do',
    'explain hand versus technical type',
  ], 'Technical lettering is the plain face. Hand lettering is the written face. Caps draws labels in capitals. Both apply to the whole sheet.'),
  help('help.selection', 'Selection edits', [
    'what can I do with a selection',
    'how do I duplicate or lock',
    'explain front back and nudge',
  ], 'With shapes selected you can duplicate, copy, paste, lock, nudge, change line weight, fill, and dash, or send them to the front or back.'),
  help('help.capabilities', 'What you can ask', [
    'what can you do',
    'what can I ask',
    'help',
  ], CAPABILITIES),
  ...shapeCards(),
];

function shapeCards() {
  const packLabel = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
  const technical = SYMBOLS.map((symbol) => action(
    `shape.${symbol.id}`,
    `${symbol.name} shape`,
    [
      `place a ${symbol.name.toLowerCase()} shape`,
      `arm the ${symbol.name.toLowerCase()} tool`,
      `draw a ${symbol.name.toLowerCase()}`,
      ...(symbol.also || []).map((name) => `place a ${name}`),
    ],
    `${symbol.name} is armed. Click the sheet to place it.`,
    (api) => api.arm('technical', symbol.id),
  ));
  const cloud = Object.entries(PACKS).flatMap(([pack, symbols]) => symbols.map((symbol) => {
    const label = packLabel[pack];
    const name = symbol.name.toLowerCase();
    return action(
      `shape.${symbol.id}`,
      `${label} ${symbol.name}`,
      [
        `place ${label.toLowerCase()} ${name}`,
        `arm the ${label.toLowerCase()} ${name}`,
        `${label.toLowerCase()} ${name} shape`,
      ],
      `${label} ${symbol.name} is armed. Click the sheet to place it.`,
      (api) => api.arm(pack, symbol.id),
    );
  }));
  return [...technical, ...cloud];
}

const byId = new Map(CARDS.map((card) => [card.id, card]));

export function cardById(id) {
  return byId.get(id) || null;
}

export const STARTERS = ['theme.snow', 'grid.off', 'library.aws', 'view.fit'].map((id) => byId.get(id));
