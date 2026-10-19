const MEDIUM = 0.42;
const JEV_SURE = 0.35;
const JEV_GAP = 0.08;
const JEV_FLOOR = 0.08;
const CHIP_LIMIT = 5;

function matcherIds(matcher) {
  return (matcher.ranked || [])
    .filter((row) => row.score >= MEDIUM)
    .map((row) => row.card.id);
}

function jevIds(jev) {
  return (jev.ranked || [])
    .filter((row) => row.probability >= JEV_FLOOR)
    .map((row) => row.id);
}

export function asksToClear(text) {
  const raw = String(text || '').toLowerCase();
  if (/\bclean mode\b/.test(raw) || /\blogo\b/.test(raw)) return false;
  const words = raw.match(/[a-z]+/g) || [];
  const clear = words.some((word) => word === 'clean' || word === 'clear' || word === 'wipe' || word === 'empty');
  const destroy = words.some((word) => word === 'delete' || word === 'remove');
  return clear && !destroy;
}

function clearChoices(matcher, jev) {
  const fromModels = jev
    ? mergeChips(matcherIds(matcher), jevIds(jev))
    : (matcher.ranked || []).filter((row) => row.score >= MEDIUM).map((row) => row.card.id);
  const lead = ['sheet.clear', 'sheet.delete'];
  const used = new Set(lead);
  return [...lead, ...fromModels.filter((id) => !used.has(id))].slice(0, CHIP_LIMIT);
}

export function jevConfident(jev) {
  if (!jev?.bestId) return false;
  return jev.bestProbability >= JEV_SURE && jev.bestProbability - jev.secondProbability >= JEV_GAP;
}

export function mergeChips(matcherRankedIds, jevRankedIds, limit = CHIP_LIMIT) {
  const jevSet = new Set(jevRankedIds);
  const shared = matcherRankedIds.filter((id) => jevSet.has(id));
  const used = new Set(shared);
  const out = [...shared];
  let mi = 0;
  let ji = 0;
  while (out.length < limit && (mi < matcherRankedIds.length || ji < jevRankedIds.length)) {
    while (mi < matcherRankedIds.length && used.has(matcherRankedIds[mi])) mi += 1;
    if (mi < matcherRankedIds.length && out.length < limit) {
      used.add(matcherRankedIds[mi]);
      out.push(matcherRankedIds[mi]);
      mi += 1;
    }
    while (ji < jevRankedIds.length && used.has(jevRankedIds[ji])) ji += 1;
    if (ji < jevRankedIds.length && out.length < limit) {
      used.add(jevRankedIds[ji]);
      out.push(jevRankedIds[ji]);
      ji += 1;
    }
  }
  return out;
}

export function combine(matcher, jev, text = '') {
  if (asksToClear(text)) return { kind: 'chips', cardIds: clearChoices(matcher, jev) };
  if (!jev) {
    if (matcher.band === 'high' && matcher.best) return { kind: 'run', cardId: matcher.best.card.id };
    if (matcher.band === 'medium') return { kind: 'chips', cardIds: matcher.alternatives.map((row) => row.card.id) };
    return { kind: 'none' };
  }
  const same = matcher.best && matcher.best.card.id === jev.bestId;
  if (matcher.band === 'high' && same && jevConfident(jev)) {
    return { kind: 'run', cardId: matcher.best.card.id };
  }
  const cardIds = mergeChips(matcherIds(matcher), jevIds(jev));
  if (!cardIds.length) return { kind: 'none' };
  return { kind: 'chips', cardIds };
}
