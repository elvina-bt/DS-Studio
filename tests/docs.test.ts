import { test } from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../app/server/store.js';
import { DocsStore } from '../app/server/docs.js';
import { createStudioServer } from '../app/server/http.js';
import { tokensSchema } from '../app/shared/model.js';
import {
  headingAnchors,
  lineDiff,
  parseDoc,
  parseMarkdown,
  renderHtml,
  safeHref,
  serializeDoc,
  type Doc,
} from '../app/shared/docs.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unavailable = (id: string) => ({
  id,
  async status() {
    return { available: false, detail: 'Simulation' };
  },
  async reply(): Promise<never> {
    throw new Error('Indisponible.');
  },
});
const page: Doc = {
  slug: 'bouton',
  title: 'Bouton',
  section: 'composants',
  order: 10,
  summary: 'Déclenche une action.',
  status: 'stable',
  figma: ['Bouton', 'Button'],
  body: '## Usage\n\n:::do Une action\nUn seul bouton principal par écran.\n:::\n\n{{composant:bouton}}',
};

test('page : en-tête et corps relus à l’identique, champs invalides refusés', () => {
  const raw = serializeDoc(page);
  assert.match(raw, /^---\ntitle: Bouton\nsection: composants\n/);
  assert.match(raw, /figma: Bouton, Button/);
  assert.deepEqual(parseDoc('bouton', raw), page);
  assert.throws(() => parseDoc('Bouton!', raw));
  assert.throws(() => serializeDoc({ ...page, title: 'a\nsection: x' }));
  assert.throws(() => parseDoc('x', '---\ntitle: X\nsection: inconnue\n---\n'));
});

