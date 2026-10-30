import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, readBindings, readTokens } from '@desys-scripts/generate.js';
import type { BindingEdit, Bindings } from '../shared/bindings.js';
import { labSpecSchema, type LabSpec } from '../shared/lab.js';
import { tokenKeys, tokensSchema, type Tokens } from '../shared/model.js';

// Le design system vit dans le dépôt voisin ../desys (iso Figma). L'atelier y
// lit ses tokens de départ et y écrit chaque révision validée, puis régénère les
// sorties web et iOS. Le commit Git reste à faire par l'étudiante.
export const desysRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../desys',
);
export const desysDocs = path.join(desysRoot, 'docs');
const tokensFile = path.join(desysRoot, 'tokens/tokens.json');

export async function readDesysTokens(): Promise<Tokens> {
  return tokensSchema.parse(JSON.parse(await fs.readFile(tokensFile, 'utf8')));
}

export async function writeDesysTokens(tokens: Tokens): Promise<string[]> {
  const ordered = Object.fromEntries(tokenKeys.map((k) => [k, tokens[k]]));
  const tmp = `${tokensFile}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(ordered, null, 2) + '\n');
  await fs.rename(tmp, tokensFile);
  return generate().changed;
}

// Tokens utilisés par chaque composant : components/bindings.json, validé par le
// générateur de desys. Une écriture qui casse la génération est annulée.
const bindingsFile = path.join(desysRoot, 'components/bindings.json');
export async function readDesysBindings(): Promise<Bindings> {
  return readBindings(readTokens(), bindingsFile) as Bindings;
}
export async function writeDesysBindings(
  edits: BindingEdit[],
): Promise<string[]> {
  const before = await fs.readFile(bindingsFile, 'utf8');
  const raw = JSON.parse(before);
  for (const e of edits) raw[e.component].slots[e.slot].token = e.token;
  const tmp = `${bindingsFile}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(raw, null, 2) + '\n');
  await fs.rename(tmp, bindingsFile);
  try {
    return ['components/bindings.json', ...generate().changed];
  } catch (e) {
    await fs.writeFile(bindingsFile, before);
    generate();
    throw e;
  }
}

// Composants du laboratoire : un fichier JSON par composant, validé à la lecture.
const labDir = path.join(desysRoot, 'components/lab');
export async function readDesysLab(): Promise<LabSpec[]> {
  const files = await fs.readdir(labDir).catch(() => [] as string[]);
  const out: LabSpec[] = [];
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    const parsed = labSpecSchema.safeParse(
      JSON.parse(
        await fs.readFile(path.join(labDir, f), 'utf8').catch(() => '{}'),
      ),
    );
    if (parsed.success && `${parsed.data.id}.json` === f) out.push(parsed.data);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
export async function writeDesysLab(spec: LabSpec): Promise<string[]> {
  await fs.mkdir(labDir, { recursive: true });
  const file = path.join(labDir, `${spec.id}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(spec, null, 2) + '\n');
  await fs.rename(tmp, file);
  return [`components/lab/${spec.id}.json`, ...generate().changed];
}
