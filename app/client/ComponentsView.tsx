import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tokens } from '../shared/model.js';
import { storyId } from '@desys/stories.js';
import { Button, DesysProvider } from '@desys/components.js';
import { labGroup, labStatus } from '../shared/lab.js';
import { request } from './api.js';
import StoryCanvas from './StoryCanvas.js';
import AskPanel from './AskPanel.js';
import { dropDraft, refreshLab, useChat, useGroups, useLab } from './chat.js';

// Laboratoire, façon Storybook : la liste des composants et de leurs variantes
// à gauche, le canvas en grand au centre, et le chat à droite pour modifier le
// composant ouvert ou en construire un nouveau. Un composant demandé au chat
// arrive ici en brouillon ; « Ajouter à desys » l'écrit (desys/components/lab)
// et crée sa page de doc.
export default function ComponentsView({
  tokens,
  component,
  story,
  onNavigate,
  onOpenDoc,
}: {
  tokens: Tokens;
  component: string | null;
  story: string | null;
  onNavigate: (component: string, story: string | null) => void;
  onOpenDoc: (slug: string) => void;
}) {
  const all = useGroups();
  const lab = useLab();
  const { draft } = useChat();
  const creating = component === 'nouveau' && !draft;
  const isDraft =
    !!draft && (component === draft.id || component === 'nouveau');
  const draftGroup = useMemo(() => (draft ? labGroup(draft) : null), [draft]);
  const group =
    (isDraft && draftGroup) || all.find((g) => g.id === component) || all[0];
  const savedSpec = lab?.components.find((c) => c.id === group.id);
  const saved = !!savedSpec;
  // État dans PFE – Components d'un composant du laboratoire enregistré.
  const figmaStatus = savedSpec && !isDraft ? labStatus(savedSpec) : null;
  const figmaText = {
    'à créer': 'À reporter dans Figma',
    'à mettre à jour': 'À mettre à jour dans Figma',
    'à publier': 'Dans Figma · à publier',
    iso: 'Iso Figma',
  } as const;
  // Page de doc qui montre ce composant (bloc {{composant:id}}).
  const [docs, setDocs] = useState<{ slug: string; body: string }[]>([]);
  const loadDocs = () =>
    request<{ docs: { slug: string; body: string }[] }>('docs')
      .then((r) => setDocs(r.docs))
      .catch(() => {});
  useEffect(() => {
    void loadDocs();
  }, []);
  const doc = docs.find((d) => d.body.includes(`{{composant:${group.id}}}`));
  // Variante allumée dans la liste : celle que montrent les propriétés.
  const [active, setActive] = useState<string | null>(story);
  const [search, setSearch] = useState('');
  // Message rattaché au composant qu'il concerne : il disparaît ailleurs.
  const [status, setStatus] = useState<{
    kind: 'busy' | 'done' | 'error';
    text: string;
    for: string | null;
    // Page de doc créée ou existante, ouverte depuis la confirmation.
    doc?: string;
  } | null>(null);
  const doneDialog = useRef<HTMLDialogElement>(null);
  const showDone = status?.kind === 'done' && status.for === component;
  useEffect(() => {
    if (showDone && !doneDialog.current?.open) doneDialog.current?.showModal();
    if (!showDone && doneDialog.current?.open) doneDialog.current.close();
  }, [showDone]);
  const query = search.trim().toLowerCase();
  const found = (text: string) => text.toLowerCase().includes(query);
  const listed = useMemo(() => {
    const extra =
      draftGroup && !all.some((g) => g.id === draftGroup.id)
        ? [draftGroup]
        : [];
    return [...all, ...extra]
      .map((g) => ({
        group: g,
        stories: query
          ? found(g.name)
            ? g.stories
            : g.stories.filter((s) => found(s.name))
          : g.id === group.id && !creating
            ? g.stories
            : [],
      }))
      .filter((x) => !query || found(x.group.name) || x.stories.length);
  }, [query, group.id, all, draftGroup, creating]);

  async function addToDesys() {
    if (!draft) return;
    setStatus({ kind: 'busy', text: '', for: component });
    try {
      const r = await request<{ files: string[]; doc: string | null }>('lab', {
        spec: draft,
      });
      await refreshLab();
      await loadDocs();
      const id = draft.id;
      dropDraft();
      onNavigate(id, null);
      setStatus({
        kind: 'done',
        text: `${r.files[0]}${r.doc ? ' et sa page de doc ont été créés' : ' a été mis à jour'}. Pense à commiter dans desys, puis à reporter le composant dans Figma.`,
        for: id,
        doc:
          r.doc ??
          docs.find((d) => d.body.includes(`{{composant:${id}}}`))?.slug,
      });
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message, for: component });
    }
  }

  return (
    <div className="docs playground">
      <nav className="docs-nav" aria-label="Composants">
        <input
          type="search"
          className="docs-search"
          aria-label="Rechercher un composant"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher"
        />
        {listed.map(({ group: g, stories }) => (
          <div key={g.id} className="docs-nav-section">
            <ul>
              <li>
                <a
                  href={`#/laboratoire/${g.id}`}
                  aria-current={
                    g.id === group.id && !active && !creating
                      ? 'page'
                      : undefined
                  }
                  className="playground-group"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(g.id, null);
                  }}
                >
                  {g.name}
                  {draftGroup?.id === g.id && (
                    <span className="lab-tag">brouillon</span>
                  )}
                  {'lab' in g && draftGroup?.id !== g.id && (
                    <span className="lab-tag">labo</span>
                  )}
                </a>
              </li>
              {stories.map((s) => {
                const id = storyId(g.id, s.id);
                return (
                  <li key={s.id}>
                    <a
                      href={`#/laboratoire/${g.id}?story=${id}`}
                      aria-current={active === id ? 'page' : undefined}
                      className="playground-story"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(g.id, id);
                      }}
                    >
                      {s.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <button
          type="button"
          className="docs-new"
          onClick={() => onNavigate('nouveau', null)}
        >
          + Nouveau composant
        </button>
      </nav>
      <div className="docs-main playground-main">
        {creating ? (
          <div className="lab-empty">
            <h2>Nouveau composant</h2>
            <p>
              Décris-le dans le chat, à droite : ce qu’il montre, ses variantes.
              Claude l’assemble avec les composants de desys et l’ouvre ici en
              brouillon ; tu l’ajustes en continuant la conversation.
            </p>
          </div>
        ) : (
          <>
            <header className="playground-head">
              <h2>
                {group.name}
                {figmaStatus && (
                  <span
                    className={`lab-figma is-${figmaStatus === 'iso' ? 'iso' : 'pending'}`}
                    title={
                      figmaStatus === 'à publier'
                        ? 'Créé dans PFE – Components : publier la bibliothèque dans Figma (Assets → Publier).'
                        : figmaStatus === 'iso'
                          ? 'Publié dans PFE – Components.'
                          : 'Demander à Claude Code : « reporte le laboratoire dans Figma » (essai à blanc, puis validation).'
                    }
                  >
                    {figmaText[figmaStatus]}
                  </span>
                )}
              </h2>
              {doc && !isDraft && (
                <button
                  type="button"
                  className="docs-edit"
                  onClick={() => onOpenDoc(doc.slug)}
                >
                  Voir la documentation
                </button>
              )}
            </header>
            {isDraft && (
              <div className="lab-draft" role="group" aria-label="Brouillon">
                <p>
                  {saved ? 'Modifications en brouillon' : 'Brouillon'} · pas
                  encore dans desys. Continue dans le chat pour l’ajuster.
                </p>
                {/* Bouton principal du design system desys lui-même. */}
                <DesysProvider tokens={tokens}>
                  <button
                    type="button"
                    className="lab-draft-quiet"
                    onClick={dropDraft}
                  >
                    Abandonner
                  </button>
                  <Button
                    variant="primary"
                    disabled={!lab?.writable || status?.kind === 'busy'}
                    onClick={() => void addToDesys()}
                  >
                    {saved ? 'Enregistrer dans desys' : 'Ajouter à desys'}
                  </Button>
                </DesysProvider>
                {!lab?.writable && (
                  <p className="lab-note">
                    Écriture dans desys désactivée sur ce poste.
                  </p>
                )}
              </div>
            )}
            {status?.kind === 'error' && status.for === component && (
              <p className="error" role="alert">
                {status.text}
              </p>
            )}
            <StoryCanvas
              key={isDraft ? JSON.stringify(draft) : group.id}
              group={group}
              tokens={tokens}
              selected={story}
              large
              linkFor={(id) => `/#/laboratoire/${group.id}?story=${id}`}
              onStoryChange={setActive}
            />
          </>
        )}
      </div>
      {/* Confirmation d'ajout : fenêtre verte, page de doc en un clic. */}
      <dialog
        ref={doneDialog}
        className="lab-success"
        aria-labelledby="lab-success-title"
        onClose={() => setStatus(null)}
      >
        <span className="lab-success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M6 12.5l4 4L18 8" />
          </svg>
        </span>
        <h2 id="lab-success-title">Ajouté à desys</h2>
        <p>{status?.kind === 'done' ? status.text : ''}</p>
        <DesysProvider tokens={tokens}>
          <button
            type="button"
            className="lab-draft-quiet"
            onClick={() => setStatus(null)}
          >
            Fermer
          </button>
          {status?.doc && (
            <Button
              variant="secondary"
              onClick={() => {
                const slug = status.doc!;
                setStatus(null);
                onOpenDoc(slug);
              }}
            >
              Ouvrir la page de doc
            </Button>
          )}
        </DesysProvider>
      </dialog>
      <AskPanel
        tokens={tokens}
        focus={creating ? null : group.id}
        onNavigate={(slug) => onOpenDoc(slug.split('#')[0])}
      />
    </div>
  );
}
