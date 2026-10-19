import { useEffect, useRef, useState } from 'react';
import {
  HANDLE_IDS,
  arrowHead,
  contentBounds,
  curveEndAngle,
  curveStartAngle,
  displayLabel,
  edgeGeometry,
  endAngle,
  facingSide,
  findPort,
  portPoint,
  sidePoint,
  fontFamily,
  fontPx,
  freeBendPath,
  freeElbowPath,
  geometryPath,
  handlePoint,
  hitEdge,
  hitHandle,
  hitNode,
  slideEdge,
  nodeBounds,
  nudge,
  normalizeRect,
  rectsOverlap,
  resizeArrow,
  resizeRotated,
  snapTo,
  strokePx,
  toLocal,
  turn,
} from './model.js';
import { BEHIND, makeNode, symbolById } from './library.js';
import { ShapeArt, badgeTile } from './glyphs.jsx';

const TOOLS = new Set(['select', 'hand', 'connector', 'elbow', 'bend', 'bendarrow', 'arrow']);

export default function Canvas({
  svgRef,
  sheet,
  theme,
  settings,
  cam,
  setCam,
  tool,
  selection,
  setSelection,
  onCommit,
  onPreview,
  onCursor,
  onSize,
  editing,
  setEditing,
  onStamp,
}) {
  const live = useRef({});
  const editLock = useRef(false);
  const camRef = useRef(cam);
  const sheetRef = useRef(sheet);
  const toolRef = useRef(tool);
  const selectionRef = useRef(selection);
  const settingsRef = useRef(settings);
  const spaceRef = useRef(false);
  const gestureRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [link, setLink] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const [view, setView] = useState({ w: 1, h: 1 });
  const scrollDrag = useRef(null);
  camRef.current = cam;
  sheetRef.current = sheet;
  toolRef.current = tool;
  selectionRef.current = selection;
  settingsRef.current = settings;

  useEffect(() => {
    if (editing) editLock.current = false;
  }, [editing]);

  useEffect(() => {
    const svg = svgRef.current;
    const ro = new ResizeObserver(() => {
      const next = { w: svg.clientWidth, h: svg.clientHeight };
      setView(next);
      onSize(next);
    });
    ro.observe(svg);
    const next = { w: svg.clientWidth, h: svg.clientHeight };
    setView(next);
    onSize(next);
    return () => ro.disconnect();
  }, [onSize]);

  useEffect(() => {
    const move = (event) => live.current.onMove(event);
    const up = (event) => live.current.onUp(event);
    const key = (event) => {
      if (event.code === 'Space' && !isTyping(event.target)) {
        spaceRef.current = event.type === 'keydown';
        if (event.type === 'keydown') event.preventDefault();
      }
      if (event.key === 'Escape') live.current.cancel?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const wheel = (event) => {
      event.preventDefault();
      const current = camRef.current;
      if (event.ctrlKey || event.metaKey) {
        const world = toWorld(event);
        const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
        const zoom = clampZoom(current.z * factor);
        setCam({
          z: zoom,
          x: world.sx - world.x * zoom,
          y: world.sy - world.y * zoom,
        });
        return;
      }
      const dx = event.shiftKey ? event.deltaY : event.deltaX;
      const dy = event.shiftKey ? 0 : event.deltaY;
      setCam({ ...current, x: current.x - dx, y: current.y - dy });
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [setCam]);

  function toWorld(event) {
    const rect = svgRef.current.getBoundingClientRect();
    const current = camRef.current;
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    return { sx, sy, x: (sx - current.x) / current.z, y: (sy - current.y) / current.z };
  }

  function cancelGesture() {
    gestureRef.current = null;
    setLink(null);
    setMarquee(null);
    onPreview(null);
  }

  function onDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    if (editing) return;
    const world = toWorld(event);
    const currentSheet = sheetRef.current;
    const currentTool = toolRef.current;
    const currentCam = camRef.current;
    const snap = settingsRef.current.snap;
    const grid = settingsRef.current.grid;
    onCursor({ x: world.x, y: world.y });
    if (currentTool === 'hand' || event.button === 1 || spaceRef.current) {
      gestureRef.current = { kind: 'pan', sx: world.sx, sy: world.sy, cam: { ...currentCam } };
      return;
    }
    if (currentTool === 'select') {
      const only = selectionRef.current.length === 1
        ? currentSheet.nodes.find((node) => node.id === selectionRef.current[0])
        : null;
      if (only && !only.locked) {
        const handle = hitHandle(only, world.x, world.y, currentCam.z);
        if (handle) {
          gestureRef.current = { kind: 'resize', id: only.id, handle: handle.id, origin: currentSheet, dirty: false };
          return;
        }
      }
    }
    if (currentTool === 'select') {
      const node = hitNode(currentSheet.nodes, world.x, world.y, currentCam.z);
      const edge = hitEdge(currentSheet.edges, currentSheet.nodes, world.x, world.y, currentCam.z);
      if (edge && !pointerOnShape(node, world.x, world.y)) {
        if (event.shiftKey) {
          setSelection((ids) => (ids.includes(edge.id) ? ids.filter((id) => id !== edge.id) : [...ids, edge.id]));
          return;
        }
        setSelection([edge.id]);
        gestureRef.current = { kind: 'slide', id: edge.id, origin: currentSheet, ox: world.x, oy: world.y, dirty: false };
        return;
      }
      if (node) {
        if (event.shiftKey) {
          setSelection((ids) => (ids.includes(node.id) ? ids.filter((id) => id !== node.id) : [...ids, node.id]));
          return;
        }
        const ids = selectionRef.current.includes(node.id) ? selectionRef.current : [node.id];
        if (!selectionRef.current.includes(node.id)) setSelection([node.id]);
        const moving = currentSheet.nodes.filter((item) => ids.includes(item.id) && !item.locked).map((item) => item.id);
        if (!moving.length) return;
        gestureRef.current = { kind: 'move', ids: moving, ox: world.x, oy: world.y, origin: currentSheet, dirty: false };
        return;
      }
      const port = findPort(currentSheet.nodes, world.x, world.y, currentCam.z);
      if (port && selectionRef.current.includes(port.node.id)) {
        gestureRef.current = {
          kind: 'connect',
          fromId: port.node.id,
          fromSide: port.side,
          origin: currentSheet,
        };
        setLink({ fromId: port.node.id, fromSide: port.side, headed: true, x: world.x, y: world.y });
        return;
      }
      if (!event.shiftKey) setSelection([]);
      gestureRef.current = { kind: 'marquee', x: world.x, y: world.y, origin: currentSheet, shift: event.shiftKey };
      setMarquee({ x: world.x, y: world.y, w: 0, h: 0 });
      return;
    }
    if (currentTool === 'connector' || currentTool === 'elbow' || currentTool === 'bend' || currentTool === 'bendarrow') {
      const headed = currentTool === 'elbow' || currentTool === 'bendarrow';
      const route = currentTool === 'bend' || currentTool === 'bendarrow' ? 'bend' : 'elbow';
      const port = findPort(currentSheet.nodes, world.x, world.y, currentCam.z);
      const node = !port ? hitNode(currentSheet.nodes, world.x, world.y, currentCam.z) : null;
      const from = port?.node || (node && node.type !== 'arrow' ? node : null);
      if (from) {
        const fromSide = port?.side || nearestSide(from, world.x, world.y);
        gestureRef.current = {
          kind: 'connect',
          fromId: from.id,
          fromSide,
          headed,
          angled: true,
          route,
          origin: currentSheet,
        };
        setLink({ fromId: from.id, fromSide, headed, route, x: world.x, y: world.y });
      } else {
        gestureRef.current = {
          kind: 'elbow',
          headed,
          route,
          x: snapTo(world.x, grid, snap),
          y: snapTo(world.y, grid, snap),
          origin: currentSheet,
        };
      }
      return;
    }
    if (currentTool === 'arrow') {
      gestureRef.current = { kind: 'arrow', x: snapTo(world.x, grid, snap), y: snapTo(world.y, grid, snap), origin: currentSheet };
      return;
    }
    const spec = symbolById(currentTool);
    if (spec) {
      gestureRef.current = {
        kind: 'place',
        spec,
        x: world.x,
        y: world.y,
        origin: currentSheet,
        dirty: false,
      };
    }
  }

  function onMove(event) {
    if (!svgRef.current) return;
    const world = toWorld(event);
    onCursor({ x: world.x, y: world.y });
    const gesture = gestureRef.current;
    if (!gesture) {
      const node = hitNode(sheetRef.current.nodes, world.x, world.y, camRef.current.z);
      const edge = hitEdge(sheetRef.current.edges, sheetRef.current.nodes, world.x, world.y, camRef.current.z);
      setHover(node && (!edge || pointerOnShape(node, world.x, world.y)) ? node.id : null);
      return;
    }
    const { snap, grid } = settingsRef.current;
    if (gesture.kind === 'pan') {
      setCam({
        ...gesture.cam,
        x: gesture.cam.x + (world.sx - gesture.sx),
        y: gesture.cam.y + (world.sy - gesture.sy),
      });
      return;
    }
    if (gesture.kind === 'move') {
      let dx = world.x - gesture.ox;
      let dy = world.y - gesture.oy;
      const primary = gesture.origin.nodes.find((node) => node.id === gesture.ids[0]);
      if (snap && primary) {
        dx = snapTo(primary.x + dx, grid, true) - primary.x;
        dy = snapTo(primary.y + dy, grid, true) - primary.y;
      }
      gesture.dirty = gesture.dirty || Math.hypot(dx, dy) > 0.5;
      gesture.latest = {
        ...gesture.origin,
        nodes: gesture.origin.nodes.map((node) => (
          gesture.ids.includes(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node
        )),
      };
      onPreview(gesture.latest);
      return;
    }
    if (gesture.kind === 'resize') {
      const orig = gesture.origin.nodes.find((node) => node.id === gesture.id);
      let next = orig;
      if (gesture.handle === 'rotate') {
        const cx = orig.x + orig.w / 2;
        const cy = orig.y + orig.h / 2;
        let deg = (Math.atan2(world.y - cy, world.x - cx) * 180) / Math.PI + 90;
        deg = event.shiftKey ? Math.round(deg / 90) * 90 : snap ? Math.round(deg / 15) * 15 : deg;
        next = { ...orig, rot: turn(deg, 0) };
      } else if (orig.type === 'arrow') {
        next = resizeArrow(orig, gesture.handle, world.x, world.y, grid, snap);
      } else {
        next = resizeRotated(orig, gesture.handle, world.x, world.y, grid, snap);
      }
      gesture.dirty = true;
      gesture.latest = {
        ...gesture.origin,
        nodes: gesture.origin.nodes.map((node) => (node.id === gesture.id ? next : node)),
      };
      onPreview(gesture.latest);
      return;
    }
    if (gesture.kind === 'slide') {
      const edge = gesture.origin.edges.find((item) => item.id === gesture.id);
      const from = gesture.origin.nodes.find((node) => node.id === edge?.from);
      const to = gesture.origin.nodes.find((node) => node.id === edge?.to);
      if (edge && from && to) {
        const fromSide = edge.fromSide || facingSide(from, to);
        const start = sidePoint(from, fromSide, edge.fromAt ?? 0.5);
        const moved = slideEdge(edge, from, to, start.x + world.x - gesture.ox, start.y + world.y - gesture.oy);
        gesture.dirty = gesture.dirty || Math.abs(moved.fromAt - (edge.fromAt ?? 0.5)) > 0.01 || Math.abs(moved.toAt - (edge.toAt ?? 0.5)) > 0.01;
        gesture.latest = {
          ...gesture.origin,
          edges: gesture.origin.edges.map((item) => (item.id === edge.id ? moved : item)),
        };
        onPreview(gesture.latest);
      }
      return;
    }
    if (gesture.kind === 'connect') {
      setLink({ fromId: gesture.fromId, fromSide: gesture.fromSide, headed: gesture.headed, route: gesture.route, x: world.x, y: world.y });
      return;
    }
    if (gesture.kind === 'marquee') {
      const rect = normalizeRect(gesture.x, gesture.y, world.x, world.y);
      setMarquee(rect);
      return;
    }
    if (gesture.kind === 'place') {
      const moved = Math.hypot(world.x - gesture.x, world.y - gesture.y) > 6;
      if (!moved && !gesture.dirty) return;
      gesture.dirty = true;
      const rect = normalizePlaced(gesture.x, gesture.y, world.x, world.y, grid, snap);
      const draft = makeNode(gesture.spec, rect.x, rect.y, rect);
      draft.id = '__draft';
      const nodes = BEHIND.has(gesture.spec.id)
        ? [draft, ...gesture.origin.nodes.filter((node) => node.id !== '__draft')]
        : [...gesture.origin.nodes.filter((node) => node.id !== '__draft'), draft];
      onPreview({ ...gesture.origin, nodes });
      return;
    }
    if (gesture.kind === 'arrow' || gesture.kind === 'elbow') {
      const draft = {
        id: '__draft',
        type: 'arrow',
        route: gesture.kind === 'elbow' ? (gesture.route || 'elbow') : undefined,
        head: gesture.kind === 'elbow' && !gesture.headed ? 'none' : undefined,
        x: gesture.x,
        y: gesture.y,
        w: snapTo(world.x, grid, snap) - gesture.x,
        h: snapTo(world.y, grid, snap) - gesture.y,
        label: '',
        weight: 'm',
        text: 'm',
        fill: 'none',
        dashed: false,
        locked: false,
      };
      gesture.dirty = Math.hypot(draft.w, draft.h) > 4;
      onPreview({ ...gesture.origin, nodes: [...gesture.origin.nodes.filter((node) => node.id !== '__draft'), draft] });
    }
  }

  function onUp(event) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const world = toWorld(event);
    const { snap, grid, route } = settingsRef.current;
    gestureRef.current = null;
    setLink(null);
    setMarquee(null);
    if (gesture.kind === 'pan') return;
    if (gesture.kind === 'move' || gesture.kind === 'resize' || gesture.kind === 'slide') {
      if (gesture.dirty && gesture.latest) onCommit(gesture.latest);
      else onPreview(null);
      return;
    }
    if (gesture.kind === 'connect') {
      onPreview(null);
      const target = hitNode(gesture.origin.nodes, world.x, world.y);
      const port = findPort(gesture.origin.nodes, world.x, world.y, camRef.current.z);
      const to = port?.node || target;
      if (!to || to.id === gesture.fromId || to.type === 'arrow') return;
      const edge = {
        id: Math.random().toString(36).slice(2, 10),
        from: gesture.fromId,
        to: to.id,
        fromSide: gesture.fromSide,
        toSide: port?.side || null,
        route: gesture.angled ? (gesture.route || 'elbow') : route,
        arrow: gesture.headed === false ? 'none' : 'end',
        label: '',
        weight: 'm',
        dashed: false,
      };
      onCommit({ ...gesture.origin, edges: [...gesture.origin.edges, edge] });
      setSelection([edge.id]);
      return;
    }
    if (gesture.kind === 'marquee') {
      const rect = normalizeRect(gesture.x, gesture.y, world.x, world.y);
      if (rect.w < 4 && rect.h < 4) return;
      const hits = gesture.origin.nodes.filter((node) => rectsOverlap(rect, nodeBounds(node))).map((node) => node.id);
      setSelection(gesture.shift ? [...new Set([...selectionRef.current, ...hits])] : hits);
      return;
    }
    if (gesture.kind === 'place') {
      const spec = gesture.spec;
      let node;
      if (!gesture.dirty) {
        node = makeNode(
          spec,
          snapTo(gesture.x - spec.w / 2, grid, snap),
          snapTo(gesture.y - spec.h / 2, grid, snap),
        );
      } else {
        const rect = normalizePlaced(gesture.x, gesture.y, world.x, world.y, grid, snap);
        node = makeNode(spec, rect.x, rect.y, rect);
      }
      const nodes = withoutDraft(gesture.origin.nodes);
      const nextNodes = BEHIND.has(spec.id) ? [node, ...nodes] : [...nodes, node];
      onCommit({ ...gesture.origin, nodes: nextNodes });
      setSelection([node.id]);
      onStamp?.();
      return;
    }
    if (gesture.kind === 'arrow' || gesture.kind === 'elbow') {
      const w = snapTo(world.x, grid, snap) - gesture.x;
      const h = snapTo(world.y, grid, snap) - gesture.y;
      if (Math.hypot(w, h) < 8) {
        onPreview(null);
        return;
      }
      const node = {
        id: Math.random().toString(36).slice(2, 10),
        type: 'arrow',
        route: gesture.kind === 'elbow' ? (gesture.route || 'elbow') : undefined,
        head: gesture.kind === 'elbow' && !gesture.headed ? 'none' : undefined,
        x: gesture.x,
        y: gesture.y,
        w,
        h,
        label: '',
        weight: 'm',
        text: 'm',
        fill: 'none',
        dashed: false,
        locked: false,
      };
      onCommit({ ...gesture.origin, nodes: [...withoutDraft(gesture.origin.nodes), node] });
      setSelection([node.id]);
      onStamp?.();
    }
  }

  function onDouble(event) {
    const world = toWorld(event);
    const current = sheetRef.current;
    const node = hitNode(current.nodes, world.x, world.y, camRef.current.z);
    const edge = hitEdge(current.edges, current.nodes, world.x, world.y, camRef.current.z);
    if (edge && !pointerOnShape(node, world.x, world.y)) return;
    if (node && node.type !== 'arrow') {
      setSelection([node.id]);
      setEditing({ id: node.id, value: node.label });
      return;
    }
    if (toolRef.current !== 'select') return;
    const spec = symbolById('text');
    const { snap, grid } = settingsRef.current;
    const created = makeNode(spec, snapTo(world.x, grid, snap), snapTo(world.y - spec.h / 2, grid, snap));
    onCommit({ ...current, nodes: [...current.nodes, created] });
    setSelection([created.id]);
    setEditing({ id: created.id, value: created.label });
  }

  live.current.onMove = onMove;
  live.current.onUp = onUp;
  live.current.cancel = cancelGesture;

  const nodesById = new Map(sheet.nodes.map((node) => [node.id, node]));
  const gridLines = settings.showGrid === false ? [] : visibleGrid(cam, svgRef.current, settings.grid);
  const editorNode = editing ? sheet.nodes.find((node) => node.id === editing.id) : null;
  const bars = scrollRange(sheet.nodes, cam, view);

  return (
    <div className="canvas" style={{ cursor: cursorFor(tool, spaceRef.current) }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        onPointerDown={onDown}
        onDoubleClick={onDouble}
      >
        <rect width="100%" height="100%" fill={theme.paper} />
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.z})`}>
          {gridLines.map((line, index) => (
            <line
              key={index}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.major ? theme.major : theme.minor}
              strokeWidth={1 / cam.z}
            />
          ))}
          <g data-layer="shapes">
            {sheet.nodes.filter((node) => BEHIND.has(node.type)).map((node) => (
              <NodeView
                key={node.id}
                node={node}
                theme={theme}
                settings={settings}
                selected={selection.includes(node.id)}
                hover={hover === node.id}
                cam={cam}
                hideLabel={editing?.id === node.id}
                showPorts={tool === 'connector' || tool === 'elbow' || tool === 'bend' || tool === 'bendarrow' || selection.includes(node.id) || hover === node.id}
                showDims={settings.dims && selection.includes(node.id)}
              />
            ))}
            {sheet.edges.map((edge) => {
              const from = nodesById.get(edge.from);
              const to = nodesById.get(edge.to);
              if (!from || !to) return null;
              const geometry = edgeGeometry(edge, from, to);
              const path = geometryPath(geometry);
              const selected = selection.includes(edge.id);
              const angle = geometry.curve ? curveEndAngle(geometry.toSide, to.rot || 0) : endAngle(geometry.points);
              const startAngle = geometry.curve ? curveStartAngle(geometry.fromSide, from.rot || 0) + 180 : endAngle([geometry.points[1], geometry.points[0]]);
              const end = geometry.points[geometry.points.length - 1];
              const start = geometry.points[0];
              const mid = midpoint(geometry);
              return (
                <g key={edge.id} style={{ color: selected ? theme.accent : theme.ink }}>
                  <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokePx(edge.weight) + (selected ? 1.25 : 0)}
                    strokeDasharray={edge.dashed ? '7 4' : undefined}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {edge.arrow !== 'none' && (
                    <polygon points={arrowHead(end.x, end.y, angle)} fill="currentColor" stroke="none" />
                  )}
                  {edge.arrow === 'both' && (
                    <polygon points={arrowHead(start.x, start.y, startAngle)} fill="currentColor" stroke="none" />
                  )}
                  {edge.label ? (
                    <text
                      x={mid.x}
                      y={mid.y}
                      textAnchor="middle"
                      fill={theme.ink}
                      stroke={theme.paper}
                      strokeWidth={4}
                      paintOrder="stroke"
                      fontFamily={fontFamily(settings.lettering)}
                      fontSize={13}
                      fontWeight={600}
                    >
                      {displayLabel(edge.label, settings)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {sheet.nodes.filter((node) => !BEHIND.has(node.type)).map((node) => (
              <NodeView
                key={node.id}
                node={node}
                theme={theme}
                settings={settings}
                selected={selection.includes(node.id)}
                hover={hover === node.id}
                cam={cam}
                hideLabel={editing?.id === node.id}
                showPorts={tool === 'connector' || tool === 'elbow' || tool === 'bend' || tool === 'bendarrow' || selection.includes(node.id) || hover === node.id}
                showDims={settings.dims && selection.includes(node.id)}
              />
            ))}
          </g>
          {link && <ConnectRubber sheet={sheet} link={link} theme={theme} />}
          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill={theme.tint}
              stroke={theme.accent}
              strokeDasharray={`${4 / cam.z} ${3 / cam.z}`}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      </svg>
      {editorNode && (
        <textarea
          className="label-editor"
          value={editing.value}
          autoFocus
          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
          onBlur={() => finishEdit(true)}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              finishEdit(false);
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              finishEdit(true);
            }
          }}
          style={editorStyle(editorNode, cam, theme, settings)}
        />
      )}
      {bars.canY && (
        <div className="scroll-y" onPointerDown={(event) => jumpScroll('y', event)}>
          <div
            className="scroll-thumb"
            style={{ top: `${bars.y * (1 - bars.thumbH) * 100}%`, height: `${bars.thumbH * 100}%` }}
            onPointerDown={(event) => beginScroll('y', event)}
            onPointerMove={moveScroll}
            onPointerUp={endScroll}
          />
        </div>
      )}
      {bars.canX && (
        <div className="scroll-x" onPointerDown={(event) => jumpScroll('x', event)}>
          <div
            className="scroll-thumb"
            style={{ left: `${bars.x * (1 - bars.thumbW) * 100}%`, width: `${bars.thumbW * 100}%` }}
            onPointerDown={(event) => beginScroll('x', event)}
            onPointerMove={moveScroll}
            onPointerUp={endScroll}
          />
        </div>
      )}
    </div>
  );

  function beginScroll(axis, event) {
    event.preventDefault();
    event.stopPropagation();
    const thumb = event.currentTarget;
    const track = thumb.parentElement.getBoundingClientRect();
    const range = scrollRange(sheet.nodes, cam, view);
    scrollDrag.current = {
      axis,
      pointer: axis === 'x' ? event.clientX : event.clientY,
      ratio: axis === 'x' ? range.x : range.y,
      range,
      cam,
      travel: Math.max(1, (axis === 'x' ? track.width : track.height) - (axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight)),
    };
    thumb.setPointerCapture(event.pointerId);
  }

  function moveScroll(event) {
    const drag = scrollDrag.current;
    if (!drag) return;
    const point = drag.axis === 'x' ? event.clientX : event.clientY;
    const ratio = clamp01(drag.ratio + (point - drag.pointer) / drag.travel);
    setCam(cameraAt(
      drag.range,
      drag.cam,
      drag.axis === 'x' ? ratio : drag.range.x,
      drag.axis === 'y' ? ratio : drag.range.y,
    ));
  }

  function endScroll() {
    scrollDrag.current = null;
  }

  function jumpScroll(axis, event) {
    if (event.target !== event.currentTarget) return;
    const range = scrollRange(sheet.nodes, cam, view);
    const rect = event.currentTarget.getBoundingClientRect();
    const local = axis === 'x' ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height;
    const thumb = axis === 'x' ? range.thumbW : range.thumbH;
    const ratio = thumb >= 1 ? 0 : clamp01((local - thumb / 2) / (1 - thumb));
    setCam(cameraAt(range, cam, axis === 'x' ? ratio : range.x, axis === 'y' ? ratio : range.y));
  }

  function finishEdit(save) {
    if (!editing || editLock.current) return;
    editLock.current = true;
    const current = sheetRef.current;
    const nextValue = editing.value;
    const id = editing.id;
    setEditing(null);
    if (save) {
      onCommit({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? { ...node, label: nextValue } : node)),
      });
    }
  }
}

function scrollRange(nodes, cam, view) {
  const bounds = contentBounds(nodes);
  const worldW = Math.max(1, view.w) / cam.z;
  const worldH = Math.max(1, view.h) / cam.z;
  const seenL = -cam.x / cam.z;
  const seenT = -cam.y / cam.z;
  const seenR = seenL + worldW;
  const seenB = seenT + worldH;
  const slack = 4;
  const fitsX = bounds.x >= seenL - slack && bounds.x + bounds.w <= seenR + slack;
  const fitsY = bounds.y >= seenT - slack && bounds.y + bounds.h <= seenB + slack;
  const left = Math.min(bounds.x, seenL);
  const top = Math.min(bounds.y, seenT);
  const right = Math.max(bounds.x + bounds.w, seenR);
  const bottom = Math.max(bounds.y + bounds.h, seenB);
  const extentW = Math.max(worldW, right - left);
  const extentH = Math.max(worldH, bottom - top);
  const spanX = Math.max(1, extentW - worldW);
  const spanY = Math.max(1, extentH - worldH);
  return {
    left,
    top,
    spanX,
    spanY,
    x: clamp01((seenL - left) / spanX),
    y: clamp01((seenT - top) / spanY),
    thumbW: clamp01(worldW / extentW),
    thumbH: clamp01(worldH / extentH),
    canX: !fitsX,
    canY: !fitsY,
  };
}

function cameraAt(range, cam, x, y) {
  return {
    ...cam,
    x: -(range.left + clamp01(x) * range.spanX) * cam.z,
    y: -(range.top + clamp01(y) * range.spanY) * cam.z,
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function pointerOnShape(node, x, y) {
  if (!node || node.type === 'arrow' || BEHIND.has(node.type)) return false;
  const spec = symbolById(node.type);
  const local = toLocal(node, x, y);
  if (spec?.kind === 'badge') {
    const tile = badgeTile(node.w, node.h);
    return local.x >= tile.x && local.x <= tile.x + tile.tileW && local.y >= 0 && local.y <= tile.tileH;
  }
  return local.x >= 0 && local.y >= 0 && local.x <= node.w && local.y <= node.h;
}

function NodeView({ node, theme, settings, selected, hover, cam, hideLabel, showPorts, showDims }) {
  const fill = node.fill === 'solid' ? theme.ink : node.fill === 'tint' ? theme.tint : 'none';
  const labelFill = node.fill === 'solid' ? theme.paper : theme.ink;
  return (
    <g transform={`translate(${node.x} ${node.y}) rotate(${node.rot || 0} ${node.w / 2} ${node.h / 2})`} style={{ color: theme.ink }} opacity={node.id === '__draft' ? 0.8 : 1}>
      {node.type === 'arrow' ? (
        <g>
          {node.route === 'elbow' || node.route === 'bend' ? (
            <path d={node.route === 'bend' ? freeBendPath(node.w, node.h) : freeElbowPath(node.w, node.h)} fill="none" stroke="currentColor" strokeWidth={strokePx(node.weight)} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ) : (
            <line x1={0} y1={0} x2={node.w} y2={node.h} stroke="currentColor" strokeWidth={strokePx(node.weight)} vectorEffect="non-scaling-stroke" />
          )}
          {node.head !== 'none' && (
            <polygon points={arrowHead(node.w, node.h, node.route === 'elbow' ? (node.w >= 0 ? 0 : 180) : node.route === 'bend' ? (node.h >= 0 ? 90 : -90) : (Math.atan2(node.h, node.w) * 180) / Math.PI)} fill="currentColor" />
          )}
        </g>
      ) : (
        <ShapeArt
          node={node}
          fill={fill}
          lettering={settings.lettering}
          caps={settings.caps}
          showLabel={!hideLabel}
          labelFill={labelFill}
        />
      )}
      {selected && (
        <g>
          <rect
            x={node.type === 'arrow' ? Math.min(0, node.w) : 0}
            y={node.type === 'arrow' ? Math.min(0, node.h) : 0}
            width={node.type === 'arrow' ? Math.max(12, Math.abs(node.w)) : node.w}
            height={node.type === 'arrow' ? Math.max(12, Math.abs(node.h)) : node.h}
            fill="none"
            stroke={theme.accent}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          {node.type === 'arrow' ? (
            <>
              <Handle x={0} y={0} zoom={cam.z} theme={theme} />
              <Handle x={node.w} y={node.h} zoom={cam.z} theme={theme} />
            </>
          ) : (
            HANDLE_IDS.map((id) => {
              const point = handlePoint({ x: 0, y: 0, w: node.w, h: node.h }, id);
              return <Handle key={id} x={point.x} y={point.y} zoom={cam.z} theme={theme} />;
            })
          )}
          <line
            x1={node.w / 2}
            y1={node.type === 'arrow' ? Math.min(0, node.h) : 0}
            x2={node.w / 2}
            y2={(node.type === 'arrow' ? Math.min(0, node.h) : 0) - 16 / cam.z}
            stroke={theme.accent}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={node.w / 2}
            cy={(node.type === 'arrow' ? Math.min(0, node.h) : 0) - 22 / cam.z}
            r={5 / cam.z}
            fill={theme.paper}
            stroke={theme.accent}
            strokeWidth={1.2 / cam.z}
          />
        </g>
      )}
      {showPorts && node.type !== 'arrow' && ['top', 'right', 'bottom', 'left'].map((side) => {
        const point = portPoint({ ...node, x: 0, y: 0, rot: 0 }, side, cam.z);
        const px = point.x;
        const py = point.y;
        return (
          <circle
            key={side}
            cx={px}
            cy={py}
            r={4.6 / cam.z}
            fill={theme.paper}
            stroke={theme.ink}
            strokeWidth={1.2 / cam.z}
          />
        );
      })}
      {showDims && node.type !== 'arrow' && (
        <text x={node.w / 2} y={-8 / cam.z} textAnchor="middle" fill={theme.accent} fontFamily="'IBM Plex Mono', monospace" fontSize={11 / cam.z}>
          {Math.round(node.w)} × {Math.round(node.h)}
        </text>
      )}
      {hover && !selected && node.type !== 'arrow' && (
        <rect width={node.w} height={node.h} fill="none" stroke={theme.accent} strokeOpacity="0.45" vectorEffect="non-scaling-stroke" />
      )}
    </g>
  );
}

function Handle({ x, y, zoom, theme }) {
  const size = 7 / zoom;
  return <rect x={x - size / 2} y={y - size / 2} width={size} height={size} fill={theme.paper} stroke={theme.accent} strokeWidth={1.2 / zoom} />;
}

function ConnectRubber({ sheet, link, theme }) {
  const from = sheet.nodes.find((node) => node.id === link.fromId);
  if (!from) return null;
  const side = link.fromSide || nearestSide(from, link.x, link.y);
  const start = sidePoint(from, side);
  const end = { x: link.x, y: link.y };
  if (link.route === 'bend') {
    const horizontal = side === 'left' || side === 'right';
    const corner = horizontal ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
    const angle = horizontal ? (end.y >= start.y ? 90 : -90) : (end.x >= start.x ? 0 : 180);
    return (
      <g style={{ color: theme.accent }}>
        <path d={geometryPath({ points: [start, corner, end], curve: false })} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {link.headed !== false && <polygon points={arrowHead(end.x, end.y, angle)} fill="currentColor" />}
      </g>
    );
  }
  const leave = nudge(start, side, 28, from.rot || 0);
  const horizontal = side === 'left' || side === 'right';
  const bend = horizontal ? { x: leave.x, y: end.y } : { x: end.x, y: leave.y };
  const angle = horizontal ? (end.x >= bend.x ? 0 : 180) : (end.y >= bend.y ? 90 : -90);
  return (
    <g style={{ color: theme.accent }}>
      <path d={geometryPath({ points: [start, leave, bend, end], curve: false })} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {link.headed !== false && <polygon points={arrowHead(end.x, end.y, angle)} fill="currentColor" />}
    </g>
  );
}

function nearestSide(node, x, y) {
  const local = toLocal(node, x, y);
  const distance = {
    left: Math.abs(local.x),
    right: Math.abs(local.x - node.w),
    top: Math.abs(local.y),
    bottom: Math.abs(local.y - node.h),
  };
  return Object.entries(distance).sort((a, b) => a[1] - b[1])[0][0];
}

function editorStyle(node, cam, theme, settings) {
  return {
    left: cam.x + node.x * cam.z,
    top: cam.y + node.y * cam.z,
    width: Math.max(48, node.w * cam.z),
    height: Math.max(28, node.h * cam.z),
    fontFamily: fontFamily(settings.lettering),
    fontSize: fontPx(node.text) * cam.z,
    fontWeight: settings.lettering === 'technical' ? 600 : 400,
    letterSpacing: '0.04em',
    textTransform: settings.lettering === 'technical' && settings.caps ? 'uppercase' : 'none',
    color: theme.ink,
    background: theme.paper,
    border: `1px solid ${theme.accent}`,
    textAlign: 'center',
    padding: '4px',
    zIndex: 2,
    transform: node.rot ? `rotate(${node.rot}deg)` : undefined,
    transformOrigin: 'center center',
  };
}

function midpoint(geometry) {
  if (geometry.curve) {
    const [a, b] = geometry.points;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10 };
  }
  const pts = geometry.points;
  const midIndex = Math.floor((pts.length - 1) / 2);
  const a = pts[midIndex];
  const b = pts[Math.min(pts.length - 1, midIndex + 1)];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 };
}

function visibleGrid(cam, svg, grid) {
  if (!svg) return [];
  const w = svg.clientWidth || 1200;
  const h = svg.clientHeight || 800;
  const x0 = (0 - cam.x) / cam.z;
  const y0 = (0 - cam.y) / cam.z;
  const x1 = (w - cam.x) / cam.z;
  const y1 = (h - cam.y) / cam.z;
  const span = Math.max(x1 - x0, y1 - y0);
  const step = span / grid > 180 ? grid * 5 : grid;
  const lines = [];
  for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
    lines.push({ x1: x, y1: y0, x2: x, y2: y1, major: Math.round(x / grid) % 5 === 0 });
  }
  for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
    lines.push({ x1: x0, y1: y, x2: x1, y2: y, major: Math.round(y / grid) % 5 === 0 });
  }
  return lines;
}

function normalizePlaced(x1, y1, x2, y2, grid, snap) {
  const rect = normalizeRect(snapTo(x1, grid, snap), snapTo(y1, grid, snap), snapTo(x2, grid, snap), snapTo(y2, grid, snap));
  rect.w = Math.max(36, rect.w);
  rect.h = Math.max(28, rect.h);
  return rect;
}

function withoutDraft(nodes) {
  return nodes.filter((node) => node.id !== '__draft');
}

function clampZoom(value) {
  return Math.max(0.2, Math.min(3, value));
}

function cursorFor(tool, space) {
  if (space || tool === 'hand') return 'grab';
  if (TOOLS.has(tool) && tool === 'select') return 'default';
  return 'crosshair';
}

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function zoomAt(cam, size, factor) {
  const cx = (size.w || 800) / 2;
  const cy = (size.h || 600) / 2;
  const zoom = clampZoom(cam.z * factor);
  const wx = (cx - cam.x) / cam.z;
  const wy = (cy - cam.y) / cam.z;
  return { z: zoom, x: cx - wx * zoom, y: cy - wy * zoom };
}

export function fitCamera(sheet, size, clean) {
  const bounds = contentBounds(sheet.nodes);
  const w = size.w || 800;
  const h = size.h || 600;
  const [left, right, top, bottom] = clean ? [130, 40, 40, 40] : [140, 60, 80, 160];
  const availW = Math.max(100, w - left - right);
  const availH = Math.max(100, h - top - bottom);
  const zoom = clampZoom(Math.min(availW / bounds.w, availH / bounds.h, 1.25));
  return {
    z: zoom,
    x: left + availW / 2 - (bounds.x + bounds.w / 2) * zoom,
    y: top + availH / 2 - (bounds.y + bounds.h / 2) * zoom,
  };
}
