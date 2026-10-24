let mermaid;

async function loadMermaid() {
  if (mermaid) return mermaid;
  const mod = await import('mermaid');
  mermaid = mod.default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: 'Arial Narrow, sans-serif',
    maxTextSize: 200000,
    maxEdges: 2000,
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      wrappingWidth: 280,
      useMaxWidth: true,
    },
    sequence: {
      useMaxWidth: true,
      wrap: true,
      mirrorActors: true,
    },
  });
  return mermaid;
}

let serial = 0;

export async function renderMermaid(text) {
  const api = await loadMermaid();
  const source = String(text || '').trim() || 'flowchart LR\n  empty["Empty sheet"]';
  const { svg } = await api.render(`arcprint-mmd-${serial++}`, source);
  return svg;
}
