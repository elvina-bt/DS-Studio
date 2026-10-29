import { useState, type ReactNode } from 'react';
import type { Tokens } from '../shared/model.js';
import {
  Badge,
  Button,
  Card,
  DesysProvider as DSProvider,
  ForecastCard,
  LargeTitle,
  ListRow,
  ListToggle,
  SearchField,
  SectionHeader,
  TabBar,
  type AppTab,
} from '@desys/components.js';

// Composants du DS parapente : ils vivent dans le dépôt desys (../desys/src/web)
// et sont réexportés ici pour l'atelier. Seul le catalogue de l'onglet
// Composants de l'Atelier est propre à DS-Studio.
export * from '@desys/components.js';

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
