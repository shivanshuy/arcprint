import { useEffect, useRef, useState } from 'react';
import { combine } from './agree.js';
import { CAPABILITIES, CARDS, STARTERS, cardById } from './catalog.js';
import { prepareJev, scoreJev } from './jev.js';
import { matchAsk, prepareIndex } from './match.js';

export default function Assistant({ api }) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('');
  const [jevText, setJevText] = useState('');
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);
  const matcherStarted = useRef(false);
  const jevStarted = useRef(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [log, open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!matcherStarted.current) {
      matcherStarted.current = true;
      setStatus('loading');
      setStatusText('Loading matcher…');
      prepareIndex(CARDS, (text) => setStatusText(text)).then(() => {
        setStatus('ready');
        setStatusText('');
      }).catch(() => {
        matcherStarted.current = false;
        setStatus('failed');
        setStatusText('The matcher did not load. Check the network and open Ask again.');
      });
    }
    if (!jevStarted.current) {
      jevStarted.current = true;
      setJevText('Loading decision model…');
      prepareJev((text) => setJevText(text)).then(() => {
        setJevText('');
      }).catch(() => {
        jevStarted.current = false;
        setJevText('Decision model did not load. Ask is using the matcher.');
      });
    }
    return undefined;
  }, [open]);

  function push(entry) {
    setLog((current) => [...current, entry].slice(-16));
  }

  async function runCard(card) {
    if (!card) return;
    if (card.kind === 'help') {
      push({ role: 'result', text: card.answer });
      return;
    }
    if (card.confirm) {
      push({ role: 'result', text: card.confirmText, confirmId: card.id });
      return;
    }
    const note = await card.run(apiRef.current);
    push({ role: 'result', text: note || card.done });
  }

  async function onAsk(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    push({ role: 'user', text });
    if (status !== 'ready') {
      push({
        role: 'result',
        text: status === 'failed'
          ? 'The matcher is not available, so I will not guess. Use a suggestion below.'
          : 'The matcher is still loading.',
      });
      return;
    }
    setBusy(true);
    try {
      const [matcher, jev] = await Promise.all([
        matchAsk(text, CARDS),
        scoreJev(text, CARDS).catch((error) => {
          console.warn('Decision model failed on that request.', error);
          return null;
        }),
      ]);
      const decision = combine(matcher, jev, text);
      if (decision.kind === 'run') runCard(cardById(decision.cardId));
      else if (decision.kind === 'chips') {
        push({ role: 'result', text: 'Did you mean one of these?', chips: decision.cardIds });
      } else {
        push({ role: 'result', text: CAPABILITIES });
      }
    } catch {
      push({ role: 'result', text: 'The matcher failed on that request.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`ask${open ? ' open' : ''}`}>
      {open && (
        <section className="ask-panel" aria-label="Ask Arcprint">
          <header>
            <h2>Ask</h2>
            <div className="ask-head-row">
              <button type="button" className="close" onClick={() => setOpen(false)}>Close</button>
              {log.length > 0 && (
                <button type="button" className="ask-clear" onClick={() => setLog([])}>Clear</button>
              )}
            </div>
          </header>
          <p className="ask-note">
            {statusText || jevText || 'Runs an Arcprint action. It does not write an answer.'}
          </p>
          <div className="ask-log" ref={scroller} role="log" aria-live="polite">
            {log.length === 0 && (
              <div className="ask-chips">
                {STARTERS.map((card) => (
                  <button key={card.id} type="button" className="ask-chip" onClick={() => runCard(card)}>
                    {card.title}
                  </button>
                ))}
              </div>
            )}
            {log.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className={`ask-line ${entry.role}`}>
                <p>{entry.text}</p>
                {entry.chips && (
                  <div className="ask-chips">
                    {entry.chips.map((id) => {
                      const card = cardById(id);
                      if (!card) return null;
                      return (
                        <button key={id} type="button" className="ask-chip" onClick={() => runCard(card)}>
                          {card.title}
                        </button>
                      );
                    })}
                  </div>
                )}
                {entry.confirmId && (
                  <div className="ask-chips">
                    <button
                      type="button"
                      className="ask-chip"
                      onClick={async () => {
                        const card = cardById(entry.confirmId);
                        if (!card) return;
                        const note = await card.run(apiRef.current);
                        push({ role: 'result', text: note || card.done });
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <form className="ask-form" onSubmit={onAsk}>
            <input
              className="field"
              value={input}
              placeholder="Ask Arcprint to do something"
              onChange={(event) => setInput(event.target.value)}
              disabled={busy}
            />
            <button className="act" type="submit" disabled={busy || !input.trim()}>Ask</button>
          </form>
        </section>
      )}
      <button type="button" className="ask-toggle" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide ask' : 'Ask'}
      </button>
    </div>
  );
}
