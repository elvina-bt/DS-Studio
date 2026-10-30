import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../app/server/store.js';
import { createStudioServer } from '../app/server/http.js';
import { tokensSchema, type Tokens } from '../app/shared/model.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('desys : écart signalé, révision validée écrite dans le dépôt, échec non bloquant', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-desys-'));
  const seed = tokensSchema.parse(
    JSON.parse(
      await readFile(
        path.join(root, 'workspace/design-system.tokens.json'),
        'utf8',
      ),
    ),
  );
  const store = new Store(path.join(directory, 'state'), seed);
  await store.init();
  // Dépôt simulé : il diffère de l'atelier sur la taille de titre.
  let repo: Tokens = {
    ...seed,
    'font.heading': { $type: 'dimension', $value: 32 },
  };
  let fail = false;
  const written: Tokens[] = [];
  const app = await createStudioServer({
    root,
    store,
    docsDirectory: path.join(directory, 'docs'),
    desys: {
      read: async () => repo,
      write: async (tokens) => {
        if (fail) throw new Error('disque plein');
        written.push(tokens);
        repo = tokens;
        return ['src/web/generated/tokens.css'];
      },
    },
  });
  await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const { csrf } = await (await fetch(origin + '/api/bootstrap')).json();
  const post = async (route: string, body: unknown) =>
    (
      await fetch(origin + route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DS-Studio': csrf,
          Origin: origin,
        },
        body: JSON.stringify(body),
      })
    ).json();

  const status = await (await fetch(origin + '/api/desys')).json();
  assert.deepEqual(status.differs, ['font.heading']);
  assert.equal(status.writable, true);

  // L'écart passe par une proposition, puis la validation écrit dans desys.
  const proposal = await post('/api/import', {
    revision: store.snapshot().revision,
    tokens: status.tokens,
  });
  const state = await post('/api/commit', { id: proposal.id });
  assert.equal(state.tokens['font.heading'].$value, 32);
  assert.deepEqual(state.desys, { files: ['src/web/generated/tokens.css'] });
  assert.equal(written.length, 1);
  assert.deepEqual(
    (await (await fetch(origin + '/api/desys')).json()).differs,
    [],
  );

  // Un échec d'écriture ne défait pas la validation : il est signalé.
  fail = true;
  const next = await post('/api/proposals', {
    revision: state.revision,
    changes: [{ key: 'space.md', value: 18 }],
  });
  const after = await post('/api/commit', { id: next.id });
  assert.equal(after.tokens['space.md'].$value, 18);
  assert.match(after.desys.error, /impossible/);
});
