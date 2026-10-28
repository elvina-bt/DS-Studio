import { useEffect, useMemo, useRef, useState } from 'react';
import {
  docSchema,
  docSections,
  headingAnchors,
  lineDiff,
  parseMarkdown,
  serializeDoc,
  type DiffLine,
  type Doc,
  type DocSection,
} from '../shared/docs.js';
import type { Tokens } from '../shared/model.js';
import { request } from './api.js';
import { DocContent } from './DocContent.js';
import PageOutline from './PageOutline.js';

type Stored = Doc & { base: string };

// Le brouillon porte `base` (empreinte lue) en plus de la page : on le retire
// avant toute validation. Un brouillon incomplet ne doit jamais casser le rendu.
// Lignes modifiées et deux lignes de contexte ; `null` marque une coupure.
function withContext(diff: DiffLine[], around = 2): (DiffLine | null)[] {
  const keep = diff.map((l) => l.kind !== 'same');
  const near = diff.map((_, i) =>
    keep.slice(Math.max(0, i - around), i + around + 1).some(Boolean),
  );
  const out: (DiffLine | null)[] = [];
  diff.forEach((l, i) => {
    if (near[i]) out.push(l);
    else if (out.length && out[out.length - 1] !== null) out.push(null);
  });
  return out[out.length - 1] === null ? out.slice(0, -1) : out;
}
const strip = ({ base: _base, ...doc }: Stored): Doc => doc;
function fileText(d: Stored): string | null {
  try {
    return serializeDoc(strip(d));
  } catch {
    return null;
  }
}

// Documentation façon zeroheight : pages Markdown de workspace/docs/, lues et
// éditées ici. Un enregistrement montre le diff du fichier avant d'écrire.
const snippets: { label: string; text: string }[] = [
  { label: 'À faire', text: '\n:::do Titre\nCe qu’il faut faire.\n:::\n' },
  { label: 'À éviter', text: '\n:::dont Titre\nCe qu’il faut éviter.\n:::\n' },
  { label: 'Note', text: '\n:::note\nPrécision utile.\n:::\n' },
  { label: 'Composant', text: '\n{{composant:bouton}}\n' },
  { label: 'Tokens', text: '\n{{tokens:color}}\n' },
  {
    label: 'Tableau',
    text: '\n| Colonne | Colonne |\n| ------- | ------- |\n| Valeur | Valeur |\n',
  },
];

export const slugify = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'page';

