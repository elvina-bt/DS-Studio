import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../app/server/store.js';
import { createStudioServer } from '../app/server/http.js';
import { tokensSchema } from '../app/shared/model.js';
import {
  labDoc,
  labGroup,
  labHash,
  labSpecSchema,
  labStatus,
  type LabSpec,
} from '../app/shared/lab.js';
import { labHash as desysLabHash } from '@desys-scripts/sync.js';
import type { AskContext } from '../connectors/agents/types.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec: LabSpec = {
  id: 'resume-vol',
  name: 'Résumé de vol',
  description: 'Résume un vol après l’atterrissage.',
  props: [
    { name: 'Site', type: 'text' },
    { name: 'Badge', type: 'boolean' },
  ],
  presets: [
    { id: 'defaut', name: 'Par défaut', values: { Site: 'Saint-Hilaire' } },
  ],
  template: {
    type: 'Card',
    children: [
      { type: 'SectionHeader', children: ['Vol à {Site}'] },
      { type: 'ListRow', props: { label: 'Durée', value: '1 h 20' } },
    ],
  },
};

test('laboratoire : un composant assemblé se rend comme une story', () => {
  assert.equal(labSpecSchema.safeParse(spec).success, true);
  const group = labGroup(spec);
  assert.deepEqual(group.stories[0].node.children?.[0], {
    type: 'SectionHeader',
    props: undefined,
    children: ['Vol à Saint-Hilaire'],
  });
  // Seuls les composants de desys servent de briques.
  assert.equal(
    labSpecSchema.safeParse({ ...spec, template: { type: 'Script' } }).success,
    false,
  );
  assert.match(labDoc(spec).body, /\{\{composant:resume-vol\}\}/);
});

test('laboratoire : même empreinte que desys, état Figma suivi', () => {
  assert.equal(labHash(spec), desysLabHash(spec));
  assert.equal(labStatus(spec), 'à créer');
  const linked = {
    ...spec,
    figma: { node: '30:1', key: 'k', hash: labHash(spec), published: true },
  };
  assert.equal(labStatus(linked), 'iso');
  assert.equal(labStatus({ ...linked, description: 'autre' }), 'iso');
  assert.equal(
    labStatus({ ...linked, presets: [{ id: 'b', name: 'B', values: {} }] }),
    'à mettre à jour',
  );
});

test('HTTP : le chat propose un composant, l’ajout l’écrit et crée sa page de doc', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-lab-http-'));
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
  let saved: LabSpec[] = [];
  let reply: Record<string, unknown> = {};
  let focus: AskContext['focus'];
  const claude = {
    id: 'claude',
    async status() {
      return { available: true, detail: 'Simulation' };
    },
    async reply(): Promise<never> {
      throw new Error('Inutilisé.');
    },
    async ask(_q: string, context: AskContext) {
      focus = context.focus;
      assert.ok(context.components?.some((c) => c.id === 'bouton'));
      return { message: 'ok', sources: [], ...reply };
    },
  };
  const app = await createStudioServer({
    root,
    store,
    docsDirectory: path.join(directory, 'docs'),
    claude,
    desys: {
      read: async () => seed,
      lab: {
        read: async () => saved,
        write: async (s) => {
          saved = [...saved.filter((x) => x.id !== s.id), s];
          return [`components/lab/${s.id}.json`];
        },
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
  const post = (route: string, body: unknown) =>
    fetch(origin + route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DS-Studio': csrf,
        Origin: origin,
      },
      body: JSON.stringify(body),
    });

  reply = { component: null, create: spec };
  let r = await (
    await post('/api/ask', { question: 'Crée un résumé de vol', history: [] })
  ).json();
  assert.equal(r.component, 'resume-vol');
  assert.equal(r.create.id, 'resume-vol');
  assert.equal(saved.length, 0, 'rien n’est écrit par le chat');

  // Un brouillon invalide ou qui reprend un id de desys n'est pas retenu.
  reply = { component: null, create: { ...spec, id: 'bouton' } };
  r = await (await post('/api/ask', { question: 'x', history: [] })).json();
  assert.equal(r.create, null);
  assert.equal(r.createError, 'identifiant déjà pris par desys');

  // Composant existant : seul un id connu ouvre le laboratoire.
  reply = { component: 'carte-prevision', create: null };
  r = await (
    await post('/api/ask', {
      question: 'x',
      history: [],
      focus: { component: 'carte-prevision' },
    })
  ).json();
  assert.equal(r.component, 'carte-prevision');
  assert.equal(focus?.component, 'carte-prevision');
  reply = { component: 'invente', create: null };
  assert.equal(
    (await (await post('/api/ask', { question: 'x', history: [] })).json())
      .component,
    null,
  );

  assert.equal(
    (await post('/api/lab', { spec: { ...spec, id: 'bouton' } })).status,
    409,
  );
  const added = await (await post('/api/lab', { spec })).json();
  assert.deepEqual(added.files, ['components/lab/resume-vol.json']);
  assert.equal(added.doc, 'resume-vol');
  const page = await readFile(
    path.join(directory, 'docs/resume-vol.md'),
    'utf8',
  );
  assert.match(page, /\{\{composant:resume-vol\}\}/);
  assert.match(page, /status: brouillon/);
  // Une mise à jour ne recrée pas la page de doc et garde le lien Figma de la synchro.
  saved = saved.map((s) => ({
    ...s,
    figma: { node: '30:1', key: 'k', hash: 'h', published: true },
  }));
  const updated = await (
    await post('/api/lab', {
      spec: {
        ...spec,
        figma: { node: 'faux', key: 'x', hash: 'y', published: false },
      },
    })
  ).json();
  assert.equal(updated.doc, null);
  assert.equal(saved[0].figma?.node, '30:1');
});
