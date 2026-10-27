import { useState } from 'react';
import type { Tokens } from '../shared/model.js';
import { DSProvider } from './DesignSystem.js';
import {
  appTabs,
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
  type AppTab,
} from './ParapenteDS.js';

// App du PFE parapente : 4 onglets, données fictives, assemblée uniquement avec
// les composants du DS (ParapenteDS.tsx), les mêmes que l'onglet Composants.
// Garde-fou du projet : jamais de verdict « vole / ne vole pas », un écart n'est
// pas un danger et n'utilise pas color.danger.
function Preparer() {
  return (
    <>
      <SearchField label="Rechercher un site" />
      <SectionHeader>Prochaine sortie</SectionHeader>
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
      <SectionHeader>Aides à la lecture</SectionHeader>
      <Card list>
        <ListRow label="Comprendre les rafales" chevron />
        <ListRow label="Lire une plage de vent" chevron />
        <ListRow label="Glossaire" chevron />
      </Card>
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
      <SectionHeader>Vol du 12 octobre · Saint-Hilaire</SectionHeader>
      <Card>
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
          <Badge>Écart</Badge> Vent vécu 4 km/h au-dessus de la plage prévue.
        </p>
        <p className="pp-note">
          Pas de verdict : l’écart sert à mieux lire la prochaine prévision.
        </p>
      </Card>
      <SectionHeader>Noter ce que j’ai vécu</SectionHeader>
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
        <Button type="submit">Enregistrer le débrief</Button>
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
      <SectionHeader>Mes repères</SectionHeader>
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
      <SectionHeader>Ce que j’ai appris</SectionHeader>
      <Card list>
        <ListRow
          label="Saint-Hilaire : l’ouest forcit souvent après 15 h"
          value="3 vols"
          chevron
        />
        <ListRow
          label="Annecy : rafales plus marquées que la plage"
          value="2 vols"
          chevron
        />
        <ListRow
          label="Les Arcs : prévision fiable le matin"
          value="1 vol"
          chevron
        />
      </Card>
    </>
  );
}

function Profil() {
  return (
    <>
      <SectionHeader>Pilote</SectionHeader>
      <Card list>
        <ListRow label="Niveau" value="Brevet initial" chevron />
        <ListRow label="Équipement" value="Voile EN-A" chevron />
        <ListRow label="Moniteur" value="École exemple" chevron />
      </Card>
      <SectionHeader>Préférences</SectionHeader>
      <Card list>
        <ListToggle label="Contraste renforcé" defaultChecked />
        <ListRow label="Taille du texte" value="Grande" chevron />
        <ListRow label="Confidentialité" chevron />
      </Card>
      <p className="pp-note pp-pad">Profil fictif, aucune donnée réelle.</p>
    </>
  );
}

export function ParapenteApp({ tokens }: { tokens: Tokens }) {
  const [tab, setTab] = useState<AppTab>(appTabs[0]);
  return (
    <DSProvider tokens={tokens}>
      <div className="pp-app">
        <main className="pp-screen">
          <LargeTitle>{tab}</LargeTitle>
          {tab === 'Préparer' && <Preparer />}
          {tab === 'Débriefer' && <Debriefer />}
          {tab === 'Progresser' && <Progresser />}
          {tab === 'Profil' && <Profil />}
        </main>
        <TabBar current={tab} onChange={setTab} />
      </div>
    </DSProvider>
  );
}
