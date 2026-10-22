import { LIBRARIES, TEMPLATES, groupsFor, symbolById, symbolsIn } from './library.js';
import { LETTERS } from './model.js';
import { ShapeArt, ToolGlyph } from './glyphs.jsx';

const SWATCHES = ['#f4f1ea', '#1c1915', '#c23b22', '#d97706', '#2f6f4e', '#1d4e89', '#6d28d9'];

const DRAW = [
  { id: 'select', name: 'Select', key: 'V' },
  { id: 'hand', name: 'Pan', key: 'H' },
  { id: 'connector', name: 'Two-bend connector', key: 'C' },
  { id: 'elbow', name: 'Two-bend arrow', key: 'E' },
  { id: 'bend', name: 'Single-bend connector', key: 'B' },
  { id: 'bendarrow', name: 'Single-bend arrow', key: 'K' },
  { id: 'arrow', name: 'Arrow', key: 'A' },
];

const KEYS = [
  ['V', 'Select'],
  ['H', 'Pan'],
  ['C', 'Two-bend connector'],
  ['E', 'Two-bend arrow'],
  ['B', 'Single-bend connector'],
  ['K', 'Single-bend arrow'],
  ['A', 'Straight arrow'],
  ['R', 'Rotate selection 90°'],
  ['Shift R', 'Rotate selection the other way'],
  ['Esc', 'Back to select'],
  ['Delete', 'Delete selection'],
  ['Ctrl Z', 'Undo'],
  ['Ctrl Shift Z', 'Redo'],
  ['Ctrl D', 'Duplicate'],
  ['Ctrl C / V', 'Copy and paste'],
  ['Ctrl S', 'Save now'],
  ['Ctrl \\', 'Clean mode'],
  ['Arrow keys', 'Nudge selection'],
  ['Shift click', 'Add to selection'],
  ['Double-click', 'Edit a label'],
  ['Wheel', 'Zoom toward the pointer'],
  ['Space drag', 'Pan the sheet'],
  ['?', 'Show these keys'],
];

