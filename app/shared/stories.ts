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
// Composant correspondant dans PFE – Components : nœud (lien) et clé (import).
export type FigmaRef = { node: string; key: string };
export type Story = {
  id: string;
  name: string;
  node: StoryNode;
  figma?: FigmaRef;
};
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
        figma: {
          node: '9:30',
          key: '7585fbd206595b4c1922029d986d6d20d70fb173',
        },
        node: { type: 'Button', children: ['Nouvelle sortie'] },
      },
      {
        id: 'secondaire',
        name: 'Secondaire',
        figma: {
          node: '9:34',
          key: 'a4b5e0dde9b1dc6285053821fd94f545ded36d6b',
        },
        node: {
          type: 'Button',
          props: { variant: 'secondary' },
          children: ['Voir les sites'],
        },
      },
      {
        id: 'danger',
        name: 'Destructif',
        figma: {
          node: '9:38',
          key: '70548b0f5656a399e83ebfccf1877c405aed7a4f',
        },
        node: {
          type: 'Button',
          props: { variant: 'danger' },
          children: ['Supprimer le vol'],
        },
      },
      {
        id: 'desactive',
        name: 'Désactivé',
        figma: {
          node: '9:32',
          key: 'b557840a5e0e48f2357b09ba961b347b4f87dc16',
        },
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
        figma: {
          node: '9:43',
          key: 'b6b0e97cb87e68bae3b7058dc6376f65ae9764d2',
        },
        node: { type: 'LargeTitle', children: ['Préparer'] },
      },
      {
        id: 'en-tete-section',
        name: 'En-tête de section',
        figma: {
          node: '9:45',
          key: '2fe71328062408c3fc25d65b184faa5fda4c7577',
        },
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
        figma: {
          node: '9:48',
          key: 'e7f9314a9e3dec2fb8725f2956633652e264a349',
        },
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
        figma: {
          node: '11:19',
          key: '5f4c5d763826db07ad94007a8b02f5782700d1fa',
        },
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
        figma: {
          node: '11:38',
          key: '021c5c9dcd28cb057f08743b80c72dc0578b3428',
        },
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
        figma: {
          node: '9:50',
          key: '6147bed703222d499e18c396d1c1cbf5ca769f50',
        },
        node: { type: 'Badge', children: ['Confiance moyenne'] },
      },
      {
        id: 'ecart',
        name: 'Écart',
        figma: {
          node: '9:50',
          key: '6147bed703222d499e18c396d1c1cbf5ca769f50',
        },
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
        figma: {
          node: '10:23',
          key: 'b91eb3b2148bdda99489a9826e870d7243002063',
        },
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
        figma: {
          node: '10:7',
          key: 'e326d6aa34f7dacee970a7257b8b64dd23fc587a',
        },
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
        figma: {
          node: '10:16',
          key: 'a6a5ab189af9d9d106ed7d0affd5bbb14eeeef1d',
        },
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
        figma: {
          node: '11:57',
          key: 'b544c7177adadb6744c50be679906dced14caebc',
        },
        node: {
          type: 'TabBar',
          props: { current: 'Préparer', onChange: { handler: 'setTab' } },
        },
      },
    ],
  },
];

export const storyId = (group: string, story: string) => `${group}--${story}`;

// Fichier Figma des composants (PFE – Components) et lien vers un nœud.
export const figmaFile = 'dRoA2PB74Ne8TWXz5Cafin';
export const figmaUrl = (node: string) =>
  `https://www.figma.com/design/${figmaFile}/PFE---Components?node-id=${node.replace(':', '-')}`;
// Stories des blocs {{composant:id}} d'une page de doc.
export function storiesInBody(body: string) {
  const ids = [...body.matchAll(/\{\{composant:([a-z0-9-]+)\}\}/g)].map(
    (m) => m[1],
  );
  return storyGroups
    .filter((g) => ids.includes(g.id))
    .flatMap((g) => g.stories.map((s) => ({ group: g, story: s })));
}
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
