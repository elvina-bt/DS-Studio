import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../app/server/store.js';
import { DocsStore } from '../app/server/docs.js';
import { createStudioServer } from '../app/server/http.js';
import { tokensSchema } from '../app/shared/model.js';
import { ClaudeAdapter, claudeAskArgs } from '../connectors/agents/claude.js';
import type { AskContext } from '../connectors/agents/types.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('questions : profil sans outils, réponse sans changement de token', async (t) => {
  const at = (flag: string) => claudeAskArgs[claudeAskArgs.indexOf(flag) + 1];
  assert.equal(at('--tools'), '');
  assert.equal(at('--permission-mode'), 'dontAsk');
  assert(!at('--json-schema').includes('changes'));

  const directory = await mkdtemp(path.join(tmpdir(), 'ds-fake-ask-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fake = path.join(directory, 'claude');
  // Le faux CLI vérifie qu'il reçoit la doc par stdin, hors du dépôt.
  await writeFile(
    fake,
    `#!${process.execPath}
if (process.argv.includes('--version')) { console.log('2.1.311 (Claude Code)'); process.exit(0); }
let input = '';
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  const ok = require('node:fs').readdirSync(process.cwd()).length === 0 && input.includes('Un seul bouton principal');
  console.log(JSON.stringify({ type: 'system', subtype: 'init', tools: ['StructuredOutput'], mcp_servers: [] }));
  console.log(JSON.stringify({ type: 'result', is_error: false, structured_output: { message: ok ? 'Voir [Bouton](doc:bouton).' : 'fuite', sources: ['bouton'] } }));
});
`,
  );
  await chmod(fake, 0o755);
  const context: AskContext = {
    docs: [
      {
        slug: 'bouton',
        title: 'Bouton',
        section: 'composants',
        body: 'Un seul bouton principal par écran.',
      },
    ],
    tokens: {} as never,
    rules: '',
    history: [],
  };
  const reply = await new ClaudeAdapter([fake]).ask('Combien ?', context);
  assert.deepEqual(reply, {
    message: 'Voir [Bouton](doc:bouton).',
    sources: ['bouton'],
  });

  // Une réponse qui tente de glisser des changements est refusée.
  await writeFile(
    fake,
    `#!${process.execPath}
if (process.argv.includes('--version')) { console.log('2.1.311 (Claude Code)'); process.exit(0); }
process.stdin.resume().on('end', () => {
  console.log(JSON.stringify({ type: 'result', is_error: false, structured_output: { message: 'ok', sources: [], changes: [{ key: 'color.brand', value: '#000000' }] } }));
});
`,
  );
  await assert.rejects(new ClaudeAdapter([fake]).ask('x', context));
});

test('HTTP : question protégée, sources limitées aux pages existantes', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-ask-http-'));
  const docsDirectory = path.join(directory, 'docs');
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
  await new DocsStore(docsDirectory).save('', {
    slug: 'bouton',
    title: 'Bouton',
    section: 'composants',
    order: 10,
    summary: '',
    status: 'stable',
    figma: [],
    body: 'Un seul bouton principal.',
  });
  let received: AskContext | undefined;
  const claude = {
    id: 'claude',
    async status() {
      return { available: true, detail: 'Simulation' };
    },
    async reply(): Promise<never> {
      throw new Error('Inutilisé.');
    },
    async ask(_q: string, context: AskContext) {
      received = context;
      return { message: 'Réponse', sources: ['bouton', 'inventee', 'bouton'] };
    },
  };
  const app = await createStudioServer({
    root,
    store,
    docsDirectory,
    claude,
  });
  await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const { csrf } = await (await fetch(origin + '/api/bootstrap')).json();
  const ask = (body: unknown, token = csrf) =>
    fetch(origin + '/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DS-Studio': token,
        Origin: origin,
      },
      body: JSON.stringify(body),
    });
  assert.equal((await ask({ question: 'x', history: [] }, 'faux')).status, 403);
  assert.equal((await ask({ question: '', history: [] })).status, 400);
  const revision = store.snapshot().revision;
  const res = await ask({ question: 'Combien de boutons ?', history: [] });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    message: 'Réponse',
    sources: [{ slug: 'bouton', title: 'Bouton' }],
  });
  assert.equal(received?.docs[0].body, 'Un seul bouton principal.');
  assert.equal(
    received?.tokens['color.brand'].$value,
    seed['color.brand'].$value,
  );
  assert.equal(store.snapshot().revision, revision);
});
