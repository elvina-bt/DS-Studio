// Stories façon Storybook, propriétés façon Figma. Chaque composant décrit ses
// propriétés (variantes, textes, booléens) ; une story est un jeu de valeurs avec
// un ID stable (`groupe--variante`). L'aperçu, le code, l'ID et le lien Figma sont
// calculés à partir des mêmes valeurs : ils ne peuvent pas diverger. Renommer un
// ID casse les références (tickets, PR, liens) : à traiter comme les tokens.
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
// Un nœud en prop (ex. un Badge comme valeur de ligne) s'écrit en JSX.
export type StoryProp =
  string | number | boolean | { handler: string } | StoryNode;
export type StoryNode = {
  type: ComponentName;
  props?: Record<string, StoryProp>;
  children?: (StoryNode | string)[];
};
// Composant correspondant dans PFE – Components : nœud (lien) et clé (import).
export type FigmaRef = { node: string; key: string };
export type PropDef =
  | { name: string; type: 'variant'; options: string[] }
  | { name: string; type: 'text' }
  | { name: string; type: 'boolean' };
export type Values = Record<string, string | boolean>;
export type Story = {
  id: string;
  name: string;
  values: Values;
  node: StoryNode;
  figma?: FigmaRef;
};
export type StoryGroup = {
  id: string;
  name: string;
  props: PropDef[];
  // Propriété affichée seulement dans certains cas (ex. Note si Note=Oui).
  shown?: Record<string, (v: Values) => boolean>;
  build: (v: Values) => StoryNode;
  figma: (v: Values) => FigmaRef | undefined;
  stories: Story[];
};

type Def = Omit<StoryGroup, 'stories'> & {
  presets: { id: string; name: string; values: Values }[];
};
const group = ({ presets, ...def }: Def): StoryGroup => ({
  ...def,
  stories: presets.map((p) => ({
    ...p,
    node: def.build(p.values),
    figma: def.figma(p.values),
  })),
});
const ref = (node: string, key: string): FigmaRef => ({ node, key });
const s = (v: Values, name: string) => String(v[name] ?? '');

const buttonFigma: Record<string, FigmaRef> = {
  'Principal|Défaut': ref('9:30', '7585fbd206595b4c1922029d986d6d20d70fb173'),
  'Principal|Désactivé': ref(
    '9:32',
    'b557840a5e0e48f2357b09ba961b347b4f87dc16',
  ),
  'Secondaire|Défaut': ref('9:34', 'a4b5e0dde9b1dc6285053821fd94f545ded36d6b'),
  'Secondaire|Désactivé': ref(
    '9:36',
    '08ae62c271e15c0b301df7bb1a727dc2c4d76c03',
  ),
  'Destructif|Défaut': ref('9:38', '70548b0f5656a399e83ebfccf1877c405aed7a4f'),
  'Destructif|Désactivé': ref(
    '9:40',
    '33de19babffbfb73d31bbe56b5735be1ad096b81',
  ),
};
const rowFigma: Record<string, FigmaRef> = {
  Navigation: ref('10:2', 'c0d317d4e3985e784f07781aba97c5fa28408429'),
  Valeur: ref('10:7', 'e326d6aa34f7dacee970a7257b8b64dd23fc587a'),
  Badge: ref('10:11', '75dea471293a077eeac753f2272ac5a0e08f7813'),
  Interrupteur: ref('10:16', 'a6a5ab189af9d9d106ed7d0affd5bbb14eeeef1d'),
};
const tabFigma: Record<string, FigmaRef> = {
  Préparer: ref('11:57', 'b544c7177adadb6744c50be679906dced14caebc'),
  Débriefer: ref('11:74', '0b280f3f3f8c97b9ba87e7ea26d62f6a53e49816'),
  Progresser: ref('11:91', 'a43ed3802b0d00a4c26f29874dd2d0daab1da49c'),
  Profil: ref('11:108', '8b76acc8ce1d3e303f20f0d837bfe2166903c297'),
};
const forecast = {
  Lieu: 'Saint-Hilaire',
  Créneau: 'sam. 14 h–16 h',
  Vent: '12–18 km/h',
  Résumé: 'Ouest, rafales possibles l’après-midi.',
  Rafales: 'jusqu’à 25 km/h',
  Plafond: '2 400 m',
};

