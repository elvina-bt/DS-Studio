import { useEffect, useState } from 'react';
import type { Tokens } from '../shared/model.js';
import { storyGroups, storyId } from '@desys/stories.js';
import { request } from './api.js';
import StoryCanvas from './StoryCanvas.js';

// Onglet Composants, façon Storybook : la liste des composants et de leurs
// variantes à gauche, le canvas en grand au centre, sans le texte de la doc.
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

  return (
    <div className="docs playground">
      <nav className="docs-nav" aria-label="Composants">
        {storyGroups.map((g) => (
          <div key={g.id} className="docs-nav-section">
            <ul>
              <li>
                <a
                  href={`#/composants/${g.id}`}
                  aria-current={
                    g.id === group.id && !story ? 'page' : undefined
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
              {g.id === group.id &&
                g.stories.map((s) => {
                  const id = storyId(g.id, s.id);
                  return (
                    <li key={s.id}>
                      <a
                        href={`#/composants/${g.id}?story=${id}`}
                        aria-current={story === id ? 'page' : undefined}
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
        <StoryCanvas
          key={group.id}
          group={group}
          tokens={tokens}
          selected={story}
          large
          linkFor={(id) => `/#/composants/${group.id}?story=${id}`}
        />
      </div>
    </div>
  );
}