export default function DocsView({
  tokens,
  slug,
  onNavigate,
}: {
  tokens: Tokens;
  slug: string | null;
  onNavigate: (slug: string | null) => void;
}) {
  const [docs, setDocs] = useState<Stored[]>([]);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Stored | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const result = await request<{ docs: Stored[]; invalid: string[] }>('docs');
    setDocs(result.docs);
    setInvalid(result.invalid);
    setLoaded(true);
    return result.docs;
  }
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    if (confirming) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirming]);

  const sorted = useMemo(
    () =>
      [...docs].sort(
        (a, b) => a.order - b.order || a.title.localeCompare(b.title),
      ),
    [docs],
  );
  const current =
    sorted.find((d) => d.slug === slug) ?? (slug ? undefined : sorted[0]);
  const original =
    draft && docs.find((d) => d.slug === draft.slug && draft.base);
  const dirty =
    !!draft &&
    (!original ||
      JSON.stringify(strip(draft)) !== JSON.stringify(strip(original)));
  const query = search.trim().toLowerCase();

  const leave = () =>
    !dirty || window.confirm('Abandonner les modifications non enregistrées ?');
  function go(next: string | null) {
    if (!leave()) return;
    setDraft(null);
    setError('');
    setNotice('');
    onNavigate(next);
  }
  function insert(text: string) {
    if (!draft) return;
    const el = textarea.current;
    const at = el?.selectionStart ?? draft.body.length;
    const body = draft.body.slice(0, at) + text + draft.body.slice(at);
    setDraft({ ...draft, body });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + text.length, at + text.length);
    });
  }
  async function save() {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const stored = await request<Stored>('docs/save', {
        base: draft.base,
        doc: strip(draft),
      });
      await load();
      setDraft(null);
      setConfirming(false);
      setNotice(
        `Page « ${stored.title} » enregistrée dans workspace/docs/${stored.slug}.md.`,
      );
      onNavigate(stored.slug);
    } catch (e) {
      setError((e as Error).message);
      setConfirming(false);
    }
    setSaving(false);
  }

  const diff =
    draft && confirming
      ? lineDiff((original && fileText(original)) || '', fileText(draft) ?? '')
      : [];
  const editing = draft !== null;
  const shown = editing ? draft : current;
  const body = !editing && current ? current.body : '';
  const blocks = useMemo(() => parseMarkdown(body), [body]);
  const anchors = useMemo(() => [...headingAnchors(blocks).values()], [blocks]);

  return (
    <div className="docs">
      <nav className="docs-nav" aria-label="Pages de documentation">
        <input
          type="search"
          className="docs-search"
          aria-label="Rechercher dans la doc"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher"
        />
        {docSections.map((section) => {
          const pages = sorted.filter(
            (d) =>
              d.section === section.id &&
              (!query ||
                `${d.title} ${d.summary} ${d.body}`
                  .toLowerCase()
                  .includes(query)),
          );
          if (!pages.length) return null;
          return (
            <div key={section.id} className="docs-nav-section">
              <h3>{section.label}</h3>
              <ul>
                {pages.map((d) => (
                  <li key={d.slug}>
                    <a
                      href={`#/docs/${d.slug}`}
                      aria-current={d.slug === shown?.slug ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        go(d.slug);
                      }}
                    >
                      {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <button
          type="button"
          className="docs-new"
          onClick={() => {
            if (!leave()) return;
            setError('');
            setNotice('');
            setDraft({
              slug: '',
              base: '',
              title: '',
              section: (current?.section ?? 'composants') as DocSection,
              order: 100,
              summary: '',
              status: 'brouillon',
              figma: [],
              body: '## Usage\n\nÀ quoi sert cette page.\n',
            });
          }}
        >
          + Nouvelle page
        </button>
        {invalid.length > 0 && (
          <p className="doc-warning">
            Fichiers ignorés : {invalid.join(', ')}.
          </p>
        )}
      </nav>

      <div className="docs-main">
        <div className="feedback" aria-live="polite">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </div>
        {!loaded && !error && <p>Chargement de la documentation…</p>}
        {loaded && !shown && (
          <div className="docs-empty">
            <h2>{slug ? 'Page introuvable' : 'Aucune page pour l’instant'}</h2>
          </div>
        )}
        {editing && draft && (
          <form
            className="docs-editor"
            aria-label="Modifier la page"
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              if (!dirty)
                return setNotice('Aucune modification à enregistrer.');
              const checked = docSchema.safeParse(strip(draft));
              if (!checked.success)
                return setError(
                  'Page incomplète : ' +
                    checked.error.issues
                      .map((i) => `${String(i.path[0])} (${i.message})`)
                      .join(' ; '),
                );
              setConfirming(true);
            }}
          >
            <div className="docs-meta">
              <label className="field">
                Titre
                <input
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                      slug: draft.base ? draft.slug : slugify(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                Section
                <select
                  value={draft.section}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      section: e.target.value as DocSection,
                    })
                  }
                >
                  {docSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Statut
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as Doc['status'],
                    })
                  }
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="stable">Stable</option>
                </select>
              </label>
              <label className="field">
                Ordre
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={draft.order}
                  onChange={(e) =>
                    setDraft({ ...draft, order: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label className="field docs-wide">
                Résumé
                <input
                  maxLength={300}
                  value={draft.summary}
                  onChange={(e) =>
                    setDraft({ ...draft, summary: e.target.value })
                  }
                />
              </label>
              <label className="field docs-wide">
                Noms dans Figma
                <input
                  value={draft.figma.join(', ')}
                  placeholder="Bouton, Button, color"
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      figma: e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean)
                        .slice(0, 12),
                    })
                  }
                />
              </label>
            </div>
            <div
              className="docs-toolbar"
              role="group"
              aria-label="Insérer un bloc"
            >
              {snippets.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => insert(s.text)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="docs-split">
              <label className="field">
                Contenu (Markdown)
                <textarea
                  ref={textarea}
                  value={draft.body}
                  maxLength={64000}
                  spellCheck
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </label>
              <div className="docs-preview" aria-label="Aperçu">
                <DocContent
                  blocks={parseMarkdown(draft.body)}
                  tokens={tokens}
                  onNavigate={() => {}}
                />
              </div>
            </div>
            <div className="button-row">
              <button
                className="studio-primary"
                disabled={!dirty || !draft.title.trim()}
              >
                Enregistrer…
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!leave()) return;
                  setDraft(null);
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        )}
        {!editing && shown && (
          <article className="docs-page">
            <header className="docs-head">
              <div className="docs-crumb">
                <span>
                  {docSections.find((s) => s.id === shown.section)?.label}
                </span>
                <button
                  type="button"
                  className="docs-edit"
                  onClick={() => {
                    setNotice('');
                    setDraft({ ...shown });
                  }}
                >
                  Modifier la page
                </button>
              </div>
              <h2>{shown.title}</h2>
              {shown.summary && <p className="docs-summary">{shown.summary}</p>}
            </header>
            <DocContent
              blocks={blocks}
              tokens={tokens}
              onNavigate={(s) => go(s)}
              anchored
            />
            <PageOutline title={shown.title} anchors={anchors} />
          </article>
        )}
      </div>

      <dialog
        ref={dialog}
        className="docs-dialog"
        aria-labelledby="docs-diff-title"
        onClose={() => setConfirming(false)}
      >
        <h2 id="docs-diff-title">Valider la page</h2>
        <p>
          <code>workspace/docs/{draft?.slug}.md</code>
        </p>
        <pre className="docs-diff" aria-label="Différences">
          {withContext(diff).map((l, i) =>
            l === null ? (
              <span key={i} className="diff-gap">
                {'  …\n'}
              </span>
            ) : (
              <span key={i} className={`diff-${l.kind}`}>
                {l.kind === 'add' ? '+ ' : l.kind === 'del' ? '− ' : '  '}
                {l.text}
                {'\n'}
              </span>
            ),
          )}
        </pre>
        <div className="button-row">
          <button type="button" onClick={() => setConfirming(false)}>
            Ne pas enregistrer
          </button>
          <button
            type="button"
            className="studio-primary"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
