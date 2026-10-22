import { useCallback, useEffect, useRef, useState } from 'react';
import Canvas, { fitCamera, zoomAt } from './Canvas.jsx';
import Chrome from './Chrome.jsx';
import {
  THEMES,
  activeSheet,
  blankProject,
  blankSheet,
  isProject,
  facingSide,
  LETTERS,
  normalizeProject,
  patchSheet,
  sidePoint,
  slideEdge,
  textureUrl,
  turn,
  uid,
} from './model.js';
import { TEMPLATES } from './library.js';
import Assistant from './assistant/Assistant.jsx';
import { deleteProject, loadIndex, loadLast, loadPins, loadProject, savePins, saveProject } from './storage.js';
import { decodeShare, downloadJson, downloadMermaid, downloadPlantUml, downloadPng, downloadSvg, encodeShare, printPdf } from './export.js';

export default function Editor() {
  const [doc, setDoc] = useState(() => loadLast());
  const [preview, setPreview] = useState(null);
  const [tool, setTool] = useState('select');
  const [selection, setSelection] = useState([]);
  const [cam, setCam] = useState({ x: 180, y: 140, z: 1 });
  const [panel, setPanel] = useState(null);
  const [clean, setClean] = useState(false);
  const [saveState, setSaveState] = useState('SAVED');
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState(null);
  const [pins, setPins] = useState(() => loadPins());
  const [projects, setProjects] = useState(() => loadIndex());
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [libGroup, setLibGroup] = useState('system');
  const [shareUrl, setShareUrl] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [palTop, setPalTop] = useState(92);
  const [win, setWin] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const hist = useRef({ past: [], future: [] });
  const docRef = useRef(doc);
  const clipRef = useRef(null);
  const fileRef = useRef(null);
  const logoRef = useRef(null);
  const svgRef = useRef(null);
  const topRef = useRef(null);
  const toastTimer = useRef(0);
  const labelHistory = useRef(null);
  docRef.current = doc;

  const view = preview || doc;
  const sheet = activeSheet(view);
  const theme = THEMES[view.theme] || THEMES.blue;

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2600);
  }, []);

  const pushHistory = useCallback((prev) => {
    hist.current.past.push(prev);
    if (hist.current.past.length > 100) hist.current.past.shift();
    hist.current.future = [];
  }, []);

  const replaceDoc = useCallback((next, record) => {
    setDoc((prev) => {
      if (record) pushHistory(prev);
      return next;
    });
    setPreview(null);
  }, [pushHistory]);

  const commitSheet = useCallback((nextSheet) => {
    setDoc((prev) => {
      pushHistory(prev);
      return patchSheet(prev, prev.active, () => nextSheet);
    });
    setPreview(null);
  }, [pushHistory]);

  const onPreview = useCallback((nextSheet) => {
    if (!nextSheet) {
      setPreview(null);
      return;
    }
    setPreview(patchSheet(docRef.current, docRef.current.active, () => nextSheet));
  }, []);

  useEffect(() => {
    document.documentElement.style.background = theme.paper;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.paper);
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        saveProject(doc);
        setProjects(loadIndex());
        setSaveState('SAVED');
      } catch {
        setSaveState('NOT SAVED');
      }
    }, 360);
    setSaveState('SAVING');
    return () => window.clearTimeout(timer);
  }, [doc]);

  useEffect(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get('p');
    if (!token) return;
    decodeShare(token).then((raw) => {
      if (!isProject(raw)) return;
      const incoming = normalizeProject({ ...raw, id: uid() });
      saveProject(incoming);
      setDoc(incoming);
      setProjects(loadIndex());
      hist.current = { past: [], future: [] };
      history.replaceState(null, '', location.pathname + location.search);
      notify('Opened shared project');
    }).catch(() => notify('Could not read that share link'));
  }, [notify]);

  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!topRef.current || clean) return;
    setPalTop(Math.round(topRef.current.getBoundingClientRect().bottom + 8));
  }, [clean, panel, doc.theme, saveState, win.w]);

  useEffect(() => {
    if (panel !== 'share') return;
    let cancel = false;
    encodeShare(doc).then((token) => {
      if (!cancel) setShareUrl(`${location.origin}${location.pathname}#p=${encodeURIComponent(token)}`);
    }).catch(() => {
      if (!cancel) setShareUrl('');
    });
    return () => { cancel = true; };
  }, [panel, doc]);

  useEffect(() => {
    const onKey = (event) => {
      if (isTyping(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (event.key === '?' || (event.shiftKey && key === '/')) {
        setPanel((current) => (current === 'keys' ? null : 'keys'));
        return;
      }
      if (key === 'escape') {
        setPanel(null);
        setTool('select');
        setEditing(null);
        return;
      }
      if (meta && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (meta && key === 's') {
        event.preventDefault();
        try {
          saveProject(docRef.current);
          setSaveState('SAVED');
          notify('Saved');
        } catch {
          setSaveState('NOT SAVED');
        }
        return;
      }
      if (meta && key === 'd') {
        event.preventDefault();
        duplicate();
        return;
      }
      if (meta && key === 'c') {
        event.preventDefault();
        copySelection();
        return;
      }
      if (meta && key === 'v') {
        event.preventDefault();
        pasteSelection();
        return;
      }
      if (meta && event.key === '\\') {
        event.preventDefault();
        setClean((value) => !value);
        return;
      }
      if (meta && event.shiftKey && key === 'l') {
        event.preventDefault();
        toggleLock();
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        removeSelection();
        return;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        nudge(key);
        return;
      }
      if (meta || event.altKey) return;
      if (key === 'v') setTool('select');
      if (key === 'h') setTool('hand');
      if (key === 'c') setTool('connector');
      if (key === 'e') setTool('elbow');
      if (key === 'b') setTool('bend');
      if (key === 'k') setTool('bendarrow');
      if (key === 'a') setTool('arrow');
      if (key === 'r') {
        event.preventDefault();
        rotateSelection(event.shiftKey ? -90 : 90);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function undo() {
    setPreview(null);
    setEditing(null);
    setDoc((prev) => {
      if (!hist.current.past.length) return prev;
      hist.current.future.push(prev);
      return hist.current.past.pop();
    });
  }

  function redo() {
    setPreview(null);
    setEditing(null);
    setDoc((prev) => {
      if (!hist.current.future.length) return prev;
      hist.current.past.push(prev);
      return hist.current.future.pop();
    });
  }

  function mutateSheet(fn, record = true) {
    setDoc((prev) => {
      if (record) pushHistory(prev);
      return patchSheet(prev, prev.active, fn);
    });
    setPreview(null);
  }

  function patchNode(id, patch, record = true) {
    if (!record && !labelHistory.current) labelHistory.current = docRef.current;
    if (record && labelHistory.current) {
      pushHistory(labelHistory.current);
      labelHistory.current = null;
      mutateSheet((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
      }), false);
      return;
    }
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    }), record);
  }

  function patchEdge(id, patch, record = true) {
    mutateSheet((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === id ? { ...edge, ...patch } : edge)),
    }), record);
  }

  function rotateSelection(delta) {
    const ids = new Set(selection);
    if (!ids.size) return;
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (ids.has(node.id) ? { ...node, rot: turn(node.rot, delta) } : node)),
    }));
  }
  function paintSelection(patch) {
    const ids = new Set(selection);
    if (!ids.size) return;
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (ids.has(node.id) ? { ...node, ...patch } : node)),
      edges: patch.ink === undefined
        ? current.edges
        : current.edges.map((edge) => (ids.has(edge.id) ? { ...edge, ink: patch.ink } : edge)),
    }));
  }
  function patchSelectedNodes(patch) {
    const ids = new Set(selection);
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (ids.has(node.id) ? { ...node, ...patch } : node)),
    }));
  }

  function removeSelection() {
    const ids = new Set(selection);
    if (!ids.size) return;
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => !ids.has(node.id)),
      edges: current.edges.filter((edge) => !ids.has(edge.id) && !ids.has(edge.from) && !ids.has(edge.to)),
    }));
    setSelection([]);
  }

  function duplicate() {
    const ids = new Set(selection);
    const nodes = sheet.nodes.filter((node) => ids.has(node.id));
    if (!nodes.length) return;
    const map = new Map(nodes.map((node) => [node.id, uid()]));
    const copies = nodes.map((node) => ({ ...node, id: map.get(node.id), x: node.x + 24, y: node.y + 24 }));
    const edges = sheet.edges
      .filter((edge) => map.has(edge.from) && map.has(edge.to))
      .map((edge) => ({ ...edge, id: uid(), from: map.get(edge.from), to: map.get(edge.to) }));
    mutateSheet((current) => ({
      ...current,
      nodes: [...current.nodes, ...copies],
      edges: [...current.edges, ...edges],
    }));
    setSelection(copies.map((node) => node.id));
  }

  function copySelection() {
    const ids = new Set(selection);
    const nodes = sheet.nodes.filter((node) => ids.has(node.id));
    const edges = sheet.edges.filter((edge) => ids.has(edge.id) || (ids.has(edge.from) && ids.has(edge.to)));
    if (!nodes.length && !edges.length) return;
    clipRef.current = { nodes, edges };
    notify('Copied');
  }

  function pasteSelection() {
    const clip = clipRef.current;
    if (!clip) return;
    const map = new Map(clip.nodes.map((node) => [node.id, uid()]));
    const nodes = clip.nodes.map((node) => ({ ...node, id: map.get(node.id), x: node.x + 32, y: node.y + 32 }));
    const edges = clip.edges
      .filter((edge) => map.has(edge.from) && map.has(edge.to))
      .map((edge) => ({ ...edge, id: uid(), from: map.get(edge.from), to: map.get(edge.to) }));
    mutateSheet((current) => ({
      ...current,
      nodes: [...current.nodes, ...nodes],
      edges: [...current.edges, ...edges],
    }));
    setSelection([...nodes.map((node) => node.id), ...edges.map((edge) => edge.id)]);
  }

  function order(direction) {
    const ids = new Set(selection);
    mutateSheet((current) => {
      const picked = current.nodes.filter((node) => ids.has(node.id));
      const rest = current.nodes.filter((node) => !ids.has(node.id));
      return { ...current, nodes: direction === 'front' ? [...rest, ...picked] : [...picked, ...rest] };
    });
  }

  function toggleLock() {
    const ids = new Set(selection);
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (ids.has(node.id) ? { ...node, locked: !node.locked } : node)),
    }));
  }

  function nudge(key) {
    const step = docRef.current.settings.snap ? docRef.current.settings.grid : 2;
    const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
    const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
    const ids = new Set(selection);
    mutateSheet((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (
        ids.has(node.id) && !node.locked ? { ...node, x: node.x + dx, y: node.y + dy } : node
      )),
      edges: current.edges.map((edge) => {
        if (!ids.has(edge.id)) return edge;
        const from = current.nodes.find((node) => node.id === edge.from);
        const to = current.nodes.find((node) => node.id === edge.to);
        if (!from || !to) return edge;
        const fromSide = edge.fromSide || facingSide(from, to);
        const start = sidePoint(from, fromSide, edge.fromAt ?? 0.5);
        return slideEdge(edge, from, to, start.x + dx, start.y + dy);
      }),
    }));
  }

  function setLettering(id) {
    const spec = LETTERS.find((item) => item.id === id) || LETTERS[0];
    replaceDoc({
      ...doc,
      settings: { ...doc.settings, lettering: spec.id, caps: spec.caps },
      updated: Date.now(),
    }, true);
  }

  function updateSettings(key, value) {
    replaceDoc({
      ...doc,
      settings: { ...doc.settings, [key]: value === undefined ? !doc.settings[key] : value },
      updated: Date.now(),
    }, true);
  }

  function openProject(id) {
    const next = loadProject(id);
    if (!next) {
      notify('That project is missing');
      return;
    }
    setPreview(null);
    setSelection([]);
    setEditing(null);
    hist.current = { past: [], future: [] };
    setDoc(next);
    setPanel(null);
  }

  function copyProject(id) {
    const source = loadProject(id);
    if (!source) return;
    const copy = normalizeProject({ ...structuredClone(source), id: uid(), name: `${source.name} copy` });
    saveProject(copy);
    setProjects(loadIndex());
    notify('Copied project');
  }

  function removeProject(id) {
    deleteProject(id);
    setConfirmId(null);
    const rest = loadIndex();
    setProjects(rest);
    if (doc.id === id) {
      const next = rest[0] ? loadProject(rest[0].id) : saveProject(blankProject());
      setDoc(next || blankProject());
      hist.current = { past: [], future: [] };
    }
    notify('Deleted project');
  }

  function applyTemplate(id) {
    const template = TEMPLATES.find((item) => item.id === id) || TEMPLATES[0];
    const prev = docRef.current;
    const current = activeSheet(prev);
    const empty = current.nodes.length === 0 && current.edges.length === 0;
    const built = template.build();
    const library = template.library || prev.library;
    const fitted = empty
      ? { ...current, title: template.name, nodes: built.nodes, edges: built.edges }
      : {
        id: uid(),
        code: `A-${100 + prev.sheets.length + 1}`,
        title: template.name,
        date: current.date,
        nodes: built.nodes,
        edges: built.edges,
      };
    const next = empty
      ? {
        ...prev,
        library,
        updated: Date.now(),
        sheets: prev.sheets.map((item) => (item.id === current.id ? fitted : item)),
      }
      : { ...prev, library, sheets: [...prev.sheets, fitted], active: fitted.id, updated: Date.now() };
    replaceDoc(next, true);
    setLibGroup(library === 'technical' ? 'system' : 'boundary');
    setQuery('');
    setSelection([]);
    setPanel(null);
    setTool('select');
    setCam(fitCamera(fitted, size, clean));
  }

  function newProject() {
    const next = saveProject(blankProject());
    setDoc(next);
    setProjects(loadIndex());
    setSelection([]);
    setPreview(null);
    hist.current = { past: [], future: [] };
    setPanel(null);
  }

  function addSheet(nextSheet) {
    setDoc((prev) => {
      pushHistory(prev);
      return { ...prev, sheets: [...prev.sheets, nextSheet], active: nextSheet.id, updated: Date.now() };
    });
    setSelection([]);
    setPreview(null);
    setPanel(null);
  }

  function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      const raw = JSON.parse(text);
      if (!isProject(raw)) throw new Error('bad');
      const next = saveProject(normalizeProject({ ...raw, id: uid() }));
      setDoc(next);
      setProjects(loadIndex());
      hist.current = { past: [], future: [] };
      setSelection([]);
      notify('Opened project');
    }).catch(() => notify('That file is not an Arcprint project'));
  }

  function onLogoFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 400000) {
      notify('Pick a logo under 400 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => replaceDoc({ ...docRef.current, logo: String(reader.result) }, true);
    reader.readAsDataURL(file);
  }

  const vars = {
    '--paper': theme.paper,
    '--ink': theme.ink,
    '--muted': theme.muted,
    '--panel': theme.panel,
    '--hover': theme.hover,
    '--line': theme.line,
    '--accent': theme.accent,
    '--accent-ink': theme.accentInk,
    '--vig': theme.vig,
    '--pal-top': `${palTop}px`,
  };

  const tiny = win.w < 640;
  const wide = win.w >= 1080;
  const rulerCols = Array.from({ length: Math.max(4, Math.round((win.w - 56) / 210)) }, (_, i) => String.fromCharCode(65 + i));
  const rulerRows = Array.from({ length: Math.max(3, Math.round((win.h - 56) / 210)) }, (_, i) => String(i + 1));

  return (
    <div className={`app${clean ? ' clean' : ''}${tiny ? ' tiny' : ''}`} style={vars}>
      <div className="sheet-area">
        <Canvas
          svgRef={svgRef}
          sheet={sheet}
          theme={theme}
          settings={view.settings}
          cam={cam}
          setCam={setCam}
          tool={tool}
          selection={selection}
          setSelection={setSelection}
          onCommit={commitSheet}
          onPreview={onPreview}
          onCursor={setCursor}
          onSize={setSize}
          editing={editing}
          setEditing={setEditing}
          onStamp={() => setTool('select')}
        />
      </div>
      <div className="texture" style={{ backgroundImage: textureUrl(view.theme) }} />
      <div className="vignette" />
      <Chrome
        doc={view}
        sheet={sheet}
        theme={theme}
        tool={tool}
        setTool={setTool}
        selection={selection}
        clean={clean}
        setClean={setClean}
        saveState={saveState}
        canUndo={hist.current.past.length > 0}
        canRedo={hist.current.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        panel={panel}
        setPanel={setPanel}
        pins={pins}
        onTogglePin={(id) => {
          setPins((current) => {
            const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-8);
            savePins(next);
            return next;
          });
        }}
        onPatchNode={patchNode}
        onPatchEdge={patchEdge}
        onPatchNodes={patchSelectedNodes}
        onDuplicate={duplicate}
        onDelete={removeSelection}
        onOrder={order}
        onLock={toggleLock}
        onRotate={rotateSelection}
        onPaint={paintSelection}
        onSheetField={(patch) => mutateSheet((current) => ({ ...current, ...patch }))}
        onProjectField={(patch) => replaceDoc({ ...doc, ...patch, updated: Date.now() }, true)}
        onTheme={(next) => replaceDoc({ ...doc, theme: next, updated: Date.now() }, true)}
        onLibrary={(next) => {
          replaceDoc({ ...doc, library: next, updated: Date.now() }, true);
          setLibGroup(next === 'technical' ? 'system' : 'boundary');
          setQuery('');
        }}
        onToggleSetting={updateSettings}
        onLettering={setLettering}
        onAddSheet={() => addSheet(blankSheet(doc.sheets.length + 1))}
        onBlankSheet={() => addSheet(blankSheet(doc.sheets.length + 1))}
        onPickSheet={(id) => {
          replaceDoc({ ...doc, active: id }, false);
          setSelection([]);
        }}
        onClearSheet={() => {
          if (!sheet.nodes.length && !sheet.edges.length) return;
          mutateSheet((current) => ({ ...current, nodes: [], edges: [] }));
          setSelection([]);
        }}
        onDeleteSheet={() => {
          if (doc.sheets.length < 2) return;
          const sheets = doc.sheets.filter((item) => item.id !== sheet.id);
          replaceDoc({ ...doc, sheets, active: sheets[0].id, updated: Date.now() }, true);
          setSelection([]);
        }}
        projects={projects}
        onOpenProject={openProject}
        onCopyProject={copyProject}
        onDeleteProject={removeProject}
        confirmId={confirmId}
        setConfirmId={setConfirmId}
        onNewProject={newProject}
        onTemplate={applyTemplate}
        onOpenClick={() => fileRef.current?.click()}
        shareUrl={shareUrl}
        onCopyShare={async () => {
          try {
            await navigator.clipboard.writeText(shareUrl);
            notify('Link copied');
          } catch {
            notify('Copy the link from the field');
          }
        }}
        cursor={cursor}
        cam={cam}
        onZoom={(factor) => setCam((current) => zoomAt(current, size, factor))}
        onFit={() => setCam(fitCamera(sheet, size, clean))}
        onPng={() => downloadPng(svgRef.current, doc)}
        onSvg={() => downloadSvg(svgRef.current, doc)}
        onPdf={() => {
          if (!printPdf(svgRef.current, doc)) notify('Allow pop-ups to export PDF');
        }}
        onJson={() => downloadJson(doc)}
        onMermaid={() => downloadMermaid(doc)}
        onPlant={() => downloadPlantUml(doc)}
        toast={toast}
        query={query}
        setQuery={setQuery}
        libGroup={libGroup}
        setLibGroup={setLibGroup}
        topRef={topRef}
        wide={wide}
        tiny={tiny}
        rulerCols={rulerCols}
        rulerRows={rulerRows}
        onLogo={() => logoRef.current?.click()}
        onClearLogo={() => replaceDoc({ ...doc, logo: null }, true)}
      />
      <Assistant api={{
        theme: (name) => replaceDoc({ ...docRef.current, theme: name, updated: Date.now() }, true),
        library: (name) => {
          replaceDoc({ ...docRef.current, library: name, updated: Date.now() }, true);
          setLibGroup(name === 'technical' ? 'system' : 'boundary');
          setQuery('');
        },
        setting: (key, value) => updateSettings(key, value),
        tool: setTool,
        clean: setClean,
        fit: () => setCam(fitCamera(activeSheet(docRef.current), size, clean)),
        zoom: (factor) => setCam((current) => zoomAt(current, size, factor)),
        zoomReset: () => setCam((current) => zoomAt(current, size, 1 / current.z)),
        undo,
        redo,
        panel: setPanel,
        openFile: () => fileRef.current?.click(),
        addSheet: () => addSheet(blankSheet(docRef.current.sheets.length + 1)),
        clearSheet: () => {
          const active = activeSheet(docRef.current);
          if (!active.nodes.length && !active.edges.length) return 'This sheet is already empty.';
          mutateSheet((current) => ({ ...current, nodes: [], edges: [] }));
          setSelection([]);
          return null;
        },
        deleteSheet: () => {
          const current = docRef.current;
          const active = activeSheet(current);
          if (current.sheets.length < 2) return 'This project has only one sheet.';
          const sheets = current.sheets.filter((item) => item.id !== active.id);
          replaceDoc({ ...current, sheets, active: sheets[0].id, updated: Date.now() }, true);
          setSelection([]);
          return null;
        },
        deleteSelection: () => {
          if (!selection.length) return 'Nothing is selected.';
          removeSelection();
          return null;
        },
        exportPng: () => downloadPng(svgRef.current, docRef.current),
        exportSvg: () => downloadSvg(svgRef.current, docRef.current),
        exportPdf: () => {
          if (!printPdf(svgRef.current, docRef.current)) return 'Allow pop-ups to export PDF.';
          return null;
        },
        exportJson: () => downloadJson(docRef.current),
        exportMermaid: () => downloadMermaid(docRef.current),
        exportPlant: () => downloadPlantUml(docRef.current),
        template: (id) => applyTemplate(id),
        newProject,
        save: () => {
          try {
            saveProject(docRef.current);
            setSaveState('SAVED');
            return null;
          } catch {
            setSaveState('NOT SAVED');
            return 'Could not save.';
          }
        },
        copyShare: async () => {
          try {
            const token = await encodeShare(docRef.current);
            const url = `${location.origin}${location.pathname}#p=${encodeURIComponent(token)}`;
            await navigator.clipboard.writeText(url);
            return null;
          } catch {
            return 'Could not copy the share link.';
          }
        },
        clearLogo: () => replaceDoc({ ...docRef.current, logo: null, updated: Date.now() }, true),
        pickLogo: () => logoRef.current?.click(),
        copyProject: () => copyProject(docRef.current.id),
        deleteProject: () => removeProject(docRef.current.id),
        stepSheet: (step) => {
          const current = docRef.current;
          const index = current.sheets.findIndex((item) => item.id === current.active);
          const next = current.sheets[index + step];
          if (!next) return step > 0 ? 'This is the last sheet.' : 'This is the first sheet.';
          replaceDoc({ ...current, active: next.id }, false);
          setSelection([]);
          return null;
        },
        duplicateSelection: () => {
          const ids = new Set(selection);
          if (!activeSheet(docRef.current).nodes.some((node) => ids.has(node.id))) return 'Select a shape first.';
          duplicate();
          return null;
        },
        copySelection: () => {
          const ids = new Set(selection);
          const active = activeSheet(docRef.current);
          const has = active.nodes.some((node) => ids.has(node.id)) || active.edges.some((edge) => ids.has(edge.id));
          if (!has) return 'Nothing is selected.';
          copySelection();
          return null;
        },
        pasteSelection: () => {
          if (!clipRef.current) return 'Nothing is copied.';
          pasteSelection();
          return null;
        },
        setLocked: (locked) => {
          const ids = new Set(selection);
          if (!activeSheet(docRef.current).nodes.some((node) => ids.has(node.id))) return 'Select a shape first.';
          mutateSheet((current) => ({
            ...current,
            nodes: current.nodes.map((node) => (ids.has(node.id) ? { ...node, locked } : node)),
          }));
          return null;
        },
        orderSelection: (direction) => {
          const ids = new Set(selection);
          if (!activeSheet(docRef.current).nodes.some((node) => ids.has(node.id))) return 'Select a shape first.';
          order(direction);
          return null;
        },
        nudgeSelection: (key) => {
          const ids = new Set(selection);
          if (!activeSheet(docRef.current).nodes.some((node) => ids.has(node.id))) return 'Select a shape first.';
          nudge(key);
          return null;
        },
        styleSelection: (patch, kind) => {
          const ids = new Set(selection);
          const active = activeSheet(docRef.current);
          const nodeHit = active.nodes.some((node) => ids.has(node.id));
          const edgeHit = active.edges.some((edge) => ids.has(edge.id));
          if (kind === 'node' && !nodeHit) return 'Select a shape first.';
          if (kind === 'edge' && !edgeHit) return 'Select a connector first.';
          if (kind === 'mark' && !nodeHit && !edgeHit) return 'Nothing is selected.';
          mutateSheet((current) => ({
            ...current,
            nodes: kind === 'edge' ? current.nodes : current.nodes.map((node) => (ids.has(node.id) ? { ...node, ...patch } : node)),
            edges: kind === 'node' ? current.edges : current.edges.map((edge) => (ids.has(edge.id) ? { ...edge, ...patch } : edge)),
          }));
          return null;
        },
        arm: (libraryName, toolId) => {
          const current = docRef.current;
          if (libraryName && libraryName !== current.library) {
            replaceDoc({ ...current, library: libraryName, updated: Date.now() }, true);
            setLibGroup(libraryName === 'technical' ? 'system' : 'boundary');
            setQuery('');
          }
          setTool(toolId);
        },
      }} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={onLogoFile} />
    </div>
  );
}

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
