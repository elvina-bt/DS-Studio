// Synchro Figma ↔ DS-Studio en deux sens, sans connexion de l'application :
//   npm run figma:import -- <relevé.json>  → JSON complet à importer dans l'atelier
//   npm run figma:plan -- <relevé.json>    → changements à reporter dans Figma
// Le relevé est produit par Claude Code (MCP Figma) : .agents/skills/figma-sync.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  figmaChanges,
  figmaDumpSchema,
  figmaToTokens,
} from '../app/shared/figma.js';
import { tokenKeys, tokensSchema, type Tokens } from '../app/shared/model.js';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'workspace/private');
const [command, dumpPath] = process.argv.slice(2);

async function readDump(file: string | undefined) {
  if (!file) throw new Error('Chemin du relevé Figma manquant.');
  return figmaDumpSchema.parse(JSON.parse(await fs.readFile(file, 'utf8')));
}

// État courant : l'atelier s'il tourne, sinon lecture seule du journal local.
async function currentTokens(): Promise<Tokens> {
  const port = process.env.DS_STUDIO_PORT ?? '4310';
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/state`);
    if (res.ok) return tokensSchema.parse((await res.json()).tokens);
  } catch {
    /* Atelier arrêté : on lit le fichier. */
  }
  const state = JSON.parse(
    await fs.readFile(path.join(root, '.ds-studio/state.json'), 'utf8'),
  );
  return tokensSchema.parse(state.tokens);
}

async function write(name: string, value: unknown) {
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, name);
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file);
}

async function main() {
  const dump = await readDump(dumpPath);
  const current = await currentTokens();
  if (command === 'import') {
    const { tokens, ignored } = figmaToTokens(dump);
    const diff = tokenKeys.filter(
      (k) => tokens[k].$value !== current[k].$value,
    );
    const file = await write('figma-import.json', tokens);
    console.log(
      `Relevé ${dump.collection} du ${dump.readAt} converti : ${file}`,
    );
    console.log(
      diff.length
        ? `${diff.length} différence(s) avec l’atelier :\n` +
            diff
              .map(
                (k) =>
                  `  ${k} : ${current[k].$value} → ${tokens[k].$value} (Figma)`,
              )
              .join('\n')
        : 'Aucune différence avec l’atelier : rien à importer.',
    );
    if (ignored.length)
      console.log(`Hors format local, ignorées : ${ignored.join(', ')}`);
    console.log(
      'Importer ce fichier avec « Importer un JSON », puis valider le diff dans l’atelier.',
    );
  } else if (command === 'plan') {
    const changes = figmaChanges(current, dump);
    const file = await write('figma-changes.json', {
      fileKey: dump.fileKey,
      collection: dump.collection,
      basedOn: dump.readAt,
      changes,
    });
    console.log(
      changes.length
        ? `${changes.length} variable(s) à reporter dans Figma (${file}) :\n` +
            changes.map((c) => `  ${c.name} : ${c.from} → ${c.to}`).join('\n')
        : `Figma est déjà aligné sur l’atelier (${tokenKeys.length} variables).`,
    );
  } else {
    throw new Error('Commande attendue : import ou plan.');
  }
}

main().catch((e: Error) => {
  console.error(`Échec synchro Figma : ${e.message}`);
  process.exitCode = 1;
});
