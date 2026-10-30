import { Fragment, useContext, useState } from 'react';
import { headingAnchors, type Block, type Inline } from '../shared/docs.js';
import { tokenKeys, type TokenKey, type Tokens } from '../shared/model.js';
import { TokenEditContext } from './TokenEdit.js';
import { useGroups } from './chat.js';
import StoryCanvas from './StoryCanvas.js';
import TokenPreview from './TokenPreview.js';

// Rendu React d'une page de doc : aucun HTML injecté. Les blocs `composant` (canvas
// de stories) et `tokens` sont vivants : ils utilisent les tokens enregistrés.
export function InlineContent({
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

// Valeur d'un token, modifiable quand l'app fournit TokenEditContext : la
// proposition ouvre le diff à valider, rien n'est écrit avant.
function TokenValue({
  tokenKey,
  tokens,
}: {
  tokenKey: TokenKey;
  tokens: Tokens;
}) {
  const propose = useContext(TokenEditContext);
  const token = tokens[tokenKey];
  const [draft, setDraft] = useState<string | null>(null);
  const shown = (
    <code>
      {String(token.$value)}
      {token.$type === 'dimension' ? ' px' : ''}
    </code>
  );
  if (!propose) return shown;
  const submit = () => {
    if (draft === null) return;
    const value = token.$type === 'dimension' ? Number(draft) : draft.trim();
    propose(tokenKey, value);
    setDraft(null);
  };
  if (draft === null)
    return (
      <span className="token-value">
        {shown}
        <button
          type="button"
          className="token-edit"
          aria-label={`Modifier ${tokenKey}`}
          onClick={() => setDraft(String(token.$value))}
        >
          Modifier
        </button>
      </span>
    );
  return (
    // Pas de <form> : le tableau peut vivre dans l'éditeur de page, lui-même un
    // formulaire ; un formulaire imbriqué soumettrait la page et la rechargerait.
    <span
      role="group"
      aria-label={`Modifier ${tokenKey}`}
      className="token-value is-editing"
    >
      {token.$type === 'color' && /^#[0-9a-f]{6}$/i.test(draft) && (
        <input
          type="color"
          aria-label={`Couleur de ${tokenKey}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
        />
      )}
      <input
        aria-label={`Nouvelle valeur de ${tokenKey}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') setDraft(null);
        }}
        autoFocus
      />
      <button type="button" className="token-edit" onClick={submit}>
        Proposer
      </button>
      <button
        type="button"
        className="token-edit"
        onClick={() => setDraft(null)}
      >
        Annuler
      </button>
    </span>
  );
}

export function TokenTable({
  group,
  tokens,
}: {
  group: string;
  tokens: Tokens;
}) {
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
              <TokenValue tokenKey={k} tokens={tokens} />
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
  // Composants de desys et du laboratoire.
  const storyGroups = useGroups();
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
                selected={story}
                linkFor={
                  page ? (id) => `/#/docs/${page}?story=${id}` : undefined
                }
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