export default function Chrome(props) {
  const {
    doc, sheet, theme, tool, setTool, selection, clean, setClean, saveState,
    canUndo, canRedo, onUndo, onRedo, panel, setPanel, pins, onTogglePin,
    onPatchNode, onPatchEdge, onPatchNodes, onDuplicate, onDelete, onOrder, onLock, onRotate, onPaint,
    onSheetField, onProjectField, onTheme, onToggleSetting, onLettering, onAddSheet, onPickSheet,
    projects, onOpenProject, onCopyProject, onDeleteProject, confirmId, setConfirmId,
    onNewProject, onTemplate, onOpenClick, shareUrl, onCopyShare, cursor, cam, onZoom, onFit,
    toast, query, setQuery, libGroup, setLibGroup, topRef, onLogo, onClearLogo,
    wide, tiny, rulerCols, rulerRows, onLibrary,
  } = props;

  const library = doc.library || 'technical';
  const groups = groupsFor(library);

  const selectedNodes = sheet.nodes.filter((node) => selection.includes(node.id) && node.id !== '__draft');
  const selectedEdges = sheet.edges.filter((edge) => selection.includes(edge.id));
  const oneNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const oneEdge = selectedEdges.length === 1 && selectedNodes.length === 0 ? selectedEdges[0] : null;
  const sheetIndex = doc.sheets.findIndex((item) => item.id === sheet.id);
  const toolName = DRAW.find((item) => item.id === tool)?.name || symbolById(tool)?.name || 'Select';
  const toolKey = DRAW.find((item) => item.id === tool)?.key || '';

  return (
    <>
      {!clean && (
        <>
          <div className="frame-outer" />
          <div className="frame-inner" />
          <Rulers cols={rulerCols} rows={rulerRows} />
        </>
      )}
      {sheet.nodes.filter((node) => node.id !== '__draft').length === 0 && !clean && (
        <div className="empty">
          <div>
            <h2>EMPTY SHEET</h2>
            <p>
              Pick a shape on the left and click or drag on the sheet. Drag from the small circles
              to connect one part of the system to another. Double-click a shape to rename it.
              New has architecture templates.
            </p>
          </div>
        </div>
      )}
      {!clean && (
        <div className="topbar" ref={topRef}>
          <div className="group brand" title="Your work is saved in this browser.">
            <LogoMark />
            <h1>
              <svg className="logo-word" width="112" height="12" viewBox="0 0 112 12" role="img" aria-label="Arcprint">
                <text x="0" y="10.4" fill="currentColor" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontSize="13" fontWeight="700" letterSpacing="1.5">ARCPRINT</text>
              </svg>
            </h1>
            <span className={`save-state${saveState === 'SAVED' ? '' : ' warn'}`}>{saveState}</span>
          </div>
          <div className="group">
            <button className="btn" disabled={!canUndo} onClick={onUndo}>Undo</button>
            <button className="btn" disabled={!canRedo} onClick={onRedo}>Redo</button>
          </div>
          <div className="group">
            <button className={`btn toggle${doc.settings.snap ? ' on' : ''}`} onClick={() => onToggleSetting('snap')}>Snap</button>
            <button className={`btn toggle${doc.settings.dims ? ' on' : ''}`} onClick={() => onToggleSetting('dims')}>Dims</button>
            <button className={`btn toggle${doc.theme === 'blue' ? ' on' : ''}`} onClick={() => onTheme('blue')}>Blue</button>
            <button className={`btn toggle${doc.theme === 'white' ? ' on' : ''}`} onClick={() => onTheme('white')}>White</button>
            <button className={`btn toggle${doc.theme === 'green' ? ' on' : ''}`} onClick={() => onTheme('green')}>Green</button>
            <button className={`btn toggle${doc.theme === 'snow' ? ' on' : ''}`} onClick={() => onTheme('snow')}>Snow</button>
          </div>
          <div className="group" role="group" aria-label="Font">
            {LETTERS.map((item) => (
              <button
                key={item.id}
                className={`btn toggle${doc.settings.lettering === item.id ? ' on' : ''}`}
                style={{ fontFamily: item.family, textTransform: 'none', letterSpacing: '0.02em' }}
                title={item.label}
                onClick={() => onLettering(item.id)}
              >
                {item.short}
              </button>
            ))}
          </div>
          <div className="group">
            <button className="btn" onClick={() => setPanel(panel === 'projects' ? null : 'projects')}>Projects</button>
            <button className="btn" onClick={() => setPanel(panel === 'new' ? null : 'new')}>New</button>
            <button className="btn" onClick={onOpenClick}>Open</button>
            <button className="btn" onClick={() => setPanel(panel === 'share' ? null : 'share')}>Share</button>
            <span className="group-label split">Export</span>
            <button className="btn" onClick={props.onPng}>PNG</button>
            <button className="btn" onClick={props.onSvg}>SVG</button>
            <button className="btn" onClick={props.onPdf}>PDF</button>
            <button className="btn" onClick={props.onJson}>JSON</button>
            <button className="btn" title="Export Mermaid" onClick={props.onMermaid}>Mermaid</button>
            <button className="btn" title="Export PlantUML" onClick={props.onPlant}>PlantUML</button>
          </div>
          <div className="group">
            <button className="btn" onClick={() => setPanel(panel === 'setup' ? null : 'setup')}>Setup</button>
            <button className="btn" onClick={() => setPanel(panel === 'keys' ? null : 'keys')}>Keys</button>
            <button className={`btn toggle${clean ? ' on' : ''}`} onClick={() => setClean(true)}>Clean</button>
          </div>
        </div>
      )}

      <aside className="palette">
        {clean && <button className="clean-exit" onClick={() => setClean(false)}>Show all</button>}
        <div className="style-pick" role="group" aria-label="Stencil style">
          {LIBRARIES.map((item) => (
            <button
              key={item.id}
              className={library === item.id ? 'on' : ''}
              onClick={() => onLibrary(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div>
          <div className="caption">Draw</div>
          <div className="tools">
            {DRAW.map((item) => (
              <button
                key={item.id}
                className={`tool${tool === item.id ? ' on' : ''}`}
                title={`${item.name} · ${item.key}`}
                onClick={() => setTool(item.id)}
              >
                <ToolGlyph name={item.id} />
              </button>
            ))}
          </div>
        </div>
        <PaletteGroup
          label="Library"
          symbols={pins.map(symbolById).filter(Boolean)}
          tool={tool}
          theme={theme}
          onPick={(id) => setTool(tool === id ? 'select' : id)}
          onOpen={() => setPanel('library')}
          onPin={onTogglePin}
        />
        {groups.map((group) => (
          <PaletteGroup
            key={group.id}
            label={group.label}
            symbols={symbolsIn(library, group.id)}
            tool={tool}
            theme={theme}
            onPick={(id) => setTool(tool === id ? 'select' : id)}
            onOpen={() => { setLibGroup(group.id); setPanel('library'); }}
            onPin={onTogglePin}
          />
        ))}
        <label className="samples">
          <span className="caption">Samples</span>
          <select
            aria-label="Sample diagrams"
            defaultValue=""
            onChange={(event) => {
              const id = event.target.value;
              event.target.value = '';
              if (id) onTemplate(id);
            }}
          >
            <option value="">Choose</option>
            {TEMPLATES.map((template) => (
              <option key={template.id} value={template.id} title={template.description}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      </aside>

      {panel === 'library' && (
        <Library
          library={library}
          theme={theme}
          tool={tool}
          query={query}
          setQuery={setQuery}
          group={libGroup}
          setGroup={setLibGroup}
          pins={pins}
          onClose={() => setPanel(null)}
          onPick={(id) => { setTool(id); setPanel(null); }}
          onPin={onTogglePin}
        />
      )}
      {panel === 'projects' && (
        <section className="panel float projects-panel">
          <header>
            <h2>Projects</h2>
            <button className="close" onClick={() => setPanel(null)}>Close</button>
          </header>
          <div className="proj-list">
            {projects.map((item) => (
              <div key={item.id} className={`proj${item.id === doc.id ? ' on' : ''}`}>
                <button className="proj-open" onClick={() => onOpenProject(item.id)}>
                  <span className="proj-name">{item.name}</span>
                  <span className="proj-meta">{item.sheets} sheet{item.sheets === 1 ? '' : 's'} · {new Date(item.updated).toLocaleDateString()}</span>
                </button>
                <button className="proj-act" onClick={() => onCopyProject(item.id)}>Copy</button>
                <button
                  className="proj-act danger"
                  onClick={() => (confirmId === item.id ? onDeleteProject(item.id) : setConfirmId(item.id))}
                >
                  {confirmId === item.id ? 'Confirm' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
          <p className="hint">Projects stay in this browser. Export JSON to keep a copy.</p>
        </section>
      )}
      {panel === 'new' && (
        <section className="panel float new-panel">
          <header>
            <h2>New</h2>
            <button className="close" onClick={() => setPanel(null)}>Close</button>
          </header>
          <div className="new-body">
            <button className="act" onClick={onNewProject}>Blank project</button>
            <button className="act" onClick={props.onBlankSheet}>Blank sheet</button>
            <div className="caption">Templates</div>
            <div className="templates">
              {TEMPLATES.filter((template) => (template.library || 'technical') === library).map((template) => (
                <button key={template.id} className="template" onClick={() => onTemplate(template.id)}>
                  <TemplatePreview template={template} theme={theme} />
                  <span className="tname">{template.name}</span>
                  <span className="tdesc">{template.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {panel === 'share' && (
        <section className="panel float share-panel">
          <header>
            <h2>Share</h2>
            <button className="close" onClick={() => setPanel(null)}>Close</button>
          </header>
          <div className="share-body">
            <p className="lead">The link holds this project in the address. The browser does not send it to a server.</p>
            <div className="share-row">
              <input className="field" readOnly value={shareUrl || 'Preparing link…'} onFocus={(event) => event.target.select()} />
              <button className="act" onClick={onCopyShare} disabled={!shareUrl}>Copy</button>
            </div>
          </div>
        </section>
      )}
      {panel === 'setup' && (
        <section className="panel float setup">
          <header>
            <h2>Setup</h2>
            <button className="close" onClick={() => setPanel(null)}>Close</button>
          </header>
          <div className="setup-body">
            <label className="caption">Project</label>
            <input className="field" value={doc.name} onChange={(event) => onProjectField({ name: event.target.value })} />
            <div className="seg-row">
              <span className="caption">Lines</span>
              <div className="seg">
                <button className={doc.settings.showGrid !== false ? 'on' : ''} onClick={() => onToggleSetting('showGrid', true)}>Grid</button>
                <button className={doc.settings.showGrid === false ? 'on' : ''} onClick={() => onToggleSetting('showGrid', false)}>Plain</button>
              </div>
            </div>
            <div className="seg-row">
              <span className="caption">Grid</span>
              <div className="seg">
                {[10, 20, 25].map((grid) => (
                  <button key={grid} className={doc.settings.grid === grid ? 'on' : ''} onClick={() => onToggleSetting('grid', grid)}>{grid}</button>
                ))}
              </div>
            </div>
            <div className="seg-row">
              <span className="caption">Route</span>
              <div className="seg">
                {['elbow', 'bend', 'straight', 'curve'].map((route) => (
                  <button key={route} className={doc.settings.route === route ? 'on' : ''} onClick={() => onToggleSetting('route', route)}>{route}</button>
                ))}
              </div>
            </div>
            <div className="seg-row">
              <span className="caption">Font</span>
              <div className="seg">
                {LETTERS.map((item) => (
                  <button
                    key={item.id}
                    className={doc.settings.lettering === item.id ? 'on' : ''}
                    style={{ fontFamily: item.family, textTransform: 'none' }}
                    onClick={() => onLettering(item.id)}
                  >
                    {item.short}
                  </button>
                ))}
              </div>
            </div>
            <div className="seg-row">
              <span className="caption">Caps</span>
              <div className="seg">
                <button className={doc.settings.caps ? 'on' : ''} onClick={() => onToggleSetting('caps', true)}>On</button>
                <button className={!doc.settings.caps ? 'on' : ''} onClick={() => onToggleSetting('caps', false)}>Off</button>
              </div>
            </div>
          </div>
        </section>
      )}
      {panel === 'keys' && (
        <section className="panel float">
          <header>
            <h2>Keys</h2>
            <button className="close" onClick={() => setPanel(null)}>Close</button>
          </header>
          <div className="keys">
            {KEYS.map(([key, label]) => (
              <div className="key-row" key={key}>
                <span className="kbd">{key}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(oneNode || oneEdge || selectedNodes.length > 1) && (
        <Inspector
          node={oneNode}
          edge={oneEdge}
          count={selectedNodes.length + selectedEdges.length}
          onPatchNode={onPatchNode}
          onPatchEdge={onPatchEdge}
          onPatchNodes={onPatchNodes}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onOrder={onOrder}
          onLock={onLock}
          onRotate={onRotate}
          onPaint={onPaint}
        />
      )}

      {!clean && !tiny && (wide ? (
        <div className="title-block">
          <div className="cell span2 bb br project">
            <span className="caption">Project</span>
            <input value={doc.name} onChange={(event) => onProjectField({ name: event.target.value })} />
          </div>
          <div className="cell bb br mono">
            <span className="caption">Date</span>
            <input value={sheet.date} onChange={(event) => onSheetField({ date: event.target.value })} />
          </div>
          <div className="cell bb scale">
            <span className="caption">Grid</span>
            <span className="value">{doc.settings.grid} px</span>
          </div>
          <div className="cell span2 br title">
            <span className="caption">Sheet</span>
            <input value={sheet.title} onChange={(event) => onSheetField({ title: event.target.value })} />
          </div>
          <div className="cell br mono">
            <span className="caption">Number</span>
            <input value={sheet.code} onChange={(event) => onSheetField({ code: event.target.value })} />
          </div>
          <div className="cell maker">
            <button className="logo-pick" onClick={onLogo} title="Put a logo in the title block">
              {doc.logo ? <img src={doc.logo} alt="Project logo" /> : <LogoMark small />}
              <span className="logo-hint">LOGO</span>
            </button>
            {doc.logo && <button className="logo-clear" onClick={onClearLogo} title="Use the Arcprint mark">×</button>}
          </div>
        </div>
      ) : (
        <div className="title-block narrow">
          <span className="caption">{sheet.code} · {sheetIndex + 1} OF {doc.sheets.length}</span>
          <input value={sheet.title} onChange={(event) => onSheetField({ title: event.target.value })} />
        </div>
      ))}

      {!clean && (
        <div className="bottom-left">
          <div className="status">
            <span className="coords">X {Math.round(cursor.x)} · Y {Math.round(cursor.y)}</span>
            <button className="zbtn sep" onClick={() => onZoom(1 / 1.1)} title="Zoom out">−</button>
            <button className="zbtn pct" onClick={() => onZoom(1 / cam.z)} title="100%">{Math.round(cam.z * 100)}%</button>
            <button className="zbtn" onClick={() => onZoom(1.1)} title="Zoom in">+</button>
            <button className="zbtn fit" onClick={onFit}>Fit</button>
            <div className="tool-hint">
              <span className="accent">{toolName}{toolKey ? ` · ${toolKey}` : ''}</span>
              <span className="muted">{hintFor(tool)}</span>
            </div>
          </div>
          <div className="tabs">
            {doc.sheets.length > 1 && (
              <button className="tab-btn danger" onClick={props.onDeleteSheet}>Delete</button>
            )}
            <button
              className="tab-btn clear"
              onClick={props.onClearSheet}
              disabled={!sheet.nodes.length && !sheet.edges.length}
              title="Remove every shape on this sheet"
            >
              Clear
            </button>
            <button className="tab-btn" onClick={onAddSheet}>+ Sheet</button>
            {doc.sheets.map((item) => (
              <button key={item.id} className={`tab${item.id === sheet.id ? ' on' : ''}`} onClick={() => onPickSheet(item.id)}>
                <span className="tab-num">{item.code}</span>
                <span className="tab-name">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      <span className="sr-only" hidden>{theme.paper} {sheetIndex + 1} of {doc.sheets.length}</span>
    </>
  );
}

function PaletteGroup({ label, symbols, tool, theme, onPick, onOpen, onPin }) {
  if (!symbols.length) return null;
  return (
    <div>
      <button className="caption" onClick={onOpen}>{label}</button>
      <div className="tools">
        {symbols.map((symbol) => (
          <button
            key={symbol.id}
            className={`tool${tool === symbol.id ? ' on' : ''}`}
            title={`${symbol.name} · click again to deselect · right-click to pin`}
            onClick={() => onPick(symbol.id)}
            onContextMenu={(event) => { event.preventDefault(); onPin(symbol.id); }}
          >
            <Mini symbol={symbol} theme={theme} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Library({ library, theme, tool, query, setQuery, group, setGroup, pins, onClose, onPick, onPin }) {
  const q = query.trim().toLowerCase();
  const catalog = groupsFor(library);
  const groups = q ? catalog : catalog.filter((item) => item.id === group);
  return (
    <section className="panel float library">
      <header>
        <h2>Library</h2>
        <button className="close" onClick={onClose}>Close</button>
      </header>
      <div className="lib-head">
        <input className="field" type="search" placeholder="Search shapes" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="lib-main">
        <div className="lib-nav">
          <div className="caption">Groups</div>
          {catalog.map((item) => (
            <button key={item.id} className={item.id === group && !q ? 'on' : ''} onClick={() => { setGroup(item.id); setQuery(''); }}>
              {item.label}
              <span className="count">{symbolsIn(library, item.id).length}</span>
            </button>
          ))}
          <button onClick={() => setQuery(pins.length ? '' : query)}>
            Pinned
            <span className="count">{pins.length}</span>
          </button>
        </div>
        <div className="lib-body">
          {(q ? [{ id: 'search', label: 'Results', items: symbolsMatching(q, library) }] : groups.map((item) => ({ ...item, items: symbolsIn(library, item.id) }))).map((section) => (
            <section key={section.id}>
              <div className="caption">{section.label}</div>
              <div className="tiles">
                {section.items.map((symbol) => (
                  <button key={symbol.id} className={`tile${tool === symbol.id ? ' on' : ''}`} onClick={() => onPick(symbol.id)}>
                    <Mini symbol={symbol} theme={theme} />
                    <span>{symbol.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <p className="hint">Right-click a shape on the left rail to pin it under Library. {onPin ? '' : ''}</p>
        </div>
      </div>
    </section>
  );
}

function symbolsMatching(query, library) {
  return groupsFor(library).flatMap((group) => symbolsIn(library, group.id)).filter((symbol) => (
    symbol.name.toLowerCase().includes(query) || symbol.label.toLowerCase().includes(query)
  ));
}

function BendRow({ sharp, onChange }) {
  return (
    <div className="seg-row">
      <span className="caption">Bend</span>
      <div className="seg">
        <button type="button" className={sharp ? '' : 'on'} onClick={() => onChange('round')}>Round</button>
        <button type="button" className={sharp ? 'on' : ''} onClick={() => onChange('sharp')}>Sharp</button>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="seg-row">
      <span className="caption">{label}</span>
      <div className="swatches">
        <button
          type="button"
          className={`swatch theme${!value ? ' on' : ''}`}
          title="Theme color"
          onClick={() => onChange('')}
        />
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch${value === color ? ' on' : ''}`}
            style={{ background: color }}
            title={color}
            onClick={() => onChange(color)}
          />
        ))}
        <input
          type="color"
          aria-label={`${label} color`}
          value={/^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#1c1915'}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function Inspector({ node, edge, count, onPatchNode, onPatchEdge, onPatchNodes, onDuplicate, onDelete, onOrder, onLock, onRotate, onPaint }) {
  const target = node || edge;
  return (
    <aside className="panel inspector">
      <header>
        <h2>{node ? (symbolById(node.type)?.name || node.type) : edge ? 'Connector' : 'Selection'}</h2>
        <span>{count > 1 ? `${count} selected` : node?.locked ? 'Locked' : 'Edit'}</span>
      </header>
      {node && (
        <section>
          <textarea rows={2} value={node.label} onChange={(event) => onPatchNode(node.id, { label: event.target.value })} />
          <div className="geom">
            <Num label="X" value={node.x} onChange={(value) => onPatchNode(node.id, { x: value })} />
            <Num label="Y" value={node.y} onChange={(value) => onPatchNode(node.id, { y: value })} />
            <Num label="W" value={node.w} step={10} onChange={(value) => onPatchNode(node.id, { w: Math.max(28, value) })} />
            <Num label="H" value={node.h} step={10} onChange={(value) => onPatchNode(node.id, { h: Math.max(24, value) })} />
          </div>
        </section>
      )}
      {edge && (
        <section>
          <textarea rows={2} value={edge.label} onChange={(event) => onPatchEdge(edge.id, { label: event.target.value })} placeholder="Label" />
          <div className="seg-row">
            <span className="caption">Route</span>
            <div className="seg">
              {['elbow', 'bend', 'straight', 'curve'].map((route) => (
                <button key={route} className={edge.route === route ? 'on' : ''} onClick={() => onPatchEdge(edge.id, { route })}>{route}</button>
              ))}
            </div>
          </div>
          <div className="seg-row">
            <span className="caption">Arrow</span>
            <div className="seg">
              {['end', 'both', 'none'].map((arrow) => (
                <button key={arrow} className={edge.arrow === arrow ? 'on' : ''} onClick={() => onPatchEdge(edge.id, { arrow })}>{arrow}</button>
              ))}
            </div>
          </div>
          {(edge.route === 'elbow' || edge.route === 'bend') && (
            <BendRow sharp={edge.corner === 'sharp'} onChange={(corner) => onPatchEdge(edge.id, { corner })} />
          )}
        </section>
      )}
      {(target || count > 1) && (
        <section>
          {(node || !edge) && (
            <div className="seg-row">
              <span className="caption">Rotate</span>
              <div className="seg">
                <button onClick={() => onRotate(-90)}>Left</button>
                <button onClick={() => onRotate(90)}>Right</button>
              </div>
            </div>
          )}
          <div className="seg-row">
            <span className="caption">Line</span>
            <div className="seg">
              {['s', 'm', 'l'].map((weight) => (
                <button key={weight} className={target?.weight === weight ? 'on' : ''} onClick={() => (node ? onPatchNode(node.id, { weight }) : edge ? onPatchEdge(edge.id, { weight }) : onPatchNodes({ weight }))}>{weight}</button>
              ))}
            </div>
          </div>
          {node && node.type === 'arrow' && (node.route === 'elbow' || node.route === 'bend') && (
            <BendRow sharp={node.corner === 'sharp'} onChange={(corner) => onPatchNode(node.id, { corner })} />
          )}
          {node && (
            <>
              <div className="seg-row">
                <span className="caption">Text</span>
                <div className="seg">
                  {['s', 'm', 'l'].map((text) => (
                    <button key={text} className={node.text === text ? 'on' : ''} onClick={() => onPatchNode(node.id, { text })}>{text}</button>
                  ))}
                </div>
              </div>
              <div className="seg-row">
                <span className="caption">Fill</span>
                <div className="seg">
                  {['none', 'tint', 'solid'].map((fill) => (
                    <button key={fill} className={node.fill === fill && !node.fillColor ? 'on' : ''} onClick={() => onPatchNode(node.id, { fill, fillColor: '' })}>{fill}</button>
                  ))}
                </div>
              </div>
              {node.type !== 'arrow' && (
                <ColorRow label="Fill" value={node.fillColor} onChange={(fillColor) => onPaint({ fill: fillColor ? 'solid' : 'none', fillColor })} />
              )}
            </>
          )}
          <ColorRow label="Line" value={(node || edge)?.ink || ''} onChange={(ink) => onPaint({ ink })} />
          <div className="seg-row">
            <span className="caption">Dash</span>
            <div className="seg">
              <button className={target?.dashed ? 'on' : ''} onClick={() => (node ? onPatchNode(node.id, { dashed: true }) : edge ? onPatchEdge(edge.id, { dashed: true }) : onPatchNodes({ dashed: true }))}>On</button>
              <button className={target && !target.dashed ? 'on' : ''} onClick={() => (node ? onPatchNode(node.id, { dashed: false }) : edge ? onPatchEdge(edge.id, { dashed: false }) : onPatchNodes({ dashed: false }))}>Off</button>
            </div>
          </div>
          {count > 1 && !edge && (
            <>
              <div className="seg-row">
                <span className="caption">Fill</span>
                <div className="seg">
                  {['none', 'tint', 'solid'].map((fill) => (
                    <button key={fill} onClick={() => onPaint({ fill, fillColor: '' })}>{fill}</button>
                  ))}
                </div>
              </div>
              <ColorRow label="Fill" value="" onChange={(fillColor) => onPaint({ fill: fillColor ? 'solid' : 'none', fillColor })} />
            </>
          )}
        </section>
      )}
      <footer>
        <button className="act" onClick={onDuplicate}>Duplicate</button>
        <button className="act" onClick={onLock}>{node?.locked ? 'Unlock' : 'Lock'}</button>
        <button className="act" onClick={() => onOrder('front')}>To front</button>
        <button className="act" onClick={() => onOrder('back')}>To back</button>
        <button className="act danger wide" onClick={onDelete}>Delete</button>
      </footer>
    </aside>
  );
}

function Num({ label, value, onChange, step }) {
  const shown = Math.round(value);
  return (
    <label className="numfield">
      <span>{label}</span>
      <input
        value={shown}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
      {step ? (
        <span className="numstep">
          <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(shown - step)}>−</button>
          <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(shown + step)}>+</button>
        </span>
      ) : null}
    </label>
  );
}

function Mini({ symbol, theme }) {
  const tile = symbol.kind === 'badge' ? Math.max(36, Math.min(symbol.w * 0.86 * 0.78, symbol.h - 22)) : symbol.h;
  return (
    <svg viewBox={`0 0 ${symbol.w} ${tile}`} width="22" height="22" aria-hidden="true">
      <g style={{ color: 'currentColor' }}>
        <ShapeArt node={{ ...symbol, type: symbol.id, label: '', weight: 'm', dashed: symbol.dashed }} fill="none" showLabel={false} lettering="technical" caps={false} labelFill={theme.ink} />
      </g>
    </svg>
  );
}

function TemplatePreview({ template, theme }) {
  const built = template.build();
  const xs = built.nodes.map((node) => node.x);
  const ys = built.nodes.map((node) => node.y);
  const xe = built.nodes.map((node) => node.x + node.w);
  const ye = built.nodes.map((node) => node.y + node.h);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xe) - minX;
  const h = Math.max(...ye) - minY;
  return (
    <svg className="tpreview" viewBox={`${minX - 16} ${minY - 16} ${w + 32} ${h + 32}`}>
      <rect x={minX - 16} y={minY - 16} width={w + 32} height={h + 32} fill={theme.paper} />
      {built.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x} ${node.y})`} style={{ color: theme.ink }}>
          <ShapeArt node={node} fill="none" showLabel={false} lettering="technical" caps={false} />
        </g>
      ))}
    </svg>
  );
}

function Rulers({ cols = ['A', 'B', 'C', 'D'], rows = ['1', '2', '3', '4'] }) {
  return (
    <>
      <div className="ruler ruler-top">{cols.map((mark) => <div key={`t${mark}`} className="ruler-col">{mark}</div>)}</div>
      <div className="ruler ruler-bottom">{cols.map((mark) => <div key={`b${mark}`} className="ruler-col">{mark}</div>)}</div>
      <div className="ruler ruler-left">{rows.map((mark) => <div key={`l${mark}`} className="ruler-row">{mark}</div>)}</div>
      <div className="ruler ruler-right">{rows.map((mark) => <div key={`r${mark}`} className="ruler-row">{mark}</div>)}</div>
    </>
  );
}

function LogoMark({ small = false }) {
  const size = small ? 22 : 28;
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6 L54 54 H46 L41.5 42 H22.5 L18 54 H10 Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M24.2 34 H39.8" stroke="var(--accent)" strokeWidth="2.4" />
      <path d="M8 58 H56" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function hintFor(tool) {
  if (tool === 'select') return 'Click to select · drag to move · shift-click to add';
  if (tool === 'hand') return 'Drag to pan the sheet';
  if (tool === 'connector') return 'Drag a two-bend connector with no arrow';
  if (tool === 'elbow') return 'Drag a two-bend connector with an arrow';
  if (tool === 'bend') return 'Drag a single-bend connector with no arrow';
  if (tool === 'bendarrow') return 'Drag a single-bend connector with an arrow';
  if (tool === 'arrow') return 'Drag to draw a straight arrow';
  return 'Click or drag on the sheet to place it';
}
