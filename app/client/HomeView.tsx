import { useEffect, useState, type ReactNode } from 'react';
import { storyGroups } from '@desys/stories.js';
import { DesysProvider } from '@desys/components.js';
import type { Tokens } from '../shared/model.js';
import { inlineText, parseMarkdown, type Block } from '../shared/docs.js';
import { request } from './api.js';
import { render } from './StoryCanvas.js';

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
type DocPage = { slug: string; title: string; summary: string; body: string };

// Aperçu dégrossi d'une page de doc : son titre, puis ses premiers blocs en
// traits (intertitres foncés, texte gris, encadrés teintés, canvas, tableaux).
const lines = (text: string, max = 3) => {
  const n = Math.min(max, Math.max(1, Math.round(text.length / 70)));
  return Array.from({ length: n }, (_, i) => (
    <i
      key={i}
      className="sk-line"
      style={{ width: i === n - 1 && n > 1 ? '62%' : '100%' }}
    />
  ));
};
function sketchBlock(b: Block, i: number) {
  switch (b.t) {
    case 'heading':
      return (
        <b key={i} className={`sk-heading is-h${b.level}`}>
          {inlineText(b.c)}
        </b>
      );
    case 'paragraph':
    case 'quote':
      return (
        <span key={i} className={`sk-text is-${b.t}`}>
          {lines(inlineText(b.c))}
        </span>
      );
    case 'list':
      return (
        <span key={i} className="sk-list">
          {b.items.slice(0, 3).map((it, j) => (
            <i
              key={j}
              className="sk-line"
              style={{ width: `${Math.min(90, 30 + inlineText(it).length)}%` }}
            />
          ))}
        </span>
      );
    case 'callout':
      return (
        <span key={i} className={`sk-callout is-${b.kind}`}>
          <i className="sk-line is-strong" style={{ width: '30%' }} />
          <i className="sk-line" />
        </span>
      );
    case 'component':
      return (
        <span key={i} className="sk-canvas">
          <i />
        </span>
      );
    case 'tokens':
    case 'table':
      return (
        <span key={i} className="sk-table">
          {[0, 1, 2].map((j) => (
            <span key={j}>
              <i />
              <i />
              <i />
            </span>
          ))}
        </span>
      );
    case 'code':
      return (
        <span key={i} className="sk-code">
          {lines(b.v, 2)}
        </span>
      );
    default:
      return <hr key={i} className="sk-rule" />;
  }
}
function DocSketch({ doc }: { doc: DocPage }) {
  return (
    <div className="sk-page" aria-hidden="true">
      <b className="sk-title">{doc.title}</b>
      {doc.summary && (
        <span className="sk-summary">{lines(doc.summary, 2)}</span>
      )}
      {parseMarkdown(doc.body).slice(0, 7).map(sketchBlock)}
    </div>
  );
}

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
  docs,
  onOpen,
}: {
  item: Item;
  tokens: Tokens;
  docs: DocPage[];
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
  else {
    const doc = docs.find((d) => d.slug === item.id);
    preview = doc ? (
      <DocSketch doc={doc} />
    ) : (
      <span className="home-doc">{item.title}</span>
    );
  }
  const category =
    item.kind === 'token'
      ? 'Tokens'
      : item.kind === 'component'
        ? 'Components'
        : 'Documentation';
  return (
    // Toute la carte s'ouvre au clic ; au clavier, le bouton de l'aperçu.
    <article className="home-card" onClick={() => onOpen(item)}>
      <button
        type="button"
        className="home-preview"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(item);
        }}
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

// Idées de questions, écrites puis effacées comme à la machine dans le champ
// vide. La flèche → reprend l'idée affichée (Tab reste libre pour quitter le
// champ). Mouvement réduit : l'idée change sans frappe.
const promptIdeas = [
  'Quel token pour le contour de la carte de prévision ?',
  'Quelle couleur pour un écart entre prévu et vécu ?',
  'Passe la bordure de la carte de prévision en couleur de marque',
  'Comment formuler une prévision incertaine ?',
  'Quand utiliser le bouton secondaire plutôt que le principal ?',
  'Quelle taille de texte pour les valeurs météo ?',
];
function useTypewriter(ideas: string[], active: boolean) {
  const [state, setState] = useState({ index: 0, shown: ideas[0] });
  useEffect(() => {
    if (!active) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0;
    let length = still ? ideas[0].length : 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const idea = ideas[index];
      let wait = 42;
      if (still) {
        index = (index + 1) % ideas.length;
        length = ideas[index].length;
        wait = 4000;
      } else if (!erasing && length < idea.length) length++;
      else if (!erasing) {
        erasing = true;
        wait = 2200;
      } else if (length > 0) {
        length--;
        wait = 16;
      } else {
        erasing = false;
        index = (index + 1) % ideas.length;
        wait = 380;
      }
      setState({ index, shown: ideas[index].slice(0, length) });
      timer = setTimeout(tick, wait);
    };
    setState({ index, shown: ideas[index].slice(0, length) });
    timer = setTimeout(tick, still ? 4000 : 600);
    return () => clearTimeout(timer);
  }, [active, ideas]);
  return { idea: ideas[state.index], shown: state.shown };
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
  const [docs, setDocs] = useState<DocPage[]>([]);
  const hint = useTypewriter(promptIdeas, !question);
  useEffect(() => {
    request<{ docs: DocPage[] }>('docs')
      .then((r) => setDocs(r.docs))
      .catch(() => {});
  }, []);
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
              docs={docs}
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
            placeholder={hint.shown}
            rows={2}
            maxLength={4000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              // Champ vide : → reprend l'idée en cours d'écriture.
              if (e.key === 'ArrowRight' && !question) {
                e.preventDefault();
                setQuestion(hint.idea);
                return;
              }
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
            <svg aria-hidden="true" viewBox="0 0 34 34" width="34" height="34">
              <path d="M17 23V11M12.5 15.5 17 11l4.5 4.5" />
            </svg>
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
