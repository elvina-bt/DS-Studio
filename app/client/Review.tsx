import { useState, type ReactNode } from 'react';
import type { Patch, TokenKey, Tokens } from '../shared/model.js';
import { Button, DSProvider } from './DesignSystem.js';

// Revue façon « Review updates » de Figma : chaque composant touché par le
// changement est rendu deux fois, avec les tokens avant et après.
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
      name: 'Champ de saisie',
      uses: [
        'color.border',
        'color.surface',
        'color.text',
        'radius.control',
        'space.sm',
        'space.md',
        'font.body',
      ],
      render: () => (
        <div className="ds-form">
          <label>
            Vent vécu (km/h)
            <input defaultValue="22" />
          </label>
        </div>
      ),
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
        'space.lg',
        'radius.control',
        'font.body',
      ],
      render: () => (
        <article className="ds-card">
          <div className="card-kicker">SAINT-HILAIRE · 14 H</div>
          <h3>Vent prévu 12–18 km/h</h3>
          <p>Ouest, rafales possibles.</p>
          <span className="ds-badge">Confiance moyenne</span>
        </article>
      ),
    },
    {
      name: 'Titre et texte',
      uses: [
        'font.heading',
        'font.body',
        'font.family',
        'color.text',
        'color.muted',
        'color.canvas',
      ],
      render: () => (
        <div className="review-canvas">
          <h1>Préparer</h1>
          <p>Une synthèse lisible de la prévision.</p>
        </div>
      ),
    },
    {
      name: 'Messages d’état',
      uses: ['color.danger', 'color.success', 'color.onBrand'],
      render: () => (
        <div className="button-row">
          <span className="ds-feedback">Débrief enregistré</span>
          <Button variant="danger">Supprimer</Button>
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
