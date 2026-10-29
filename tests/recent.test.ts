import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recentItems } from '../app/server/recent.js';
import { tokensSchema, type State } from '../app/shared/model.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('accueil : révisions et pages en « modifié », ajouts datés sans git par les fichiers', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ds-recent-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const tokens = tokensSchema.parse(
    JSON.parse(
      await readFile(
        path.join(root, 'workspace/design-system.tokens.json'),
        'utf8',
      ),
    ),
  );
  // Faux dépôt desys, sans historique git : repli sur la date des fichiers.
  await mkdir(path.join(dir, 'desys/tokens'), { recursive: true });
  await mkdir(path.join(dir, 'desys/components'), { recursive: true });
  await writeFile(
    path.join(dir, 'desys/tokens/tokens.json'),
    JSON.stringify(tokens),
  );
  await writeFile(path.join(dir, 'desys/components/components.json'), '{}');
  await mkdir(path.join(dir, 'docs'));
  await writeFile(
    path.join(dir, 'docs/bouton.md'),
    '---\ntitle: Bouton\n---\n\n{{composant:bouton}}\n',
  );
  const state: State = {
    version: 1,
    revision: 1,
    tokens,
    history: [
      {
        id: '1',
        revision: 1,
        date: '2020-01-01T00:00:00.000Z',
        source: 'manual',
        patches: [{ key: 'color.brand', before: '#000000', after: '#111111' }],
      },
    ],
  };
  const result = await recentItems({
    state,
    docsDirectory: path.join(dir, 'docs'),
    desysRoot: path.join(dir, 'desys'),
  });
  // La page du bouton (récente) passe devant la révision de 2020.
  assert.deepEqual(
    result.recent.map((i) => [i.kind, i.id, i.status]),
    [
      ['component', 'bouton', 'modifié'],
      ['token', 'color.brand', 'modifié'],
    ],
  );
  assert.equal(result.tokens.length, 3);
  assert(result.tokens.every((i) => i.status === 'ajouté' && i.date));
  assert.equal(result.components.length, 3);
});
