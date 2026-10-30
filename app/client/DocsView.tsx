import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react';
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
import AskPanel from './AskPanel.js';
import PageEditor from './PageEditor.js';

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

// Documentation façon zeroheight : pages Markdown de desys/docs/, lues et
// éditées ici comme dans Notion. Un enregistrement montre le diff avant d'écrire.

// Titre et résumé : une ligne qui s'allonge, sans retour à la ligne.
function AutoTitle({
  value,
  onChange,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault();
      }}
      {...props}
    />
  );
}

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
  story,
  onNavigate,
}: {
  tokens: Tokens;
  slug: string | null;
  story: string | null;
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
  const [figmaText, setFigmaText] = useState('');
  const main = useRef<HTMLDivElement>(null);

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
    !!draft && (!original || fileText(draft) !== fileText(original));
  const query = search.trim().toLowerCase();

  const leave = () =>
    !dirty || window.confirm('Abandonner les modifications non enregistrées ?');
  // Une cible `slug#section-…` ouvre la page puis fait défiler jusqu'à la section.
  const [section, setSection] = useState<string | null>(null);
  function go(target: string | null) {
    if (!leave()) return;
    const [next, anchor] = target ? target.split('#') : [null];
    setDraft(null);
    setError('');
    setNotice('');
    setSection(anchor ?? null);
    if (next !== slug) onNavigate(next);
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
        `Page « ${stored.title} » enregistrée dans desys/docs/${stored.slug}.md.`,
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
  const editButton = current && (
    <button
      type="button"
      className="docs-edit"
      onClick={() => {
        setNotice('');
        setFigmaText(current.figma.join(', '));
        setDraft({ ...current });
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" />
      </svg>
      Modifier la page
    </button>
  );
  const shown = editing ? draft : current;
  const body = !editing && current ? current.body : '';
  const blocks = useMemo(() => parseMarkdown(body), [body]);
  const anchors = useMemo(() => [...headingAnchors(blocks).values()], [blocks]);
  useEffect(() => {
    if (!section || editing) return;
    const el = document.getElementById(section);
    if (!el) return;
    el.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
    setSection(null);
  }, [section, blocks, editing]);

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
            setFigmaText('');
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

      <div className="docs-main" ref={main}>
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
            className="docs-editor docs-page"
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
            <header className="docs-head">
              <div className="docs-crumb">
                <span>
                  {docSections.find((s) => s.id === draft.section)?.label}
                </span>
              </div>
              <AutoTitle
                className="be-title"
                aria-label="Titre"
                placeholder="Sans titre"
                required
                maxLength={120}
                value={draft.title}
                onChange={(title) =>
                  setDraft({
                    ...draft,
                    title,
                    slug: draft.base ? draft.slug : slugify(title),
                  })
                }
              />
              <AutoTitle
                className="be-summary"
                aria-label="Résumé"
                placeholder="Ajouter un résumé…"
                maxLength={300}
                value={draft.summary}
                onChange={(summary) => setDraft({ ...draft, summary })}
              />
              <dl className="be-props">
                <div>
                  <dt>Section</dt>
                  <dd>
                    <select
                      aria-label="Section"
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
                  </dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>
                    <select
                      aria-label="Statut"
                      className={`be-status is-${draft.status}`}
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
                  </dd>
                </div>
                <div>
                  <dt>Ordre</dt>
                  <dd>
                    <input
                      aria-label="Ordre"
                      type="number"
                      min={0}
                      max={999}
                      value={draft.order}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          order: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Noms Figma</dt>
                  <dd>
                    <input
                      aria-label="Noms dans Figma"
                      value={figmaText}
                      placeholder="Vide"
                      onChange={(e) => {
                        setFigmaText(e.target.value);
                        setDraft({
                          ...draft,
                          figma: e.target.value
                            .split(',')
                            .map((v) => v.trim())
                            .filter(Boolean)
                            .slice(0, 12),
                        });
                      }}
                    />
                  </dd>
                </div>
              </dl>
            </header>
            <PageEditor
              key={draft.base || 'new'}
              body={draft.body}
              tokens={tokens}
              onChange={(body) => setDraft((d) => d && { ...d, body })}
            />
            <div
              className="be-savebar"
              role="group"
              aria-label="Enregistrement"
            >
              <span>
                {dirty
                  ? 'Modifications non enregistrées'
                  : 'Aucune modification'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!leave()) return;
                  setDraft(null);
                }}
              >
                Annuler
              </button>
              <button
                className="studio-primary"
                disabled={!dirty || !draft.title.trim()}
              >
                Enregistrer…
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
                {editButton}
              </div>
              <h2>{shown.title}</h2>
              {shown.summary && <p className="docs-summary">{shown.summary}</p>}
            </header>
            <DocContent
              blocks={blocks}
              tokens={tokens}
              onNavigate={(s) => go(s)}
              anchored
              page={shown.slug}
              story={story}
            />
            {/* Grand écran : le bouton reste visible au défilement, au-dessus du sommaire. */}
            <div className="docs-rail">
              {editButton}
              <PageOutline
                title={shown.title}
                anchors={anchors}
                scroller={main}
              />
            </div>
          </article>
        )}
      </div>

      <AskPanel tokens={tokens} onNavigate={(s) => go(s)} />

      <dialog
        ref={dialog}
        className="docs-dialog"
        aria-labelledby="docs-diff-title"
        onClose={() => setConfirming(false)}
      >
        <h2 id="docs-diff-title">Valider la page</h2>
        <p>
          <code>desys/docs/{draft?.slug}.md</code>
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
