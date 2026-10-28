import { z } from 'zod';

// Documentation du DS (façon zeroheight) : une page = un fichier Markdown de
// workspace/docs/, versionné avec le projet. En-tête simple entre `---`, puis un
// Markdown restreint et des blocs propres au DS :
//   :::do Titre … :::   :::dont Titre … :::   :::note … :::
//   {{composant:bouton}}   {{tokens:color}}
// Le texte est analysé en arbre, jamais injecté comme HTML brut.

export const docSections = [
  { id: 'accueil', label: 'Accueil' },
  { id: 'fondations', label: 'Fondations' },
  { id: 'ton', label: 'Tone of voice' },
  { id: 'tokens', label: 'Design tokens' },
  { id: 'composants', label: 'Composants' },
  { id: 'ressources', label: 'Ressources' },
] as const;
export type DocSection = (typeof docSections)[number]['id'];

export const maxDocBytes = 64_000;
export const slugSchema = z
  .string()
  .max(60)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Identifiant : minuscules, chiffres et tirets.',
  );
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[\r\n]/.test(v), 'Une seule ligne.');

export const docSchema = z
  .object({
    slug: slugSchema,
    title: line(120).pipe(z.string().min(1, 'Titre requis.')),
    section: z.enum(
      docSections.map((s) => s.id) as [DocSection, ...DocSection[]],
    ),
    order: z.number().int().min(0).max(999).default(100),
    summary: line(300).default(''),
    status: z.enum(['brouillon', 'stable']).default('brouillon'),
    // Noms de composants ou de groupes de variables Figma documentés par la page.
    figma: z
      .array(line(80).pipe(z.string().min(1)))
      .max(12)
      .default([]),
    body: z.string().max(maxDocBytes),
  })
  .strict();
export type Doc = z.infer<typeof docSchema>;
export type DocMeta = Omit<Doc, 'body'>;

export function parseDoc(slug: string, raw: string): Doc {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw.replace(/\r\n/g, '\n'));
  const meta: Record<string, unknown> = {};
  if (match)
    for (const entry of match[1].split('\n')) {
      const i = entry.indexOf(':');
      if (i < 1) continue;
      const key = entry.slice(0, i).trim();
      const value = entry.slice(i + 1).trim();
      meta[key] =
        key === 'order'
          ? Number(value)
          : key === 'figma'
            ? value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            : value;
    }
  const text = raw.replace(/\r\n/g, '\n');
  // serializeDoc écrit une ligne vide après l'en-tête et une fin de ligne finale.
  const body = (match ? text.slice(match[0].length) : text)
    .replace(/^\n+/, '')
    .trimEnd();
  return docSchema.parse({ ...meta, slug, body });
}

export function serializeDoc(doc: Doc): string {
  const d = docSchema.parse(doc);
  const head = [
    `title: ${d.title}`,
    `section: ${d.section}`,
    `order: ${d.order}`,
    d.summary && `summary: ${d.summary}`,
    `status: ${d.status}`,
    d.figma.length && `figma: ${d.figma.join(', ')}`,
  ].filter(Boolean);
  return `---\n${head.join('\n')}\n---\n\n${d.body.trim()}\n`;
}

// --- Markdown restreint -----------------------------------------------------

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };
export type Block =
  | { t: 'heading'; level: 2 | 3 | 4; c: Inline[] }
  | { t: 'paragraph'; c: Inline[] }
  | { t: 'list'; ordered: boolean; items: Inline[][] }
  | { t: 'quote'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'rule' }
  | { t: 'callout'; kind: 'do' | 'dont' | 'note'; title: string; c: Block[] }
  | { t: 'component'; id: string }
  | { t: 'tokens'; group: string };

