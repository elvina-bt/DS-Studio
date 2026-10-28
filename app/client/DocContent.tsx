import { Fragment } from 'react';
import { headingAnchors, type Block, type Inline } from '../shared/docs.js';
import { tokenKeys, type Tokens } from '../shared/model.js';
import { storyGroups } from '../shared/stories.js';
import StoryCanvas from './StoryCanvas.js';
import TokenPreview from './TokenPreview.js';

// Rendu React d'une page de doc : aucun HTML injecté. Les blocs `composant` (canvas
// de stories) et `tokens` sont vivants : ils utilisent les tokens enregistrés.
function InlineContent({
  nodes,
  onNavigate,
}: {
  nodes: Inline[];
  onNavigate: (slug: string) => void;
}) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.t === 'text') return <Fragment key={i}>{n.v}</Fragment>;
        if (n.t === 'code') return <code key={i}>{n.v}</code>;
        const inner = <InlineContent nodes={n.c} onNavigate={onNavigate} />;
        if (n.t === 'strong') return <strong key={i}>{inner}</strong>;
        if (n.t === 'em') return <em key={i}>{inner}</em>;
        if (n.href.startsWith('doc:'))
          return (
            <a
              key={i}
              href={`#/docs/${n.href.slice(4).split('#')[0]}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(n.href.slice(4));
              }}
            >
              {inner}
            </a>
          );
        return (
          <a
            key={i}
            href={n.href}
            target={n.href.startsWith('https://') ? '_blank' : undefined}
            rel="noreferrer"
          >
            {inner}
          </a>
        );
      })}
    </>
  );
}

function TokenTable({ group, tokens }: { group: string; tokens: Tokens }) {
  const keys = tokenKeys.filter(
    (k) => k === group || k.startsWith(`${group}.`),
  );
  if (!keys.length)
    return <p className="doc-warning">Groupe de tokens inconnu : {group}.</p>;
  return (
    <table className="doc-tokens">
      <thead>
        <tr>
          <th scope="col">Aperçu</th>
          <th scope="col">Token</th>
          <th scope="col">CSS</th>
          <th scope="col">Valeur</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <td>
              <TokenPreview
                tokenKey={k}
                value={tokens[k].$value}
                surface={String(tokens['color.surface'].$value)}
              />
            </td>
            <th scope="row">
              <code>{k}</code>
            </th>
            <td>
              <code>var(--{k.replace('.', '-')})</code>
            </td>
            <td>
              <code>
                {String(tokens[k].$value)}
                {tokens[k].$type === 'dimension' ? ' px' : ''}
              </code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const calloutLabel = { do: 'À faire', dont: 'À éviter', note: 'Note' };

export function DocContent({
  blocks,
  tokens,
  onNavigate,
  anchored = false,
  page,
  story,
}: {
  blocks: Block[];
  tokens: Tokens;
  onNavigate: (slug: string) => void;
  anchored?: boolean;
  // Page affichée et variante demandée par un lien `?story=`.
  page?: string;
  story?: string | null;
}) {
  const anchors = anchored ? headingAnchors(blocks) : null;
  const inline = (c: Inline[]) => (
    <InlineContent nodes={c} onNavigate={onNavigate} />
  );
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'heading': {
            const H = `h${b.level}` as 'h2' | 'h3' | 'h4';
            return (
              <H key={i} id={anchors?.get(i)?.id}>
                {inline(b.c)}
              </H>
            );
          }
          case 'paragraph':
            return <p key={i}>{inline(b.c)}</p>;
          case 'quote':
            return <blockquote key={i}>{inline(b.c)}</blockquote>;
          case 'code':
            return (
              <pre key={i}>
                <code>{b.v}</code>
              </pre>
            );
          case 'rule':
            return <hr key={i} />;
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            return (
              <L key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </L>
            );
          }
          case 'table':
            return (
              <table key={i} className="doc-table">
                <thead>
                  <tr>
                    {b.head.map((h, j) => (
                      <th key={j} scope="col">
                        {inline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, k) => (
                        <td key={k}>{inline(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'callout':
            return (
              <aside key={i} className={`doc-callout ${b.kind}`}>
                <strong>
                  {calloutLabel[b.kind]}
                  {b.title && ` · ${b.title}`}
                </strong>
                <DocContent
                  blocks={b.c}
                  tokens={tokens}
                  onNavigate={onNavigate}
                  page={page}
                  story={story}
                />
              </aside>
            );
          case 'component': {
            const group = storyGroups.find((g) => g.id === b.id);
            return group ? (
              <StoryCanvas
                key={`${i}-${group.id}`}
                group={group}
                tokens={tokens}
                page={page}
                selected={story}
              />
            ) : (
              <p key={i} className="doc-warning">
                Composant inconnu : {b.id}. Disponibles :{' '}
                {storyGroups.map((g) => g.id).join(', ')}.
              </p>
            );
          }
          case 'tokens':
            return <TokenTable key={i} group={b.group} tokens={tokens} />;
        }
      })}
    </>
  );
}