export const storyGroups: StoryGroup[] = [
  group({
    id: 'bouton',
    name: 'Bouton',
    props: [
      {
        name: 'Variante',
        type: 'variant',
        options: ['Principal', 'Secondaire', 'Destructif'],
      },
      { name: 'État', type: 'variant', options: ['Défaut', 'Désactivé'] },
      { name: 'Libellé', type: 'text' },
    ],
    build: (v) => {
      const variant = { Secondaire: 'secondary', Destructif: 'danger' }[
        s(v, 'Variante')
      ];
      return {
        type: 'Button',
        props: {
          ...(variant ? { variant } : {}),
          ...(v['État'] === 'Désactivé' ? { disabled: true } : {}),
        },
        children: [s(v, 'Libellé')],
      };
    },
    figma: (v) => buttonFigma[`${s(v, 'Variante')}|${s(v, 'État')}`],
    presets: [
      {
        id: 'principal',
        name: 'Principal',
        values: {
          Variante: 'Principal',
          État: 'Défaut',
          Libellé: 'Nouvelle sortie',
        },
      },
      {
        id: 'secondaire',
        name: 'Secondaire',
        values: {
          Variante: 'Secondaire',
          État: 'Défaut',
          Libellé: 'Voir les sites',
        },
      },
      {
        id: 'danger',
        name: 'Destructif',
        values: {
          Variante: 'Destructif',
          État: 'Défaut',
          Libellé: 'Supprimer le vol',
        },
      },
      {
        id: 'desactive',
        name: 'Désactivé',
        values: {
          Variante: 'Principal',
          État: 'Désactivé',
          Libellé: 'Indisponible',
        },
      },
      {
        id: 'secondaire-desactive',
        name: 'Secondaire désactivé',
        values: {
          Variante: 'Secondaire',
          État: 'Désactivé',
          Libellé: 'Voir les sites',
        },
      },
      {
        id: 'danger-desactive',
        name: 'Destructif désactivé',
        values: {
          Variante: 'Destructif',
          État: 'Désactivé',
          Libellé: 'Supprimer le vol',
        },
      },
    ],
  }),
  group({
    id: 'titre',
    name: 'Titre et en-tête de section',
    props: [
      {
        name: 'Type',
        type: 'variant',
        options: ['Grand titre', 'En-tête de section'],
      },
      { name: 'Texte', type: 'text' },
    ],
    build: (v) => ({
      type: v.Type === 'Grand titre' ? 'LargeTitle' : 'SectionHeader',
      children: [s(v, 'Texte')],
    }),
    figma: (v) =>
      v.Type === 'Grand titre'
        ? ref('9:43', 'b6b0e97cb87e68bae3b7058dc6376f65ae9764d2')
        : ref('9:45', '2fe71328062408c3fc25d65b184faa5fda4c7577'),
    presets: [
      {
        id: 'grand-titre',
        name: 'Grand titre',
        values: { Type: 'Grand titre', Texte: 'Préparer' },
      },
      {
        id: 'en-tete-section',
        name: 'En-tête de section',
        values: { Type: 'En-tête de section', Texte: 'Prochaine sortie' },
      },
    ],
  }),
  group({
    id: 'recherche',
    name: 'Champ de recherche',
    props: [{ name: 'Texte indicatif', type: 'text' }],
    build: (v) => ({
      type: 'SearchField',
      props: { label: s(v, 'Texte indicatif') },
    }),
    figma: () => ref('9:48', 'e7f9314a9e3dec2fb8725f2956633652e264a349'),
    presets: [
      {
        id: 'site',
        name: 'Recherche de site',
        values: { 'Texte indicatif': 'Rechercher un site' },
      },
    ],
  }),
  group({
    id: 'carte-prevision',
    name: 'Carte de prévision',
    props: [
      { name: 'Note', type: 'variant', options: ['Oui', 'Non'] },
      ...[
        'Lieu',
        'Créneau',
        'Vent',
        'Résumé',
        'Rafales',
        'Plafond',
        'Confiance',
        'Texte de la note',
      ].map((name) => ({ name, type: 'text' as const })),
    ],
    shown: { 'Texte de la note': (v) => v.Note === 'Oui' },
    build: (v) => ({
      type: 'ForecastCard',
      props: {
        place: s(v, 'Lieu'),
        slot: s(v, 'Créneau'),
        wind: s(v, 'Vent'),
        summary: s(v, 'Résumé'),
        gusts: s(v, 'Rafales'),
        ceiling: s(v, 'Plafond'),
        confidence: s(v, 'Confiance'),
        ...(v.Note === 'Oui' ? { note: s(v, 'Texte de la note') } : {}),
      },
    }),
    figma: (v) =>
      v.Note === 'Oui'
        ? ref('11:19', '5f4c5d763826db07ad94007a8b02f5782700d1fa')
        : ref('11:38', '021c5c9dcd28cb057f08743b80c72dc0578b3428'),
    presets: [
      {
        id: 'confiance-moyenne',
        name: 'Confiance moyenne',
        values: {
          Note: 'Oui',
          ...forecast,
          Confiance: 'Moyenne · maille 1,3 km',
          'Texte de la note':
            'Prévision enregistrée à 9 h 12, pour la comparer après le vol.',
        },
      },
      {
        id: 'sans-note',
        name: 'Sans note',
        values: {
          Note: 'Non',
          ...forecast,
          Confiance: 'Élevée · maille 1,3 km',
          'Texte de la note': '',
        },
      },
    ],
  }),
  group({
    id: 'badge',
    name: 'Badge',
    props: [{ name: 'Libellé', type: 'text' }],
    build: (v) => ({ type: 'Badge', children: [s(v, 'Libellé')] }),
    figma: () => ref('9:50', '6147bed703222d499e18c396d1c1cbf5ca769f50'),
    presets: [
      {
        id: 'confiance',
        name: 'Confiance',
        values: { Libellé: 'Confiance moyenne' },
      },
      { id: 'ecart', name: 'Écart', values: { Libellé: 'Écart' } },
    ],
  }),
  group({
    id: 'ligne-liste',
    name: 'Ligne de liste',
    props: [
      {
        name: 'Type',
        type: 'variant',
        options: ['Navigation', 'Valeur', 'Badge', 'Interrupteur'],
      },
      { name: 'Libellé', type: 'text' },
      { name: 'Afficher la valeur', type: 'boolean' },
      { name: 'Valeur', type: 'text' },
    ],
    shown: {
      'Afficher la valeur': (v) => v.Type === 'Navigation',
      Valeur: (v) =>
        v.Type === 'Valeur' ||
        v.Type === 'Badge' ||
        (v.Type === 'Navigation' && v['Afficher la valeur'] === true),
    },
    // Une ligne seule se montre dans sa carte groupée, comme dans l'app.
    build: (v) => {
      const label = s(v, 'Libellé');
      const value = s(v, 'Valeur');
      const row: StoryNode =
        v.Type === 'Interrupteur'
          ? { type: 'ListToggle', props: { label, defaultChecked: true } }
          : {
              type: 'ListRow',
              props: {
                label,
                ...(v.Type === 'Valeur' ||
                (v.Type === 'Navigation' && v['Afficher la valeur'] === true)
                  ? { value }
                  : {}),
                ...(v.Type === 'Badge'
                  ? { value: { type: 'Badge', children: [value] } }
                  : {}),
                ...(v.Type === 'Navigation' ? { chevron: true } : {}),
              },
            };
      return { type: 'Card', props: { list: true }, children: [row] };
    },
    figma: (v) => rowFigma[s(v, 'Type')],
    presets: [
      {
        id: 'navigation',
        name: 'Navigation',
        values: {
          Type: 'Navigation',
          Libellé: 'Comprendre les rafales',
          'Afficher la valeur': false,
          Valeur: 'Brevet initial',
        },
      },
      {
        id: 'valeur',
        name: 'Ligne avec valeur',
        values: {
          Type: 'Valeur',
          Libellé: 'Plafond',
          'Afficher la valeur': false,
          Valeur: '2 400 m',
        },
      },
      {
        id: 'badge',
        name: 'Ligne avec badge',
        values: {
          Type: 'Badge',
          Libellé: 'Confiance',
          'Afficher la valeur': false,
          Valeur: 'Moyenne · maille 1,3 km',
        },
      },
      {
        id: 'interrupteur',
        name: 'Interrupteur',
        values: {
          Type: 'Interrupteur',
          Libellé: 'Contraste renforcé',
          'Afficher la valeur': false,
          Valeur: '',
        },
      },
    ],
  }),
  group({
    id: 'liste-groupee',
    name: 'Liste groupée',
    props: [],
    build: (): StoryNode => ({
      type: 'Card',
      props: { list: true },
      children: [
        {
          type: 'ListRow',
          props: { label: 'Comprendre les rafales', chevron: true },
        },
        {
          type: 'ListRow',
          props: { label: 'Niveau', value: 'Brevet initial', chevron: true },
        },
        { type: 'ListRow', props: { label: 'Plafond', value: '2 400 m' } },
        {
          type: 'ListToggle',
          props: { label: 'Contraste renforcé', defaultChecked: true },
        },
      ],
    }),
    figma: () => ref('10:23', 'b91eb3b2148bdda99489a9826e870d7243002063'),
    presets: [{ id: 'reglages', name: 'Réglages', values: {} }],
  }),
  group({
    id: 'barre-onglets',
    name: 'Barre d’onglets',
    props: [
      {
        name: 'Onglet actif',
        type: 'variant',
        options: ['Préparer', 'Débriefer', 'Progresser', 'Profil'],
      },
    ],
    build: (v) => ({
      type: 'TabBar',
      props: {
        current: s(v, 'Onglet actif'),
        onChange: { handler: 'setTab' },
      },
    }),
    figma: (v) => tabFigma[s(v, 'Onglet actif')],
    presets: [
      {
        id: 'preparer',
        name: 'Préparer',
        values: { 'Onglet actif': 'Préparer' },
      },
      {
        id: 'debriefer',
        name: 'Débriefer',
        values: { 'Onglet actif': 'Débriefer' },
      },
      {
        id: 'progresser',
        name: 'Progresser',
        values: { 'Onglet actif': 'Progresser' },
      },
      { id: 'profil', name: 'Profil', values: { 'Onglet actif': 'Profil' } },
    ],
  }),
];

