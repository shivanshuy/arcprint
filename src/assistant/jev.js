let loading = null;
let ready = null;

export function jevIsReady() {
  return Boolean(ready);
}

export function prepareJev(onStatus) {
  if (ready) return Promise.resolve(ready);
  if (!loading) {
    loading = (async () => {
      const { env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = 1;
      }
      const { OpenJev } = await import('open-jev');
      const model = await OpenJev.load({
        model: 'kev-0.6b',
        dtype: 'auto',
        device: 'auto',
        onProgress: ({ progress }) => {
          if (onStatus) onStatus(`Loading decision model ${Math.round(progress * 100)}%`);
        },
      });
      ready = model;
      return model;
    })().catch((error) => {
      loading = null;
      ready = null;
      throw error;
    });
  }
  return loading;
}

export async function scoreJev(text, cards) {
  if (!ready) return null;
  const { choice } = await import('open-jev');
  const options = cards.map((card) => card.title);
  const descriptions = Object.fromEntries(cards.map((card) => [card.title, card.phrases[0]]));
  const byTitle = new Map(cards.map((card) => [card.title, card]));
  const [answer] = await ready.decide(text, [
    choice('Which Arcprint command matches this request?', options, descriptions),
  ]);
  const ranked = Object.entries(answer.probabilities)
    .map(([title, probability]) => ({ id: byTitle.get(title)?.id, title, probability }))
    .filter((row) => row.id)
    .sort((a, b) => b.probability - a.probability);
  const best = ranked[0];
  const second = ranked[1];
  if (!best) return null;
  return {
    bestId: best.id,
    bestProbability: best.probability,
    secondProbability: second ? second.probability : 0,
    ranked,
  };
}
