import { useEffect, useState, type ReactNode } from 'react';
import { storyGroups } from '@desys/stories.js';
import { DesysProvider } from '@desys/components.js';
import type { Tokens } from '../shared/model.js';
import { request } from './api.js';
import { render } from './StoryCanvas.js';
import send from './home/send.svg';

// Accueil de desys (maquette PFE – Components, nœud 17:50) : une question à
// Claude, puis les éléments récents, les tokens et les composants ajoutés.
type Item = {
  kind: 'token' | 'component' | 'doc';
  id: string;
  title: string;
  status: 'ajouté' | 'modifié';
  date: string;
};
type Recent = { recent: Item[]; tokens: Item[]; components: Item[] };

// Page de doc qui montre un groupe de tokens.
const tokenPage: Record<string, string> = {
  color: 'couleurs',
  font: 'typographie',
  space: 'espacements',
  radius: 'espacements',
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-Math.round(minutes / 1440), 'day');
}

function TokenPreview({ id, tokens }: { id: string; tokens: Tokens }) {
  const token = tokens[id as keyof Tokens];
  if (!token) return null;
  if (token.$type === 'color')
    return (
      <div className="home-swatches" aria-hidden="true">
        <span className="on-light">
          <i style={{ background: String(token.$value) }} />
        </span>
        <span className="on-dark">
          <i style={{ background: String(token.$value) }} />
        </span>
      </div>
    );
  if (token.$type === 'fontFamily')
    return (
      <span className="home-type" style={{ fontFamily: String(token.$value) }}>
        Aa Bb
      </span>
    );
  if (id.startsWith('radius.'))
    return (
      <span
        className="home-radius"
        style={{ borderRadius: Number(token.$value) }}
        aria-hidden="true"
      />
    );
  if (id.startsWith('space.'))
    return (
      <span
        className="home-space"
        style={{ width: Number(token.$value) * 6 }}
        aria-hidden="true"
      />
    );
  return (
    <span className="home-type" style={{ fontSize: Number(token.$value) }}>
      Aa
    </span>
  );
}

function Card({
  item,
  tokens,
  onOpen,
}: {
  item: Item;
  tokens: Tokens;
  onOpen: (item: Item) => void;
}) {
  const group = storyGroups.find((g) => g.id === item.id);
  let preview: ReactNode = null;
  if (item.kind === 'token')
    preview = <TokenPreview id={item.id} tokens={tokens} />;
  else if (group)
    preview = (
      <DesysProvider tokens={tokens}>
        <div className="home-component">{render(group.stories[0].node)}</div>
      </DesysProvider>
    );
  else preview = <span className="home-doc">{item.title}</span>;
  const category =
    item.kind === 'token'
      ? 'Tokens'
      : item.kind === 'component'
        ? 'Components'
        : 'Documentation';
  return (
    <article className="home-card">
      <button
        type="button"
        className="home-preview"
        onClick={() => onOpen(item)}
        aria-label={`Ouvrir ${item.title}`}
      >
        <span
          className={`home-status is-${item.status === 'ajouté' ? 'added' : 'modified'}`}
        >
          {item.status}
        </span>
        <span className="home-preview-stage">{preview}</span>
      </button>
      <div className="home-card-head">
        <h3>{item.title}</h3>
        <span className="home-chip">{category}</span>
      </div>
      <div className="home-card-meta">
        <span className="home-date">
          Mis à jour le <time dateTime={item.date}>{longDate(item.date)}</time>
        </span>
        <span className="home-ago">{ago(item.date)}</span>
      </div>
    </article>
  );
}

export default function HomeView({
  tokens,
  notice,
  onAsk,
  onOpen,
}: {
  tokens: Tokens;
  notice?: ReactNode;
  onAsk: (question: string) => void;
  onOpen: (target: { view: 'docs' | 'composants'; slug: string }) => void;
}) {
  const [data, setData] = useState<Recent | null>(null);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  useEffect(() => {
    request<Recent>('recent')
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);
  const open = (item: Item) =>
    onOpen(
      item.kind === 'component'
        ? { view: 'composants', slug: item.id }
        : item.kind === 'token'
          ? { view: 'docs', slug: tokenPage[item.id.split('.')[0]] ?? 'tokens' }
          : { view: 'docs', slug: item.id },
    );
  const submit = () => {
    const q = question.trim();
    if (q) onAsk(q);
  };
  const section = (title: ReactNode, items: Item[] | undefined) => (
    <section className="home-section">
      <h2>{title}</h2>
      {items && items.length > 0 ? (
        <div className="home-grid">
          {items.map((item) => (
            <Card
              key={`${item.kind}:${item.id}`}
              item={item}
              tokens={tokens}
              onOpen={open}
            />
          ))}
        </div>
      ) : (
        <p className="home-empty">
          {data ? 'Rien pour l’instant.' : error || 'Chargement…'}
        </p>
      )}
    </section>
  );

  return (
    <div className="home">
      <div className="home-hero">
        <h1>
          Bienvenue sur <span>desys</span>
        </h1>
        <form
          className="home-ask"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            aria-label="Une question sur desys"
            placeholder="Quel token pour le contour de la carte de prévision ?"
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
                submit();
              }
            }}
          />
          <button
            type="submit"
            aria-label="Envoyer la question"
            disabled={!question.trim()}
          >
            <img src={send} alt="" width="34" height="34" />
          </button>
        </form>
        {notice}
      </div>
      {section('Éléments récents', data?.recent)}
      {section(
        <>
          <span className="home-chip is-title">Tokens</span> ajoutés récemment
        </>,
        data?.tokens,
      )}
      {section(
        <>
          <span className="home-chip is-title">Components</span> ajoutés
          récemment
        </>,
        data?.components,
      )}
    </div>
  );
}