export const storyId = (group: string, story: string) => `${group}--${story}`;

// Variante courante : la story aux valeurs identiques, sinon celle qui a les
// mêmes variantes (les textes modifiés ne changent pas de composant Figma).
export function matchStory(group: StoryGroup, values: Values) {
  const same = (keys: string[], s: Story) =>
    keys.every((k) => s.values[k] === values[k]);
  const all = group.props.map((p) => p.name);
  const variants = group.props
    .filter((p) => p.type !== 'text')
    .map((p) => p.name);
  return (
    group.stories.find((s) => same(all, s)) ??
    group.stories.find((s) => same(variants, s)) ??
    null
  );
}

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
const isNode = (v: StoryProp): v is StoryNode =>
  typeof v === 'object' && 'type' in v;
function attribute(key: string, value: StoryProp) {
  if (value === true) return key;
  if (isNode(value)) return `${key}={${jsx(value, 0)}}`;
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
  for (const v of Object.values(node.props ?? {}))
    if (isNode(v)) usedTypes(v, out);
  return out;
}
export function storyCode(node: StoryNode) {
  const types = componentNames.filter((n) => usedTypes(node).has(n));
  return `import { ${types.join(', ')} } from './ParapenteDS.js';\n\n${jsx(node, 0)}\n`;
}