test('Markdown : blocs du DS, liens sûrs et HTML échappé', () => {
  const blocks = parseMarkdown(
    [
      '## Titre',
      'Texte **gras** et `code` [site](https://figma.com) [mal](javascript:alert(1)) [doc](doc:couleurs)',
      '',
      ':::dont Verdict',
      '- Pas de « vole / ne vole pas »',
      ':::',
      '{{tokens:color}}',
      '| A | B |',
      '| - | - |',
      '| 1 | <b>2</b> |',
    ].join('\n'),
  );
  assert.deepEqual(
    blocks.map((b) => b.t),
    ['heading', 'paragraph', 'callout', 'tokens', 'table'],
  );
  assert.equal(safeHref('javascript:alert(1)'), null);
  assert.equal(safeHref('http://exemple.fr'), null);
  assert.equal(safeHref('doc:couleurs'), 'doc:couleurs');
  const html = renderHtml(blocks);
  assert.ok(html.includes('<a href="https://figma.com"'));
  assert.ok(!html.includes('javascript:alert(1)"'));
  assert.ok(html.includes('&lt;b&gt;2&lt;/b&gt;'));
  assert.ok(html.includes('class="callout dont"'));
  const hostile = renderHtml(
    parseMarkdown('<script>x</script> <img src=x onerror=alert(1)>'),
  );
  assert.ok(!/<script|<img/i.test(hostile));
  assert.ok(hostile.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('sommaire : ancres uniques des h2 et h3, sans accents ni h4', () => {
  const blocks = parseMarkdown(
    '## Usage\n\n### Écart **prévu**\n\n#### Détail\n\n## Usage\n\n## Usage 2\n\n## Usage',
  );
  assert.deepEqual(
    [...headingAnchors(blocks).values()].map((a) => [a.id, a.level, a.text]),
    [
      ['section-usage', 2, 'Usage'],
      ['section-ecart-prevu', 3, 'Écart prévu'],
      ['section-usage-2', 2, 'Usage'],
      ['section-usage-2-2', 2, 'Usage 2'],
      ['section-usage-3', 2, 'Usage'],
    ],
  );
});

test('liens de doc : page ou section, rien d’autre', () => {
  assert.equal(safeHref('doc:couleurs'), 'doc:couleurs');
  assert.equal(
    safeHref('doc:couleurs#section-regles'),
    'doc:couleurs#section-regles',
  );
  assert.equal(safeHref('doc:couleurs#autre'), null);
  assert.equal(safeHref('doc:../x'), null);
});

test('diff ligne à ligne : ajouts, suppressions et lignes inchangées', () => {
  assert.deepEqual(lineDiff('a\nb\nc', 'a\nc\nd'), [
    { kind: 'same', text: 'a' },
    { kind: 'del', text: 'b' },
    { kind: 'same', text: 'c' },
    { kind: 'add', text: 'd' },
  ]);
});

test('stockage : création, conflit, identifiant pris et lien symbolique refusés', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-docs-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const docs = new DocsStore(directory);
  const created = await docs.save('', page);
  assert.equal(created.title, 'Bouton');
  await assert.rejects(docs.save('', page), /déjà cet identifiant/);
  const edited = await docs.save(created.base, {
    ...page,
    summary: 'Modifié.',
  });
  await assert.rejects(docs.save(created.base, page), /modifiée ailleurs/);
  assert.equal((await docs.read('bouton')).base, edited.base);
  await writeFile(path.join(directory, 'secret.txt'), 'x');
  await symlink(
    path.join(directory, 'secret.txt'),
    path.join(directory, 'lien.md'),
  );
  await writeFile(path.join(directory, 'casse.md'), '---\nsection: ???\n---\n');
  const list = await docs.list();
  assert.deepEqual(
    list.docs.map((d) => d.slug),
    ['bouton'],
  );
  assert.deepEqual(list.invalid.sort(), ['casse.md', 'lien.md']);
});

test('HTTP : enregistrement protégé, plugin Figma en lecture seule', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-docs-http-'));
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
  const app = await createStudioServer({
    root,
    store,
    docsDirectory,
    agent: unavailable('codex'),
    claude: unavailable('claude'),
  });
  await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const { csrf } = await (await fetch(origin + '/api/bootstrap')).json();
  const save = (body: unknown, token = csrf) =>
    fetch(origin + '/api/docs/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DS-Studio': token,
        Origin: origin,
      },
      body: JSON.stringify(body),
    });
  assert.equal((await save({ base: '', doc: page }, 'faux')).status, 403);
  assert.equal(
    (await save({ base: '', doc: { ...page, slug: '../x' } })).status,
    400,
  );
  assert.equal((await save({ base: '', doc: page })).status, 200);
  const listed = await (await fetch(origin + '/api/docs')).json();
  assert.equal(listed.docs[0].slug, 'bouton');

  const lookup = (query: string, headers: Record<string, string> = {}) =>
    fetch(origin + '/plugin/lookup' + query, { headers });
  const found = await lookup('?components=button&variables=color/brand', {
    Origin: 'null',
  });
  assert.equal(found.status, 200);
  assert.equal(found.headers.get('access-control-allow-origin'), 'null');
  const body = await found.json();
  assert.equal(body.docs[0].slug, 'bouton');
  assert.match(body.docs[0].html, /callout do/);
  // Variantes à insérer : une par story du bloc {{composant:bouton}}.
  assert.equal(body.docs[0].stories.length, 4);
  assert.match(body.docs[0].stories[0].key, /^[0-9a-f]{40}$/);
  assert.match(body.docs[0].stories[0].figma, /node-id=9-30$/);
  assert.equal(body.variables[0].key, 'color.brand');
  assert.equal(body.variables[0].cssVar, '--color-brand');
  assert.equal(
    (await lookup('', { Origin: 'https://site.invalid' })).status,
    403,
  );
  assert.equal(
    (
      await fetch(origin + '/plugin/lookup', {
        method: 'POST',
        headers: { Origin: 'null' },
      })
    ).status,
    405,
  );
  assert.equal((await lookup('?components=' + 'x'.repeat(81))).status, 400);
  // Le plugin ne voit ni le brief privé ni l'état complet.
  assert.equal(
    (
      await fetch(origin + '/plugin/../api/project', {
        headers: { Origin: 'null' },
      })
    ).status,
    403,
  );
  // Pré-vérification Chromium (Private Network Access) acceptée, plugin seulement.
  const preflight = await fetch(origin + '/plugin/lookup', {
    method: 'OPTIONS',
    headers: {
      Origin: 'null',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Private-Network': 'true',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get('access-control-allow-private-network'),
    'true',
  );
  // `localhost` n'ouvre que la lecture du plugin, pas l'API de l'atelier.
  const port = new URL(origin).port;
  const withHost = (pathname: string) =>
    new Promise<number>((resolve, reject) =>
      http
        .get(
          {
            host: '127.0.0.1',
            port,
            path: pathname,
            headers: { Host: `localhost:${port}` },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          },
        )
        .on('error', reject),
    );
  assert.equal(await withHost('/plugin/lookup'), 200);
  assert.equal(await withHost('/api/state'), 403);
  // Composant sélectionné avant les pages trouvées par groupe de variables.
  assert.equal(
    (
      await save({
        base: '',
        doc: {
          ...page,
          slug: 'couleurs',
          title: 'Couleurs',
          order: 1,
          figma: ['color'],
        },
      })
    ).status,
    200,
  );
  const ranked = await (
    await lookup('?components=Button&variables=color/brand', { Origin: 'null' })
  ).json();
  assert.deepEqual(
    ranked.docs.map((d: { slug: string }) => d.slug),
    ['bouton', 'couleurs'],
  );
});
