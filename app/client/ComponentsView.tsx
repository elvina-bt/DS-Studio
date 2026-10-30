import { useEffect, useMemo, useState } from 'react';
import type { Tokens } from '../shared/model.js';
import { storyGroups, storyId } from '@desys/stories.js';
import { request } from './api.js';
import StoryCanvas from './StoryCanvas.js';
import AskPanel from './AskPanel.js';
import DesignPanel from './DesignPanel.js';

// Onglet Composants, façon Storybook : la liste des composants et de leurs
// variantes à gauche, le canvas en grand au centre, sans le texte de la doc,
// le panneau Design sous le canvas (tokens du composant), et le chat sur le
// design system à droite, comme dans la documentation.
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
  const group = storyGroups.find((g) => g.id === component) ?? storyGroups[0];
  // Page de doc qui montre ce composant (bloc {{composant:id}}).
  const [docs, setDocs] = useState<{ slug: string; body: string }[]>([]);
  useEffect(() => {
    request<{ docs: { slug: string; body: string }[] }>('docs')
      .then((r) => setDocs(r.docs))
      .catch(() => {});
  }, []);
  const doc = docs.find((d) => d.body.includes(`{{composant:${group.id}}}`));
  // Variante allumée dans la liste : celle que montrent les propriétés.
  const [active, setActive] = useState<string | null>(story);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const found = (text: string) => text.toLowerCase().includes(query);
  const groups = useMemo(
    () =>
      storyGroups
        .map((g) => ({
          group: g,
          stories: query
            ? found(g.name)
              ? g.stories
              : g.stories.filter((s) => found(s.name))
            : g.id === group.id
              ? g.stories
              : [],
        }))
        .filter((x) => !query || found(x.group.name) || x.stories.length),
    [query, group.id],
  );

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
        {groups.map(({ group: g, stories }) => (
          <div key={g.id} className="docs-nav-section">
            <ul>
              <li>
                <a
                  href={`#/composants/${g.id}`}
                  aria-current={
                    g.id === group.id && !active ? 'page' : undefined
                  }
                  className="playground-group"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(g.id, null);
                  }}
                >
                  {g.name}
                </a>
              </li>
              {stories.map((s) => {
                const id = storyId(g.id, s.id);
                return (
                  <li key={s.id}>
                    <a
                      href={`#/composants/${g.id}?story=${id}`}
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
      </nav>
      <div className="docs-main playground-main">
        <header className="playground-head">
          <h2>{group.name}</h2>
          {doc && (
            <button
              type="button"
              className="docs-edit"
              onClick={() => onOpenDoc(doc.slug)}
            >
              Voir la documentation
            </button>
          )}
        </header>
        <div className="design-draft">
          <StoryCanvas
            key={group.id}
            group={group}
            tokens={tokens}
            selected={story}
            large
            linkFor={(id) => `/#/composants/${group.id}?story=${id}`}
            onStoryChange={setActive}
          />
        </div>
        <DesignPanel component={group.id} tokens={tokens} />
      </div>
      <AskPanel
        tokens={tokens}
        onNavigate={(slug) => onOpenDoc(slug.split('#')[0])}
      />
    </div>
  );
}
