import { useState, type ReactNode } from 'react';
import type { Tokens } from '../shared/model.js';
import { Button, DSProvider } from './DesignSystem.js';

// Composants du DS parapente : une seule implémentation, utilisée par le
// catalogue (onglet Composants) et par l'app (onglet Aperçu). Valeurs issues
// des tokens uniquement. Garde-fou : aucun composant n'exprime un verdict
// « vole / ne vole pas » ; un écart reste neutre, jamais color.danger.
export { Button };

export const appTabs = [
  'Préparer',
  'Débriefer',
  'Progresser',
  'Profil',
] as const;
export type AppTab = (typeof appTabs)[number];

export function LargeTitle({ children }: { children: ReactNode }) {
  return <h1 className="pp-title">{children}</h1>;
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return <h2 className="pp-section">{children}</h2>;
}

export function SearchField({ label }: { label: string }) {
  return (
    <label className="pp-search">
      <span className="pp-sr">{label}</span>
      <input type="search" placeholder={label} />
    </label>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="ds-badge">{children}</span>;
}

export function Card({
  children,
  list = false,
}: {
  children: ReactNode;
  list?: boolean;
}) {
  return (
    <article className={list ? 'pp-card pp-list' : 'pp-card'}>
      {children}
    </article>
  );
}

export function ListRow({
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

export function ListToggle({
  label,
  defaultChecked = false,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="pp-row ds-check">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} />
    </label>
  );
}

export function ForecastCard({
  place,
  slot,
  wind,
  summary,
  gusts,
  ceiling,
  confidence,
  note,
}: {
  place: string;
  slot: string;
  wind: string;
  summary: string;
  gusts: string;
  ceiling: string;
  confidence: string;
  note?: string;
}) {
  return (
    <Card>
      <div className="pp-kicker">
        {place.toUpperCase()} · {slot.toUpperCase()}
      </div>
      <h3>Vent prévu {wind}</h3>
      <p>{summary}</p>
      <ListRow label="Rafales" value={gusts} />
      <ListRow label="Plafond" value={ceiling} />
      <ListRow label="Confiance" value={<Badge>{confidence}</Badge>} />
      {note && <p className="pp-note">{note}</p>}
    </Card>
  );
}

function TabIcon({ tab }: { tab: AppTab }) {
  const paths: Record<AppTab, ReactNode> = {
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

export function TabBar({
  current,
  onChange,
  inline = false,
}: {
  current: AppTab;
  onChange: (tab: AppTab) => void;
  inline?: boolean;
}) {
  return (
    <nav
      className={inline ? 'pp-tabbar pp-tabbar-inline' : 'pp-tabbar'}
      aria-label="Onglets de l’app"
    >
      {appTabs.map((t) => (
        <button
          key={t}
          aria-current={current === t ? 'page' : undefined}
          onClick={() => onChange(t)}
        >
          <TabIcon tab={t} />
          {t}
        </button>
      ))}
    </nav>
  );
}

function Specimen({
  index,
  name,
  children,
}: {
  index: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={name}>
      <div className="section-label">
        {index} / {name.toUpperCase()}
      </div>
      {children}
    </section>
  );
}

export function ParapenteCatalogue({ tokens }: { tokens: Tokens }) {
  const [tab, setTab] = useState<AppTab>('Préparer');
  return (
    <DSProvider tokens={tokens}>
      <div className="catalogue pp-catalogue">
        <Specimen index="01" name="Bouton">
          <div className="button-row">
            <Button>Nouvelle sortie</Button>
            <Button variant="secondary">Voir les sites</Button>
            <Button variant="danger">Supprimer le vol</Button>
            <Button disabled>Indisponible</Button>
          </div>
          <p className="ds-caption">
            Principal, secondaire, destructif (jamais pour un écart), désactivé.
            Survolez et utilisez Tab : focus et états natifs inclus.
          </p>
        </Specimen>
        <Specimen index="02" name="Titre et en-tête de section">
          <LargeTitle>Préparer</LargeTitle>
          <SectionHeader>Prochaine sortie</SectionHeader>
        </Specimen>
        <Specimen index="03" name="Champ de recherche">
          <SearchField label="Rechercher un site" />
        </Specimen>
        <Specimen index="04" name="Carte de prévision">
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
        </Specimen>
        <Specimen index="05" name="Badge">
          <div className="button-row">
            <Badge>Confiance moyenne</Badge>
            <Badge>Écart</Badge>
          </div>
          <p className="ds-caption">
            Neutre : un niveau de confiance ou un écart, jamais un verdict.
          </p>
        </Specimen>
        <Specimen index="06" name="Ligne de liste">
          <Card list>
            <ListRow label="Comprendre les rafales" chevron />
            <ListRow label="Niveau" value="Brevet initial" chevron />
            <ListRow label="Plafond" value="2 400 m" />
            <ListToggle label="Contraste renforcé" defaultChecked />
          </Card>
        </Specimen>
        <Specimen index="07" name="Barre d’onglets">
          <TabBar current={tab} onChange={setTab} inline />
        </Specimen>
      </div>
    </DSProvider>
  );
}