// Liens : web (https), ancre, ou page de doc (`doc:slug`). Le reste reste du texte.
export function safeHref(href: string): string | null {
  if (/^https:\/\/[^\s"'<>]+$/.test(href)) return href;
  if (/^doc:[a-z0-9-]{1,60}$/.test(href)) return href;
  if (/^#[\w-]{1,60}$/.test(href)) return href;
  return null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re =
    /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[2] !== undefined) out.push({ t: 'strong', c: parseInline(m[2]) });
    else if (m[4] !== undefined) out.push({ t: 'em', c: parseInline(m[4]) });
    else if (m[6] !== undefined) out.push({ t: 'code', v: m[6] });
    else {
      const href = safeHref(m[9]);
      out.push(
        href
          ? { t: 'link', href, c: parseInline(m[8]) }
          : { t: 'text', v: m[0] },
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => parseInline(c.trim()));

export function parseMarkdown(source: string, depth = 0): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  const isStart = (l: string) =>
    /^(#{2,4}\s|[-*]\s|\d+\.\s|>\s?|```|\||:::|\{\{|---\s*$)/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(l);
    if (heading) {
      const level = Math.min(4, Math.max(2, heading[1].length)) as 2 | 3 | 4;
      blocks.push({ t: 'heading', level, c: parseInline(heading[2]) });
      i++;
      continue;
    }
    if (/^---\s*$/.test(l)) {
      blocks.push({ t: 'rule' });
      i++;
      continue;
    }
    if (l.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```'))
        code.push(lines[i++]);
      i++;
      blocks.push({ t: 'code', v: code.join('\n') });
      continue;
    }
    const callout = /^:::(dont|do|note)(?:\s+(.*))?$/.exec(l);
    if (callout && depth === 0) {
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::')
        inner.push(lines[i++]);
      i++;
      blocks.push({
        t: 'callout',
        kind: callout[1] as 'do' | 'dont' | 'note',
        title: (callout[2] ?? '').trim(),
        c: parseMarkdown(inner.join('\n'), depth + 1),
      });
      continue;
    }
    const embed = /^\{\{(composant|tokens):([a-z0-9.-]{1,60})\}\}\s*$/.exec(l);
    if (embed) {
      blocks.push(
        embed[1] === 'composant'
          ? { t: 'component', id: embed[2] }
          : { t: 'tokens', group: embed[2] },
      );
      i++;
      continue;
    }
    if (l.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|'))
        rows.push(lines[i++]);
      const body = rows.slice(1).filter((r) => !/^\|[\s:|-]+\|?$/.test(r));
      blocks.push({ t: 'table', head: cells(rows[0]), rows: body.map(cells) });
      continue;
    }
    const item = /^([-*]|\d+\.)\s+/;
    if (item.test(l)) {
      const ordered = /^\d/.test(l);
      const items: Inline[][] = [];
      while (i < lines.length && item.test(lines[i]))
        items.push(parseInline(lines[i++].replace(item, '')));
      blocks.push({ t: 'list', ordered, items });
      continue;
    }
    if (l.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>'))
        quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ t: 'quote', c: parseInline(quote.join(' ')) });
      continue;
    }
    const para: string[] = [l.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !isStart(lines[i]))
      para.push(lines[i++].trim());
    blocks.push({ t: 'paragraph', c: parseInline(para.join(' ')) });
  }
  return blocks;
}

// --- HTML échappé (plugin Figma) -------------------------------------------

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const inlineHtml = (c: Inline[]): string =>
  c
    .map((n) =>
      n.t === 'text'
        ? escape(n.v)
        : n.t === 'code'
          ? `<code>${escape(n.v)}</code>`
          : n.t === 'strong'
            ? `<strong>${inlineHtml(n.c)}</strong>`
            : n.t === 'em'
              ? `<em>${inlineHtml(n.c)}</em>`
              : n.href.startsWith('https://')
                ? `<a href="${escape(n.href)}" target="_blank" rel="noreferrer">${inlineHtml(n.c)}</a>`
                : `<span class="link">${inlineHtml(n.c)}</span>`,
    )
    .join('');
const calloutLabel = { do: 'À faire', dont: 'À éviter', note: 'Note' };

// Les blocs vivants (composant, tokens) ne s'exécutent pas dans Figma : un renvoi
// vers DS-Studio les remplace.
export function renderHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case 'heading':
          return `<h${b.level}>${inlineHtml(b.c)}</h${b.level}>`;
        case 'paragraph':
          return `<p>${inlineHtml(b.c)}</p>`;
        case 'quote':
          return `<blockquote>${inlineHtml(b.c)}</blockquote>`;
        case 'code':
          return `<pre><code>${escape(b.v)}</code></pre>`;
        case 'rule':
          return '<hr>';
        case 'list': {
          const tag = b.ordered ? 'ol' : 'ul';
          return `<${tag}>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</${tag}>`;
        }
        case 'table':
          return `<table><thead><tr>${b.head.map((h) => `<th>${inlineHtml(h)}</th>`).join('')}</tr></thead><tbody>${b.rows
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table>`;
        case 'callout':
          return `<div class="callout ${b.kind}"><strong>${calloutLabel[b.kind]}${b.title ? ` · ${escape(b.title)}` : ''}</strong>${renderHtml(b.c)}</div>`;
        case 'component':
          return `<p class="embed">Aperçu vivant « ${escape(b.id)} » : voir dans DS-Studio.</p>`;
        case 'tokens':
          return `<p class="embed">Tableau des tokens « ${escape(b.group)} » : voir dans DS-Studio.</p>`;
      }
    })
    .join('');
}

// --- Diff ligne à ligne (validation avant enregistrement) -------------------

export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string };
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > 4_000_000)
    return [
      ...a.map((text) => ({ kind: 'del' as const, text })),
      ...b.map((text) => ({ kind: 'add' as const, text })),
    ];
  const lcs = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1])
      out.push({ kind: 'del', text: a[i++] });
    else out.push({ kind: 'add', text: b[j++] });
  }
  while (i < a.length) out.push({ kind: 'del', text: a[i++] });
  while (j < b.length) out.push({ kind: 'add', text: b[j++] });
  return out;
}
