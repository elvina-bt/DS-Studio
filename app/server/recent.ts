import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { storyGroups } from '@desys/stories.js';
import type { State } from '../shared/model.js';

// Éléments récents de l'accueil, tirés de sources réelles :
// - modifié : révisions de tokens validées (journal de l'atelier) et pages de doc
//   (date du fichier) ; une page qui montre un composant compte pour ce composant ;
// - ajouté : premier commit du token ou du composant dans le dépôt desys (git),
//   sinon date du fichier source.
export type RecentItem = {
  kind: 'token' | 'component' | 'doc';
  id: string;
  title: string;
  status: 'ajouté' | 'modifié';
  date: string;
};

const run = promisify(execFile);
// /usr/bin/git peut être bloqué (licence Xcode) : on essaie aussi celui de
// GitHub Desktop. Aucune commande n'écrit dans le dépôt.
const gits = [
  'git',
  '/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin/git',
];
async function git(cwd: string, args: string[]) {
  for (const bin of gits) {
    try {
      return (await run(bin, args, { cwd, timeout: 5000 })).stdout;
    } catch {
      /* Binaire suivant. */
    }
  }
  return null;
}
async function firstCommit(cwd: string, needle: string, file: string) {
  const out = await git(cwd, [
    'log',
    '--reverse',
    '--format=%cI',
    `-S${needle}`,
    '--',
    file,
  ]);
  return out?.split('\n')[0] || null;
}
const mtime = async (file: string) =>
  (await fs.stat(file).catch(() => null))?.mtime.toISOString() ?? null;

let cache: { at: number; added: RecentItem[] } | null = null;
async function addedItems(desysRoot: string): Promise<RecentItem[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.added;
  const tokensFile = 'tokens/tokens.json';
  const componentsFile = 'components/components.json';
  const tokens = Object.keys(
    JSON.parse(await fs.readFile(path.join(desysRoot, tokensFile), 'utf8')),
  );
  const fallbackTokens = await mtime(path.join(desysRoot, tokensFile));
  const fallbackComponents = await mtime(path.join(desysRoot, componentsFile));
  const added: RecentItem[] = [
    ...(await Promise.all(
      tokens.map(async (key) => ({
        kind: 'token' as const,
        id: key,
        title: key.replace('.', '/'),
        status: 'ajouté' as const,
        date:
          (await firstCommit(desysRoot, `"${key}"`, tokensFile)) ??
          fallbackTokens ??
          '',
      })),
    )),
    ...(await Promise.all(
      storyGroups.map(async (g) => ({
        kind: 'component' as const,
        id: g.id,
        title: g.name,
        status: 'ajouté' as const,
        date:
          (await firstCommit(desysRoot, `"id": "${g.id}"`, componentsFile)) ??
          fallbackComponents ??
          '',
      })),
    )),
  ];
  cache = { at: Date.now(), added };
  return added;
}

const byDate = (a: RecentItem, b: RecentItem) =>
  b.date.localeCompare(a.date) || a.title.localeCompare(b.title);

export async function recentItems(options: {
  state: State;
  docsDirectory: string;
  desysRoot: string;
}) {
  const modified: RecentItem[] = [];
  for (const event of options.state.history)
    for (const patch of event.patches)
      modified.push({
        kind: 'token',
        id: patch.key,
        title: patch.key.replace('.', '/'),
        status: 'modifié',
        date: event.date,
      });
  const files = await fs.readdir(options.docsDirectory).catch(() => []);
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const full = path.join(options.docsDirectory, file);
    const [body, date] = await Promise.all([
      fs.readFile(full, 'utf8'),
      mtime(full),
    ]);
    if (!date) continue;
    const component = /\{\{composant:([a-z0-9-]+)\}\}/.exec(body)?.[1];
    const group = storyGroups.find((g) => g.id === component);
    const title = /^title:\s*(.+)$/m.exec(body)?.[1] ?? file;
    modified.push(
      group
        ? {
            kind: 'component',
            id: group.id,
            title: group.name,
            status: 'modifié',
            date,
          }
        : {
            kind: 'doc',
            id: file.replace(/\.md$/, ''),
            title,
            status: 'modifié',
            date,
          },
    );
  }
  // Un élément n'apparaît qu'une fois, à sa date la plus récente.
  const latest = new Map<string, RecentItem>();
  for (const item of modified.sort(byDate))
    if (!latest.has(`${item.kind}:${item.id}`))
      latest.set(`${item.kind}:${item.id}`, item);
  const added = await addedItems(options.desysRoot);
  return {
    recent: [...latest.values()].slice(0, 3),
    tokens: added
      .filter((i) => i.kind === 'token')
      .sort(byDate)
      .slice(0, 3),
    components: added
      .filter((i) => i.kind === 'component')
      .sort(byDate)
      .slice(0, 3),
  };
}
