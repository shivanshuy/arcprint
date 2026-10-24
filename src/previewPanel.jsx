import { useCallback, useEffect, useRef, useState } from 'react';

let lastPos = null;

function clampPos(x, y, w, h) {
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - w - pad);
  const maxY = Math.max(pad, window.innerHeight - h - pad);
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  };
}

export function PreviewPanel({ title, children, onClose }) {
  const boxRef = useRef(null);
  const drag = useRef(null);
  const stop = useRef(null);
  const [pos, setPos] = useState(lastPos);
  const [held, setHeld] = useState(false);

  const moveTo = useCallback((clientX, clientY) => {
    const current = drag.current;
    if (!current) return;
    const next = clampPos(clientX - current.dx, clientY - current.dy, current.w, current.h);
    lastPos = next;
    setPos(next);
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
    setHeld(false);
    stop.current?.();
  }, []);

  useEffect(() => () => stop.current?.(), []);

  function onHeaderDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('button')) return;
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    drag.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
    setHeld(true);
    event.preventDefault();
    stop.current?.();
    const onMove = (next) => moveTo(next.clientX, next.clientY);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    stop.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      stop.current = null;
    };
    moveTo(event.clientX, event.clientY);
  }

  return (
    <section
      ref={boxRef}
      className={`panel float mermaid-panel${held ? ' dragging' : ''}${pos ? ' moved' : ''}`}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined}
    >
      <header
        className="drag-bar"
        onPointerDown={onHeaderDown}
        title="Hold and drag to move"
      >
        <h2>{title}</h2>
        <button className="close" onClick={onClose}>Close</button>
      </header>
      {children}
    </section>
  );
}
