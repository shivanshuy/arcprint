const HIGH = 0.58;
const MEDIUM = 0.42;
const GAP = 0.045;

let loader = null;
let indexPromise = null;

export function cosine(a, b) {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) dot += a[i] * b[i];
  return dot;
}

export function bestByCard(scored) {
  const best = new Map();
  for (const row of scored) {
    const prev = best.get(row.card.id);
    if (!prev || row.score > prev.score) best.set(row.card.id, row);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

export function decide(ranked) {
  const best = ranked[0];
  const second = ranked[1];
  const alternatives = ranked.filter((row) => row.score >= MEDIUM).slice(0, 3);
  if (!best || best.score < MEDIUM) {
    return { band: 'none', best: best || null, alternatives: ranked.slice(0, 3) };
  }
  const crowded = second && second.score >= MEDIUM && best.score - second.score < GAP;
  if (best.score >= HIGH && !crowded) {
    return { band: 'high', best, alternatives: [] };
  }
  return { band: 'medium', best, alternatives: alternatives.length ? alternatives : [best] };
}

export function loadExtractor(onStatus) {
  if (!loader) {
    loader = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
        progress_callback: (update) => {
          if (!onStatus) return;
          if (update.status === 'progress' && update.total) {
            onStatus(`Loading matcher ${Math.round((update.loaded / update.total) * 100)}%`);
          } else if (update.status === 'ready') {
            onStatus('Matcher ready');
          } else if (update.status) {
            onStatus('Loading matcher…');
          }
        },
      });
    })();
  }
  return loader;
}

async function vectorFor(extractor, text) {
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function prepareIndex(cards, onStatus) {
  if (!indexPromise) {
    indexPromise = (async () => {
      const extractor = await loadExtractor(onStatus);
      const rows = [];
      for (const card of cards) {
        for (const phrase of card.phrases) {
          rows.push({ card, phrase, vector: await vectorFor(extractor, phrase) });
        }
      }
      return { extractor, rows };
    })().catch((error) => {
      indexPromise = null;
      loader = null;
      throw error;
    });
  }
  return indexPromise;
}

export async function matchAsk(text, cards, onStatus) {
  const { extractor, rows } = await prepareIndex(cards, onStatus);
  const query = await vectorFor(extractor, text);
  const scored = rows.map((row) => ({ card: row.card, score: cosine(query, row.vector) }));
  const ranked = bestByCard(scored);
  return { ...decide(ranked), ranked };
}

export function resetMatcher() {
  loader = null;
  indexPromise = null;
}
