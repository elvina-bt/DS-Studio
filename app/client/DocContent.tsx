import { Fragment, type ReactNode } from 'react';
import { headingAnchors, type Block, type Inline } from '../shared/docs.js';
import { tokenKeys, type Tokens } from '../shared/model.js';
import { DSProvider } from './DesignSystem.js';
import {
  Badge,
  Button,
  Card,
  ForecastCard,
  LargeTitle,
  ListRow,
  ListToggle,
  SearchField,
  SectionHeader,
  TabBar,
} from './ParapenteDS.js';
import TokenPreview from './TokenPreview.js';

// Rendu React d'une page de doc : aucun HTML injecté. Les blocs `composant` et
// `tokens` sont vivants : ils utilisent les tokens enregistrés de l'atelier.
export const docComponents: Record<
  string,
  { name: string; render: () => ReactNode }
> = {
  bouton: {
    name: 'Bouton',
    render: () => (
      <div className="button-row">
        <Button>Nouvelle sortie</Button>
        <Button variant="secondary">Voir les sites</Button>
        <Button variant="danger">Supprimer le vol</Button>
        <Button disabled>Indisponible</Button>
      </div>
    ),
  },
  titre: {
    name: 'Titre et en-tête de section',
    render: () => (
      <>
        <LargeTitle>Préparer</LargeTitle>
        <SectionHeader>Prochaine sortie</SectionHeader>
      </>
    ),
  },
  recherche: {
    name: 'Champ de recherche',
    render: () => <SearchField label="Rechercher un site" />,
  },
  'carte-prevision': {
    name: 'Carte de prévision',
    render: () => (
      <ForecastCard
        place="Saint-Hilaire"
        slot="sam. 14 h–16 h"
        wind="12–18 km/h"
        summary="Ouest, rafales possibles l’après-midi."
        gusts="jusqu’à 25 km/h"
        ceiling="2 400 m"
        confidence="Moyenne · maille 1,3 km"
        note="Prévision enregistrée à 9 h 12, pour la comparer après le vol."
      />
    ),
  },
  badge: {
    name: 'Badge',
    render: () => (
      <div className="button-row">
        <Badge>Confiance moyenne</Badge>
        <Badge>Écart</Badge>
      </div>
    ),
  },
  'ligne-liste': {
    name: 'Ligne de liste',
    render: () => (
      <Card list>
        <ListRow label="Comprendre les rafales" chevron />
        <ListRow label="Niveau" value="Brevet initial" chevron />
        <ListRow label="Plafond" value="2 400 m" />
        <ListToggle label="Contraste renforcé" defaultChecked />
      </Card>
    ),
  },
  'barre-onglets': {
    name: 'Barre d’onglets',
    render: () => <TabBar current="Préparer" onChange={() => {}} inline />,
  },
};

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
}: {
  blocks: Block[];
  tokens: Tokens;
  onNavigate: (slug: string) => void;
  anchored?: boolean;
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
                />
              </aside>
            );
          case 'component': {
            const spec = docComponents[b.id];
            return spec ? (
              <figure
                key={i}
                className="doc-specimen"
                aria-label={`Aperçu : ${spec.name}`}
              >
                <DSProvider tokens={tokens}>
                  <div className="doc-specimen-stage">{spec.render()}</div>
                </DSProvider>
              </figure>
            ) : (
              <p key={i} className="doc-warning">
                Composant inconnu : {b.id}. Disponibles :{' '}
                {Object.keys(docComponents).join(', ')}.
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
