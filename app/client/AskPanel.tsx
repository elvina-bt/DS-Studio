import { useEffect, useRef, useState } from 'react';
import { parseMarkdown } from '../shared/docs.js';
import type { Tokens } from '../shared/model.js';
import { request } from './api.js';
import { DocContent } from './DocContent.js';

// Questions sur le DS, posées à Claude Code en lecture seule : il reçoit la doc,
// les tokens validés et les règles, répond et cite ses pages. Rien n'est écrit ;
// la conversation vit en mémoire, jamais dans le navigateur.
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
  onNavigate,
}: {
  tokens: Tokens;
  onNavigate: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState('');
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    request<{ id: string; available: boolean; detail: string }[]>('agents')
      .then((agents) => {
        const claude = agents.find((a) => a.id === 'claude');
        setUnavailable(claude?.available ? '' : (claude?.detail ?? ''));
      })
      .catch(() => {});
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, pending]);
  useEffect(() => () => controller.current?.abort(), []);

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

  if (!open)
    return (
      <button
        type="button"
        className="ask-toggle"
        aria-expanded={false}
        onClick={() => setOpen(true)}
      >
        Demander
      </button>
    );

  return (
    <aside
      className="ask-panel"
      aria-label="Demander au Design System"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <header>
        <h2>Demander</h2>
        <div>
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
          <button
            type="button"
            aria-label="Fermer"
            aria-expanded={true}
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
      </header>
      <div className="ask-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="ask-empty">
            <p>
              Claude lit ta doc, tes tokens et tes règles pour répondre. Il ne
              modifie rien.
            </p>
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
        <div ref={end} />
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
          ref={input}
          aria-label="Ta question"
          placeholder="Pose une question sur le DS…"
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
          <button type="button" onClick={() => controller.current?.abort()}>
            Arrêter
          </button>
        ) : (
          <button className="studio-primary" disabled={!question.trim()}>
            Envoyer
          </button>
        )}
      </form>
    </aside>
  );
}
