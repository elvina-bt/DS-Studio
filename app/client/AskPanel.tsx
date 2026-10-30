import { useEffect, useRef, useState } from 'react';
import { parseMarkdown } from '../shared/docs.js';
import type { Tokens } from '../shared/model.js';
import { request } from './api.js';
import { DocContent } from './DocContent.js';
import ComponentEdit from './ComponentEdit.js';
import { ask, clearChat, stop, useChat } from './chat.js';

// Chat sur le DS, posé à Claude Code en lecture seule : il reçoit la doc, les
// tokens, les composants (avec un exemple chacun) et le composant ouvert. Il
// répond, cite ses pages, ouvre le composant concerné dans le laboratoire et
// peut y proposer des tokens ou un nouveau composant : rien n'est écrit sans
// validation. Le fil est commun à toutes les vues (chat.ts).
const suggestions = [
  'Quelle couleur pour un écart entre prévu et vécu ?',
  'Passe la bordure de la carte de prévision en couleur de marque',
  'Crée un composant « Résumé de vol » : site, durée, plafond atteint',
];

export default function AskPanel({
  tokens,
  focus = null,
  onNavigate,
}: {
  tokens: Tokens;
  // Composant ouvert dans le laboratoire : la question porte d'abord sur lui.
  focus?: string | null;
  onNavigate: (slug: string) => void;
}) {
  const { messages, pending, error } = useChat();
  const [question, setQuestion] = useState('');
  const [unavailable, setUnavailable] = useState('');
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    request<{ id: string; available: boolean; detail: string }[]>('agents')
      .then((agents) => {
        const claude = agents.find((a) => a.id === 'claude');
        setUnavailable(claude?.available ? '' : (claude?.detail ?? ''));
      })
      .catch(() => {});
  }, []);
  // Défilement du fil seul : la page ne bouge pas.
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, pending]);
  const send = (text: string) => {
    if (!text.trim() || pending) return;
    setQuestion('');
    void ask(text, focus);
  };

  return (
    <aside className="ask-panel" aria-label="Demander au Design System">
      <header>
        <h2>Une question sur desys ?</h2>
        {messages.length > 0 && (
          <button type="button" disabled={pending} onClick={clearChat}>
            Effacer
          </button>
        )}
      </header>
      <div className="ask-messages" ref={log} role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="ask-empty">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)}>
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
              {!!m.edits?.length && (
                <ComponentEdit edits={m.edits} tokens={tokens} />
              )}
              {m.create && (
                <p className="ask-lab">
                  Brouillon « {m.create.name} » ouvert dans le laboratoire.
                </p>
              )}
              {m.createError && (
                <p className="doc-warning">
                  Composant non retenu : {m.createError}.
                </p>
              )}
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
          send(question);
        }}
      >
        <textarea
          aria-label="Ta question"
          placeholder={
            focus
              ? 'Modifier ce composant, ou en créer un autre…'
              : 'Poser une question sur le design system…'
          }
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
              send(question);
            }
          }}
        />
        {pending ? (
          <button
            type="button"
            className="ask-send"
            aria-label="Arrêter"
            onClick={stop}
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
