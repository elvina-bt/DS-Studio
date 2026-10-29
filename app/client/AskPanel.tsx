import { useEffect, useRef, useState } from 'react';
import { parseMarkdown } from '../shared/docs.js';
import type { Tokens } from '../shared/model.js';
import { request } from './api.js';
import { DocContent } from './DocContent.js';

// Questions sur le DS, posées à Claude Code en lecture seule : il reçoit la doc,
// les tokens validés et les règles, répond et cite ses pages. Rien n'est écrit ;
// la conversation vit en mémoire, jamais dans le navigateur. Colonne toujours
// ouverte, dans le style de claude.ai.
type Message = {
  role: 'user' | 'assistant';
  text: string;
  sources?: { slug: string; title: string }[];
};
const suggestions = [
  'Quelle couleur pour un écart entre prévu et vécu ?',
  'Comment formuler une prévision incertaine ?',
  'Quelle taille de texte pour les valeurs météo ?',
];

export default function AskPanel({
  tokens,
  seed,
  onNavigate,
}: {
  tokens: Tokens;
  // Question venue de l'accueil : envoyée une fois, dès l'ouverture.
  seed?: { question: string; id: number };
  onNavigate: (slug: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState('');
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    request<{ id: string; available: boolean; detail: string }[]>('agents')
      .then((agents) => {
        const claude = agents.find((a) => a.id === 'claude');
        setUnavailable(claude?.available ? '' : (claude?.detail ?? ''));
      })
      .catch(() => {});
    return () => controller.current?.abort();
  }, []);
  const sent = useRef<number | null>(null);
  useEffect(() => {
    if (!seed || sent.current === seed.id) return;
    sent.current = seed.id;
    void ask(seed.question);
  }, [seed]);
  // Défilement du fil seul : la page de doc ne bouge pas.
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, pending]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    const history = messages
      .slice(-8)
      .map(({ role, text }) => ({ role, text: text.slice(0, 6000) }));
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setError('');
    setPending(true);
    controller.current = new AbortController();
    try {
      const reply = await request<{
        message: string;
        sources: Message['sources'];
      }>('ask', { question: q, history }, controller.current.signal);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: reply.message, sources: reply.sources },
      ]);
    } catch (e) {
      if (!controller.current.signal.aborted) setError((e as Error).message);
    }
    controller.current = null;
    setPending(false);
  }

  return (
    <aside className="ask-panel" aria-label="Demander au Design System">
      <header>
        <h2>Une question sur desys ?</h2>
        {messages.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMessages([]);
              setError('');
            }}
          >
            Effacer
          </button>
        )}
      </header>
      <div className="ask-messages" ref={log} role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="ask-empty">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => void ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <p key={i} className="ask-question">
              {m.text}
            </p>
          ) : (
            <div key={i} className="ask-answer">
              <DocContent
                blocks={parseMarkdown(m.text)}
                tokens={tokens}
                onNavigate={onNavigate}
              />
              {!!m.sources?.length && (
                <ul className="ask-sources" aria-label="Pages citées">
                  {m.sources.map((s) => (
                    <li key={s.slug}>
                      <a
                        href={`#/docs/${s.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(s.slug);
                        }}
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
        {pending && <p className="ask-pending">Claude réfléchit…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      {unavailable && <p className="ask-unavailable">{unavailable}</p>}
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <textarea
          aria-label="Ta question"
          placeholder="Poser une question sur le design system…"
          rows={2}
          maxLength={4000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void ask(question);
            }
          }}
        />
        {pending ? (
          <button
            type="button"
            className="ask-send"
            aria-label="Arrêter"
            onClick={() => controller.current?.abort()}
          >
            <span aria-hidden="true">■</span>
          </button>
        ) : (
          <button
            className="ask-send"
            aria-label="Envoyer"
            disabled={!question.trim()}
          >
            <span aria-hidden="true">↑</span>
          </button>
        )}
      </form>
    </aside>
  );
}
