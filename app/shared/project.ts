import { z } from 'zod';
const figmaUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'www.figma.com' &&
      !url.username &&
      !url.password
    );
  }, 'Lien https://www.figma.com/ attendu, sans identifiants.');
export const figmaLinkSchema = z
  .object({
    label: z.string().trim().max(60).default(''),
    url: figmaUrl,
  })
  .strict();
export type FigmaLink = z.infer<typeof figmaLinkSchema>;
export const maxFigmaLinks = 8;
// Un brief V2 enregistré avec un seul `figmaUrl` devient une liste d'un lien.
function migrate(input: unknown) {
  if (!input || typeof input !== 'object' || !('figmaUrl' in input))
    return input;
  const { figmaUrl: legacy, ...rest } = input as Record<string, unknown>;
  const links = Array.isArray(rest.figmaLinks) ? rest.figmaLinks : [];
  return {
    ...rest,
    figmaLinks:
      typeof legacy === 'string' && legacy.trim()
        ? [{ label: 'Figma', url: legacy }, ...links]
        : links,
  };
}
export const projectSchema = z.preprocess(
  migrate,
  z
    .object({
      name: z.string().trim().max(100).default(''),
      audience: z.string().trim().max(1000).default(''),
      goal: z.string().trim().max(2000).default(''),
      figmaLinks: z.array(figmaLinkSchema).max(maxFigmaLinks).default([]),
    })
    .strict(),
);
export type Project = z.infer<typeof projectSchema>;
export interface ProjectSnapshot {
  project: Project;
  base: string;
}

// Préremplissage depuis workspace/PFE.md : seuls les champs trouvés sont rendus,
// l'étudiant relit puis enregistre lui-même.
export function briefFromMarkdown(markdown: string): Partial<Project> {
  const plain = (text: string) =>
    text
      .replace(/\*\*|__|`/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Une ligne coupée à la main rejoint sa phrase ; listes et paragraphes restent.
      .replace(/(?<!\n)\n(?![ \t]*(?:[-*|\n]|\d+\.))[ \t]*/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  const [intro, ...blocks] = markdown.split(/^## /m);
  const sections = blocks.map((block) => {
    const [heading, ...rest] = block.split('\n');
    return { heading: heading.trim(), body: rest.join('\n') };
  });
  const section = (pattern: RegExp, max: number) => {
    const found = sections
      .filter((s) => pattern.test(s.heading))
      .map((s) => plain(s.body))
      .filter(Boolean)
      .join('\n\n');
    return found ? found.slice(0, max) : undefined;
  };
  const result: Partial<Project> = {};
  const name =
    intro.match(/\*\*([^*\n]+)\*\*/)?.[1] ?? intro.match(/^# (.+)$/m)?.[1];
  if (name?.trim()) result.name = name.trim().slice(0, 100);
  const audience = section(/public/i, 1000);
  if (audience) result.audience = audience;
  const goal = section(/objectif|prouver|apprendre|réussite/i, 2000);
  if (goal) result.goal = goal;
  const links: FigmaLink[] = [];
  for (const line of markdown.split('\n')) {
    for (const match of line.matchAll(/https:\/\/www\.figma\.com\/[^\s|)>\]]+/g)) {
      const parsed = figmaLinkSchema.safeParse({
        label: line.trim().startsWith('|')
          ? plain(line.split('|')[1] ?? '').slice(0, 60)
          : 'Figma',
        url: match[0],
      });
      if (
        parsed.success &&
        links.length < maxFigmaLinks &&
        !links.some((l) => l.url === parsed.data.url)
      )
        links.push(parsed.data);
    }
  }
  if (links.length) result.figmaLinks = links;
  return result;
}
