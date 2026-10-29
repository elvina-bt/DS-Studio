import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '@desys-scripts/generate.js';
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
