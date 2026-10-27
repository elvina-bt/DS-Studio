import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectStore } from '../app/server/project.js';
import { briefFromMarkdown, projectSchema } from '../app/shared/project.js';

test('brief privé : persistance, concurrence, validation et préservation', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ds-project-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new ProjectStore(directory);
  const initial = await store.read();
  const project = {
    ...initial.project,
    name: 'Ateliers partagés',
    goal: 'Réserver sans compte IA',
  };
  const competing = await Promise.allSettled([
    store.save(initial.base, project),
    store.save(initial.base, { ...project, name: 'Autre' }),
  ]);
  assert.equal(competing.filter((x) => x.status === 'fulfilled').length, 1);
  const saved = await new ProjectStore(directory).read();
  assert.equal(saved.project.name, project.name);
  assert.notEqual(saved.base, initial.base);
  await assert.rejects(() =>
    store.save(saved.base, {
      ...project,
      figmaLinks: [{ label: 'X', url: 'https://evil.invalid/' }],
    }),
  );
  assert.throws(() => projectSchema.parse({ ...project, extra: 'no' }));
  const credentialUrl = new URL('https://www.figma.com/');
  credentialUrl.username = 'fixture';
  credentialUrl.password = 'fixture';
  assert.throws(() =>
    projectSchema.parse({
      ...project,
      figmaLinks: [{ label: 'X', url: credentialUrl.href }],
    }),
  );
  assert.throws(() =>
    projectSchema.parse({
      ...project,
      figmaLinks: Array.from({ length: 9 }, () => ({
        label: '',
        url: 'https://www.figma.com/design/a',
      })),
    }),
  );
  await writeFile(path.join(directory, 'project.json'), '{broken');
  await assert.rejects(() => store.read(), /Original préservé/);
  await assert.rejects(
    () => store.save(saved.base, project),
    /Original préservé/,
  );
  assert.equal(
    await readFile(path.join(directory, 'project.json'), 'utf8'),
    '{broken',
  );
});

test('brief privé : un ancien lien Figma unique devient une liste', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ds-project-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const legacy = {
    name: 'Ancien brief',
    audience: '',
    goal: '',
    figmaUrl: 'https://www.figma.com/design/abc/Fichier',
  };
  await writeFile(path.join(directory, 'project.json'), JSON.stringify(legacy));
  const { project } = await new ProjectStore(directory).read();
  assert.deepEqual(project.figmaLinks, [
    { label: 'Figma', url: legacy.figmaUrl },
  ]);
  assert.deepEqual(
    projectSchema.parse({ ...legacy, figmaUrl: '' }).figmaLinks,
    [],
  );
});

test('préremplissage : PFE.md donne nom, public, objectif et liens', () => {
  const brief = briefFromMarkdown(
    [
      '# Mon projet de fin d’études',
      '',
      '**App de vélo partagé** (exemple).',
      '',
      '## Problème et publics',
      '',
      '- **Cible** : cyclistes',
      '  urbains.',
      '- Second public.',
      '',
      '## Contraintes',
      '',
      'Lien hors tableau : https://www.figma.com/design/k3/Ecrans',
      '',
      '| Bibliothèque | Lien |',
      '| --- | --- |',
      '| Tokens | https://www.figma.com/design/k1/Tokens |',
      '| Tokens bis | https://www.figma.com/design/k1/Tokens |',
      '| Piège | https://evil.invalid/x |',
      '',
      '## Ce que je veux prouver',
      '',
      'Que les tokens pilotent le code.',
      '',
      'Échéance en mars.',
    ].join('\n'),
  );
  assert.equal(brief.name, 'App de vélo partagé');
  assert.equal(
    brief.audience,
    '- Cible : cyclistes urbains.\n- Second public.',
  );
  assert.equal(
    brief.goal,
    'Que les tokens pilotent le code.\n\nÉchéance en mars.',
  );
  assert.deepEqual(brief.figmaLinks, [
    { label: 'Figma', url: 'https://www.figma.com/design/k3/Ecrans' },
    { label: 'Tokens', url: 'https://www.figma.com/design/k1/Tokens' },
  ]);
  assert.deepEqual(briefFromMarkdown('Texte sans structure.'), {});
});
