import { useState, type ReactNode } from 'react';
import type { Tokens } from '../shared/model.js';
import { Button, DSProvider } from './DesignSystem.js';

// App du PFE parapente : 4 onglets, données fictives, uniquement des tokens.
// Garde-fou du projet : jamais de verdict « vole / ne vole pas », un écart n'est
// pas un danger et n'utilise pas color.danger.
const tabs = ['Préparer', 'Débriefer', 'Progresser', 'Profil'] as const;
type Tab = (typeof tabs)[number];

function Icon({ tab }: { tab: Tab }) {
  const paths: Record<Tab, ReactNode> = {
    Préparer: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />,
    Débriefer: <path d="M6 3h9l4 4v14H6zM9 11h7M9 15h7" />,
    Progresser: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    Profil: (
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[tab]}
    </svg>
  );
}

function Row({
  label,
  value,
  chevron = false,
}: {
  label: string;
  value?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="pp-row">
      <span>{label}</span>
      <span className="pp-row-value">
        {value}
        {chevron && <span aria-hidden="true">›</span>}
      </span>
    </div>
  );
}

function Preparer() {
  return (
    <>
      <label className="pp-search">
        <span className="pp-sr">Rechercher un site</span>
        <input placeholder="Rechercher un site" />
      </label>
      <h2 className="pp-section">Prochaine sortie</h2>
      <article className="pp-card">
        <div className="pp-kicker">SAINT-HILAIRE · SAM. 14 H–16 H</div>
        <h3>Vent prévu 12–18 km/h</h3>
        <p>Ouest, rafales possibles l’après-midi.</p>
        <Row label="Rafales" value="jusqu’à 25 km/h" />
        <Row label="Plafond" value="2 400 m" />
        <Row
          label="Confiance"
          value={<span className="ds-badge">Moyenne · maille 1,3 km</span>}
        />
        <p className="pp-note">
          Prévision enregistrée à 9 h 12, pour la comparer après le vol.
        </p>
      </article>
      <h2 className="pp-section">Aides à la lecture</h2>
      <article className="pp-card pp-list">
        <Row label="Comprendre les rafales" chevron />
        <Row label="Lire une plage de vent" chevron />
        <Row label="Glossaire" chevron />
      </article>
      <div className="pp-action">
        <Button>Nouvelle sortie</Button>
      </div>
    </>
  );
}

function Debriefer() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <h2 className="pp-section">Vol du 12 octobre · Saint-Hilaire</h2>
      <article className="pp-card">
        <div className="pp-compare" role="table" aria-label="Prévu et vécu">
          <div role="row" className="pp-compare-head">
            <span role="columnheader"></span>
            <span role="columnheader">Prévu</span>
            <span role="columnheader">Vécu</span>
          </div>
          {[
            ['Vent', '12–18 km/h', '22 km/h'],
            ['Direction', 'Ouest', 'Ouest-nord-ouest'],
            ['Thermiques', 'Faibles', 'Modérés'],
          ].map(([label, planned, lived]) => (
            <div role="row" key={label}>
              <span role="rowheader">{label}</span>
              <span role="cell">{planned}</span>
              <span role="cell">{lived}</span>
            </div>
          ))}
        </div>
        <p className="pp-gap">
          <span className="ds-badge">Écart</span> Vent vécu 4 km/h au-dessus de
          la plage prévue.
        </p>
        <p className="pp-note">
          Pas de verdict : l’écart sert à mieux lire la prochaine prévision.
        </p>
      </article>
      <h2 className="pp-section">Noter ce que j’ai vécu</h2>
      <form
        className="pp-card ds-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <label>
          Vent vécu (km/h)
          <input
            inputMode="numeric"
            placeholder="22"
            onChange={() => setSaved(false)}
          />
        </label>
        <label>
          Source
          <select onChange={() => setSaved(false)}>
            <option>Ressenti</option>
            <option>Balise du site</option>
          </select>
        </label>
        <button className="ds-button primary" type="submit">
          Enregistrer le débrief
        </button>
        <p role="status">
          {saved ? 'Débrief de démonstration, aucune donnée envoyée.' : ''}
        </p>
      </form>
    </>
  );
}

function Progresser() {
  return (
    <>
      <h2 className="pp-section">Mes repères</h2>
      <article className="pp-card pp-stats">
        {[
          ['6', 'Vols débriefés'],
          ['3', 'Sites'],
          ['+3 km/h', 'Écart moyen du vent'],
          ['4 / 6', 'Vols dans la plage'],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </article>
      <h2 className="pp-section">Ce que j’ai appris</h2>
      <article className="pp-card pp-list">
        <Row
          label="Saint-Hilaire : l’ouest forcit souvent après 15 h"
          value="3 vols"
          chevron
        />
        <Row
          label="Annecy : rafales plus marquées que la plage"
          value="2 vols"
          chevron
        />
        <Row
          label="Les Arcs : prévision fiable le matin"
          value="1 vol"
          chevron
        />
      </article>
    </>
  );
}

function Profil() {
  return (
    <>
      <h2 className="pp-section">Pilote</h2>
      <article className="pp-card pp-list">
        <Row label="Niveau" value="Brevet initial" chevron />
        <Row label="Équipement" value="Voile EN-A" chevron />
        <Row label="Moniteur" value="École exemple" chevron />
      </article>
      <h2 className="pp-section">Préférences</h2>
      <article className="pp-card pp-list">
        <label className="pp-row ds-check">
          <span>Contraste renforcé</span>
          <input type="checkbox" defaultChecked />
        </label>
        <Row label="Taille du texte" value="Grande" chevron />
        <Row label="Confidentialité" chevron />
      </article>
      <p className="pp-note pp-pad">Profil fictif, aucune donnée réelle.</p>
    </>
  );
}

export function ParapenteApp({ tokens }: { tokens: Tokens }) {
  const [tab, setTab] = useState<Tab>('Préparer');
  return (
    <DSProvider tokens={tokens}>
      <div className="pp-app">
        <main className="pp-screen">
          <h1>{tab}</h1>
          {tab === 'Préparer' && <Preparer />}
          {tab === 'Débriefer' && <Debriefer />}
          {tab === 'Progresser' && <Progresser />}
          {tab === 'Profil' && <Profil />}
        </main>
        <nav className="pp-tabbar" aria-label="Onglets de l’app">
          {tabs.map((t) => (
            <button
              key={t}
              aria-current={tab === t ? 'page' : undefined}
              onClick={() => setTab(t)}
            >
              <Icon tab={t} />
              {t}
            </button>
          ))}
        </nav>
      </div>
    </DSProvider>
  );
}
