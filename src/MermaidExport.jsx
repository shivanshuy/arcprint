import { useEffect, useMemo, useRef, useState } from 'react';
import { mermaidDrafts } from './diagramText.js';
import { downloadBlob, sheetFilename } from './export.js';
import { renderMermaid } from './mermaidView.js';
import { activeSheet } from './model.js';
import { PreviewPanel } from './previewPanel.jsx';

const MODES = [
  { id: 'original', label: 'Opened file' },
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'block', label: 'Block' },
];

export default function MermaidExport({ doc, onClose, onCopied }) {
  const drafts = useMemo(() => mermaidDrafts(doc), [doc]);
  const modes = MODES.filter((mode) => mode.id !== 'original' || drafts.original);
  const [mode, setMode] = useState(modes[0].id);
  const [text, setText] = useState(drafts[modes[0].id]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const viewRef = useRef(null);
  const gen = useRef(0);

  useEffect(() => {
    setText(drafts[mode] || drafts.flowchart);
  }, [drafts, mode]);

  useEffect(() => {
    const id = ++gen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const svg = await renderMermaid(text);
        if (id !== gen.current || !viewRef.current) return;
        viewRef.current.innerHTML = svg;
        setError('');
      } catch (err) {
        if (id !== gen.current) return;
        if (viewRef.current) viewRef.current.innerHTML = '';
        setError(String(err?.str || err?.message || 'Mermaid could not draw this text.'));
      } finally {
        if (id === gen.current) setBusy(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [text]);

  function download() {
    const sheet = activeSheet(doc);
    const body = text.endsWith('\n') ? text : `${text}\n`;
    downloadBlob(new Blob([body], { type: 'text/plain;charset=utf-8' }), sheetFilename(doc, sheet, 'mmd'));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      onCopied?.('Copied Mermaid');
    } catch {
      onCopied?.('Copy the text from the field');
    }
  }

  return (
    <PreviewPanel title="Mermaid" onClose={onClose}>
      <div className="mermaid-body">
        <p className="lead">
          This is how the current sheet looks in Mermaid. Flowchart opens in every editor.
          Block keeps the grid. Edit the text if you want, then copy or download.
        </p>
        <div className="seg" role="tablist">
          {modes.map((item) => (
            <button
              key={item.id}
              className={mode === item.id ? 'on' : ''}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={`mermaid-view${error ? ' err' : ''}`} aria-live="polite">
          {busy && <p className="hint tight">Drawing…</p>}
          {error && <p className="hint tight">{error}</p>}
          <div ref={viewRef} />
        </div>
        <textarea
          className="code"
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          aria-label="Mermaid source"
        />
        <footer>
          <button className="act" onClick={copy}>Copy</button>
          <button className="act" onClick={download}>Download</button>
        </footer>
      </div>
    </PreviewPanel>
  );
}
