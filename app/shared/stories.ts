// Stories façon Storybook : chaque variante d'un composant est une donnée, avec
// un ID stable (`groupe--variante`). L'aperçu et le code affiché sont produits à
// partir des mêmes props : ils ne peuvent pas diverger. Renommer un ID casse les
// références (tickets, PR, liens) : à traiter comme le nommage des tokens.
export const componentNames = [
  'Button',
  'LargeTitle',
  'SectionHeader',
  'SearchField',
  'Badge',
  'Card',
  'ListRow',
  'ListToggle',
  'ForecastCard',
  'TabBar',
] as const;
export type ComponentName = (typeof componentNames)[number];
// Une fonction n'est pas une donnée : `{ handler }` donne son nom dans le code.
export type StoryProp = string | number | boolean | { handler: string };
export type StoryNode = {
  type: ComponentName;
  props?: Record<string, StoryProp>;
  children?: (StoryNode | string)[];
};
export type Story = { id: string; name: string; node: StoryNode };
export type StoryGroup = { id: string; name: string; stories: Story[] };

const forecast = {
  place: 'Saint-Hilaire',
  slot: 'sam. 14 h–16 h',
  wind: '12–18 km/h',
  summary: 'Ouest, rafales possibles l’après-midi.',
  gusts: 'jusqu’à 25 km/h',
  ceiling: '2 400 m',
};

export const storyGroups: StoryGroup[] = [
  {
    id: 'bouton',
    name: 'Bouton',
    stories: [
      {
        id: 'principal',
        name: 'Principal',
        node: { type: 'Button', children: ['Nouvelle sortie'] },
      },
      {
        id: 'secondaire',
        name: 'Secondaire',
        node: {
          type: 'Button',
          props: { variant: 'secondary' },
          children: ['Voir les sites'],
        },
      },
      {
        id: 'danger',
        name: 'Destructif',
        node: {
          type: 'Button',
          props: { variant: 'danger' },
          children: ['Supprimer le vol'],
        },
      },
      {
        id: 'desactive',
        name: 'Désactivé',
        node: {
          type: 'Button',
          props: { disabled: true },
          children: ['Indisponible'],
        },
      },
    ],
  },
  {
    id: 'titre',
    name: 'Titre et en-tête de section',
    stories: [
      {
        id: 'grand-titre',
        name: 'Grand titre',
        node: { type: 'LargeTitle', children: ['Préparer'] },
      },
      {
        id: 'en-tete-section',
        name: 'En-tête de section',
        node: { type: 'SectionHeader', children: ['Prochaine sortie'] },
      },
    ],
  },
  {
    id: 'recherche',
    name: 'Champ de recherche',
    stories: [
      {
        id: 'site',
        name: 'Recherche de site',
        node: { type: 'SearchField', props: { label: 'Rechercher un site' } },
      },
    ],
  },
  {
    id: 'carte-prevision',
    name: 'Carte de prévision',
    stories: [
      {
        id: 'confiance-moyenne',
        name: 'Confiance moyenne',
        node: {
          type: 'ForecastCard',
          props: {
            ...forecast,
            confidence: 'Moyenne · maille 1,3 km',
            note: 'Prévision enregistrée à 9 h 12, pour la comparer après le vol.',
          },
        },
      },
      {
        id: 'sans-note',
        name: 'Sans note',
        node: {
          type: 'ForecastCard',
          props: { ...forecast, confidence: 'Élevée · maille 1,3 km' },
        },
      },
    ],
  },
  {
    id: 'badge',
    name: 'Badge',
    stories: [
      {
        id: 'confiance',
        name: 'Confiance',
        node: { type: 'Badge', children: ['Confiance moyenne'] },
      },
      {
        id: 'ecart',
        name: 'Écart',
        node: { type: 'Badge', children: ['Écart'] },
      },
    ],
  },
  {
    id: 'ligne-liste',
    name: 'Ligne de liste',
    stories: [
      {
        id: 'liste',
        name: 'Liste groupée',
        node: {
          type: 'Card',
          props: { list: true },
          children: [
            {
              type: 'ListRow',
              props: { label: 'Comprendre les rafales', chevron: true },
            },
            {
              type: 'ListRow',
              props: {
                label: 'Niveau',
                value: 'Brevet initial',
                chevron: true,
              },
            },
            { type: 'ListRow', props: { label: 'Plafond', value: '2 400 m' } },
            {
              type: 'ListToggle',
              props: { label: 'Contraste renforcé', defaultChecked: true },
            },
          ],
        },
      },
      {
        id: 'valeur',
        name: 'Ligne avec valeur',
        node: {
          type: 'Card',
          props: { list: true },
          children: [
            { type: 'ListRow', props: { label: 'Plafond', value: '2 400 m' } },
          ],
        },
      },
      {
        id: 'interrupteur',
        name: 'Interrupteur',
        node: {
          type: 'Card',
          props: { list: true },
          children: [
            {
              type: 'ListToggle',
              props: { label: 'Contraste renforcé', defaultChecked: true },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'barre-onglets',
    name: 'Barre d’onglets',
    stories: [
      {
        id: 'preparer',
        name: 'Préparer actif',
        node: {
          type: 'TabBar',
          props: { current: 'Préparer', onChange: { handler: 'setTab' } },
        },
      },
    ],
  },
];

export const storyId = (group: string, story: string) => `${group}--${story}`;
export function findStory(id: string) {
  for (const group of storyGroups)
    for (const story of group.stories)
      if (storyId(group.id, story.id) === id) return { group, story };
  return null;
}

// JSX lisible : props sur une ligne si elles tiennent, sinon une par ligne.
function attribute(key: string, value: StoryProp) {
  if (value === true) return key;
  if (typeof value === 'object') return `${key}={${value.handler}}`;
  if (typeof value !== 'string') return `${key}={${value}}`;
  return /["{}]/.test(value)
    ? `${key}={${JSON.stringify(value)}}`
    : `${key}="${value}"`;
}
const text = (v: string) => (/[{}<>]/.test(v) ? `{${JSON.stringify(v)}}` : v);
function jsx(node: StoryNode, depth: number): string {
  const pad = '  '.repeat(depth);
  const attrs = Object.entries(node.props ?? {})
    .filter(([, v]) => v !== false)
    .map(([k, v]) => attribute(k, v));
  const kids = node.children ?? [];
  const inline = `<${node.type}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
  const multiline = attrs.length > 2 || pad.length + inline.length > 64;
  const open = multiline
    ? `<${node.type}\n${attrs.map((a) => `${pad}  ${a}`).join('\n')}\n${pad}`
    : inline;
  if (!kids.length) return `${pad}${open}${multiline ? '' : ' '}/>`;
  if (kids.every((k) => typeof k === 'string'))
    return `${pad}${open}>${text(kids.join(''))}</${node.type}>`;
  const inner = kids
    .map((k) =>
      typeof k === 'string' ? `${pad}  ${text(k)}` : jsx(k, depth + 1),
    )
    .join('\n');
  return `${pad}${open}>\n${inner}\n${pad}</${node.type}>`;
}
function usedTypes(node: StoryNode, out = new Set<ComponentName>()) {
  out.add(node.type);
  for (const k of node.children ?? [])
    if (typeof k !== 'string') usedTypes(k, out);
  return out;
}
export function storyCode(node: StoryNode) {
  const types = componentNames.filter((n) => usedTypes(node).has(n));
  return `import { ${types.join(', ')} } from './ParapenteDS.js';\n\n${jsx(node, 0)}\n`;
}
