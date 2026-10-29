// Édition façon Notion : le corps Markdown d'une page devient une liste de blocs
// éditables un par un (un élément de liste = un bloc), puis redevient du Markdown.
// Le format reste celui de `parseMarkdown` ; aucun bloc ne cache de HTML.

export type EditBlock =
  | {
      id: string;
      kind: 'p' | 'h2' | 'h3' | 'h4' | 'quote' | 'ul' | 'ol';
      text: string;
    }
  | {
      id: string;
      kind: 'callout';
      variant: 'do' | 'dont' | 'note';
      title: string;
      text: string;
    }
  | { id: string; kind: 'code'; lang: string; text: string }
  | { id: string; kind: 'table'; rows: string[][] }
  | { id: string; kind: 'component'; ref: string }
  | { id: string; kind: 'tokens'; ref: string }
  | { id: string; kind: 'rule' };
export type BlockKind = EditBlock['kind'];

let counter = 0;
export const blockId = () => `b${++counter}`;

const isStart = (l: string) =>
  /^(#{1,4}\s|[-*]\s|\d+\.\s|>\s?|```|\||:::|\{\{|---\s*$)/.test(l);
const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export function toBlocks(source: string): EditBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: EditBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    const id = blockId();
    if (!l.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(l);
    if (heading) {
      const level = Math.min(4, Math.max(2, heading[1].length));
      out.push({ id, kind: `h${level}` as 'h2', text: heading[2] });
      i++;
    } else if (/^---\s*$/.test(l)) {
      out.push({ id, kind: 'rule' });
      i++;
    } else if (l.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```'))
        code.push(lines[i++]);
      i++;
      out.push({
        id,
        kind: 'code',
        lang: l.slice(3).trim(),
        text: code.join('\n'),
      });
    } else if (/^:::(dont|do|note)(\s|$)/.test(l)) {
      const [, variant, title = ''] = /^:::(dont|do|note)(?:\s+(.*))?$/.exec(
        l,
      )!;
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::')
        inner.push(lines[i++]);
      i++;
      out.push({
        id,
        kind: 'callout',
        variant: variant as 'do',
        title: title.trim(),
        text: inner.join('\n').trim(),
      });
    } else if (/^\{\{(composant|tokens):([a-z0-9.-]{1,60})\}\}\s*$/.test(l)) {
      const [, type, ref] = /^\{\{(composant|tokens):([a-z0-9.-]+)/.exec(l)!;
      out.push({
        id,
        kind: type === 'composant' ? 'component' : 'tokens',
        ref,
      });
      i++;
    } else if (l.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|'))
        rows.push(lines[i++]);
      out.push({
        id,
        kind: 'table',
        rows: rows
          .filter((r, j) => j === 0 || !/^\|[\s:|-]+\|?$/.test(r))
          .map(cells),
      });
    } else if (/^([-*]|\d+\.)\s+/.test(l)) {
      out.push({
        id,
        kind: /^\d/.test(l) ? 'ol' : 'ul',
        text: l.replace(/^([-*]|\d+\.)\s+/, ''),
      });
      i++;
    } else if (l.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>'))
        quote.push(lines[i++].replace(/^>\s?/, ''));
      out.push({ id, kind: 'quote', text: quote.join(' ') });
    } else {
      const para = [l.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !isStart(lines[i]))
        para.push(lines[i++].trim());
      out.push({ id, kind: 'p', text: para.join(' ') });
    }
  }
  return out;
}

// Texte sur une ligne : un retour à la ligne saisi ne doit pas créer un autre
// bloc Markdown à la relecture.
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

export function blockSource(b: EditBlock, index = 1): string {
  switch (b.kind) {
    case 'p':
      return oneLine(b.text);
    case 'h2':
    case 'h3':
    case 'h4':
      return `${'#'.repeat(Number(b.kind[1]))} ${oneLine(b.text)}`;
    case 'quote':
      return `> ${oneLine(b.text)}`;
    case 'ul':
      return `- ${oneLine(b.text)}`;
    case 'ol':
      return `${index}. ${oneLine(b.text)}`;
    case 'callout':
      return `:::${b.variant}${b.title.trim() ? ` ${oneLine(b.title)}` : ''}\n${b.text.trim()}\n:::`;
    case 'code':
      return `\`\`\`${b.lang}\n${b.text}\n\`\`\``;
    case 'table': {
      const width = Math.max(1, ...b.rows.map((r) => r.length));
      const row = (r: string[]) =>
        `| ${Array.from({ length: width }, (_, j) => oneLine(r[j] ?? '').replaceAll('|', '/')).join(' | ')} |`;
      const [head = [], ...rest] = b.rows;
      const rule = `| ${Array.from({ length: width }, (_, j) => '-'.repeat(Math.max(3, oneLine(head[j] ?? '').length))).join(' | ')} |`;
      return [row(head), rule, ...rest.map(row)].join('\n');
    }
    case 'component':
      return `{{composant:${b.ref}}}`;
    case 'tokens':
      return `{{tokens:${b.ref}}}`;
    case 'rule':
      return '---';
  }
}

// Les éléments d'une même liste se suivent sans ligne vide ; un paragraphe vide
// disparaît du fichier.
export function fromBlocks(blocks: EditBlock[]): string {
  let out = '';
  let prev: EditBlock | null = null;
  let n = 0;
  for (const b of blocks) {
    if (b.kind === 'p' && !b.text.trim()) continue;
    if ((b.kind === 'ul' || b.kind === 'ol') && !b.text.trim()) continue;
    n = b.kind === 'ol' && prev?.kind === 'ol' ? n + 1 : 1;
    const sameList =
      prev && (b.kind === 'ul' || b.kind === 'ol') && prev.kind === b.kind;
    if (prev) out += sameList ? '\n' : '\n\n';
    out += blockSource(b, n);
    prev = b;
  }
  return out ? `${out}\n` : '';
}

// Blocs proposés par « / » et par la poignée « + ».
export const blockMenu: {
  kind: BlockKind;
  label: string;
  hint: string;
  keys: string;
}[] = [
  {
    kind: 'p',
    label: 'Texte',
    hint: 'Paragraphe simple',
    keys: 'texte paragraphe',
  },
  {
    kind: 'h2',
    label: 'Titre 2',
    hint: 'Section de la page',
    keys: 'titre heading h2',
  },
  {
    kind: 'h3',
    label: 'Titre 3',
    hint: 'Sous-section',
    keys: 'titre heading h3',
  },
  {
    kind: 'ul',
    label: 'Liste à puces',
    hint: 'Liste simple',
    keys: 'liste puces bullet',
  },
  {
    kind: 'ol',
    label: 'Liste numérotée',
    hint: 'Étapes dans l’ordre',
    keys: 'liste numérotée ordered',
  },
  {
    kind: 'quote',
    label: 'Citation',
    hint: 'Phrase mise en avant',
    keys: 'citation quote',
  },
  {
    kind: 'callout',
    label: 'À faire',
    hint: 'Bonne pratique',
    keys: 'faire do callout',
  },
  {
    kind: 'callout',
    label: 'À éviter',
    hint: 'Mauvaise pratique',
    keys: 'eviter dont callout',
  },
  {
    kind: 'callout',
    label: 'Note',
    hint: 'Précision utile',
    keys: 'note callout',
  },
  {
    kind: 'component',
    label: 'Composant',
    hint: 'Canvas de stories vivant',
    keys: 'composant component story',
  },
  {
    kind: 'tokens',
    label: 'Tokens',
    hint: 'Tableau de tokens vivant',
    keys: 'tokens variables',
  },
  {
    kind: 'table',
    label: 'Tableau',
    hint: 'Lignes et colonnes',
    keys: 'tableau table',
  },
  { kind: 'code', label: 'Code', hint: 'Extrait de code', keys: 'code' },
  {
    kind: 'rule',
    label: 'Séparateur',
    hint: 'Trait horizontal',
    keys: 'separateur divider trait',
  },
];

export function newBlock(
  item: (typeof blockMenu)[number],
  text = '',
): EditBlock {
  const id = blockId();
  switch (item.kind) {
    case 'callout':
      return {
        id,
        kind: 'callout',
        variant:
          item.label === 'À faire'
            ? 'do'
            : item.label === 'À éviter'
              ? 'dont'
              : 'note',
        title: '',
        text,
      };
    case 'code':
      return { id, kind: 'code', lang: '', text };
    case 'table':
      return {
        id,
        kind: 'table',
        rows: [
          ['Colonne', 'Colonne'],
          ['', ''],
        ],
      };
    case 'component':
      return { id, kind: 'component', ref: 'bouton' };
    case 'tokens':
      return { id, kind: 'tokens', ref: 'color' };
    case 'rule':
      return { id, kind: 'rule' };
    default:
      return { id, kind: item.kind, text };
  }
}
