import { useState, type ReactNode } from 'react';
import type { Patch, TokenKey, Tokens } from '../shared/model.js';
import { DSProvider } from './DesignSystem.js';
import {
  Badge,
  Button,
  Card,
  ForecastCard,
  LargeTitle,
  ListRow,
  SearchField,
  SectionHeader,
  TabBar,
} from './ParapenteDS.js';

// Revue façon « Review updates » de Figma : chaque composant du DS parapente
// touché par le changement est rendu deux fois, avec les tokens avant et après.
const specimens: { name: string; uses: TokenKey[]; render: () => ReactNode }[] =
  [
    {
      name: 'Bouton / Principal',
      uses: [
        'color.brand',
        'color.onBrand',
        'radius.control',
        'space.sm',
        'space.md',
        'font.body',
        'font.family',
      ],
      render: () => <Button>Nouvelle sortie</Button>,
    },
    {
      name: 'Bouton / Survol',
      uses: ['color.brandHover', 'color.onBrand', 'radius.control'],
      render: () => (
        <span className="ds-button primary review-hover">Nouvelle sortie</span>
      ),
    },
    {
      name: 'Bouton / Secondaire',
      uses: ['color.brand', 'color.surface', 'radius.control', 'font.body'],
      render: () => <Button variant="secondary">Voir les sites</Button>,
    },
    {
      name: 'Titre et en-tête de section',
      uses: [
        'font.heading',
        'font.body',
        'font.family',
        'color.text',
        'color.muted',
        'color.canvas',
        'space.md',
        'space.lg',
      ],
      render: () => (
        <div className="review-canvas">
          <LargeTitle>Préparer</LargeTitle>
          <SectionHeader>Prochaine sortie</SectionHeader>
        </div>
      ),
    },
    {
      name: 'Champ de recherche',
      uses: [
        'color.border',
        'color.surface',
        'color.text',
        'radius.control',
        'space.sm',
        'space.md',
        'font.body',
      ],
      render: () => <SearchField label="Rechercher un site" />,
    },
    {
      name: 'Carte de prévision',
      uses: [
        'color.surface',
        'color.border',
        'color.brand',
        'color.text',
        'color.muted',
        'space.sm',
        'space.md',
        'radius.control',
        'font.body',
      ],
      render: () => (
        <ForecastCard
          place="Saint-Hilaire"
          slot="sam. 14 h–16 h"
          wind="12–18 km/h"
          summary="Ouest, rafales possibles l’après-midi."
          gusts="jusqu’à 25 km/h"
          ceiling="2 400 m"
          confidence="Moyenne · maille 1,3 km"
        />
      ),
    },
    {
      name: 'Badge',
      uses: ['color.border', 'color.brand'],
      render: () => (
        <div className="button-row">
          <Badge>Confiance moyenne</Badge>
          <Badge>Écart</Badge>
        </div>
      ),
    },
    {
      name: 'Ligne de liste',
      uses: [
        'color.surface',
        'color.border',
        'color.text',
        'color.muted',
        'space.sm',
        'space.md',
        'radius.control',
        'font.body',
      ],
      render: () => (
        <Card list>
          <ListRow label="Comprendre les rafales" chevron />
          <ListRow label="Niveau" value="Brevet initial" chevron />
        </Card>
      ),
    },
    {
      name: 'Barre d’onglets',
      uses: [
        'color.surface',
        'color.border',
        'color.brand',
        'color.muted',
        'space.sm',
        'space.md',
        'font.body',
      ],
      render: () => <TabBar current="Préparer" onChange={() => {}} inline />,
    },
    {
      name: 'Messages d’état',
      uses: ['color.danger', 'color.success', 'color.onBrand'],
      render: () => (
        <div className="button-row">
          <span className="ds-feedback">Débrief enregistré</span>
          <Button variant="danger">Supprimer le vol</Button>
        </div>
      ),
    },
    {
      name: 'Focus clavier',
      uses: ['color.focus', 'color.brand', 'radius.control'],
      render: () => (
        <span className="ds-button primary review-focus">Nouvelle sortie</span>
      ),
    },
  ];

export function withValues(
  tokens: Tokens,
  patches: Patch[],
  side: 'before' | 'after',
): Tokens {
  const next = structuredClone(tokens);
  for (const p of patches) next[p.key].$value = p[side] as never;
  return next;
}

export default function Review({
  tokens,
  patches,
  labels = ['Actuel', 'Mis à jour'],
}: {
  tokens: Tokens;
  patches: Patch[];
  labels?: [string, string];
}) {
  const keys = patches.map((p) => p.key);
  const touched = specimens.filter((s) => s.uses.some((k) => keys.includes(k)));
  const [index, setIndex] = useState(0);
  const [overlay, setOverlay] = useState(false);
  if (!touched.length) return null;
  const current = touched[Math.min(index, touched.length - 1)];
  const before = withValues(tokens, patches, 'before');
  const after = withValues(tokens, patches, 'after');
  const pane = (label: string, values: Tokens, extra = '') => (
    <div className={`review-pane ${extra}`}>
      <span className="review-label">{label}</span>
      <div className="review-stage">
        <DSProvider tokens={values}>{current.render()}</DSProvider>
      </div>
    </div>
  );
  return (
    <section className="review" aria-label="Revue des composants">
      <header className="review-head">
        <button
          type="button"
          aria-label="Composant précédent"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          ‹
        </button>
        <strong>◇ {current.name}</strong>
        <button
          type="button"
          aria-label="Composant suivant"
          disabled={index >= touched.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          ›
        </button>
      </header>
      {overlay ? (
        <div className="review-overlay">
          {pane(labels[0], before)}
          {pane(`${labels[1]} · 50 %`, after, 'review-top')}
        </div>
      ) : (
        <div className="review-sides">
          {pane(labels[0], before)}
          {pane(labels[1], after)}
        </div>
      )}
      <footer className="review-foot">
        <span>
          {Math.min(index, touched.length - 1) + 1} sur {touched.length}{' '}
          composant(s) touché(s)
        </span>
        <div className="review-modes" role="group" aria-label="Mode de revue">
          <button
            type="button"
            aria-pressed={!overlay}
            onClick={() => setOverlay(false)}
          >
            Côte à côte
          </button>
          <button
            type="button"
            aria-pressed={overlay}
            onClick={() => setOverlay(true)}
          >
            Superposé
          </button>
        </div>
      </footer>
    </section>
  );
}
