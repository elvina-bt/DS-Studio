import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findStory,
  storyCode,
  storyGroups,
  storyId,
} from '../app/shared/stories.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('stories : ID stables, uniques, et un groupe par bloc composant de la doc', async () => {
  const ids = storyGroups.flatMap((g) =>
    g.stories.map((s) => storyId(g.id, s.id)),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+--[a-z0-9-]+$/);
  assert.equal(findStory('bouton--secondaire')?.story.name, 'Secondaire');
  assert.equal(findStory('bouton--inconnu'), null);
  // Chaque {{composant:id}} des pages de départ a son groupe de stories.
  for (const page of ['bouton', 'carte-prevision', 'champ-recherche']) {
    const body = await readFile(
      path.join(root, 'workspace/docs', `${page}.md`),
      'utf8',
    );
    for (const [, id] of body.matchAll(/\{\{composant:([a-z0-9-]+)\}\}/g))
      assert(
        storyGroups.some((g) => g.id === id),
        `stories manquantes : ${id}`,
      );
  }
});

test('code des stories : JSX lisible généré depuis les mêmes props', () => {
  assert.equal(
    storyCode(findStory('bouton--secondaire')!.story.node),
    'import { Button } from \'./ParapenteDS.js\';\n\n<Button variant="secondary">Voir les sites</Button>\n',
  );
  assert.equal(
    storyCode(findStory('bouton--desactive')!.story.node),
    "import { Button } from './ParapenteDS.js';\n\n<Button disabled>Indisponible</Button>\n",
  );
  const list = storyCode(findStory('ligne-liste--interrupteur')!.story.node);
  assert.equal(
    list,
    'import { Card, ListToggle } from \'./ParapenteDS.js\';\n\n<Card list>\n  <ListToggle label="Contraste renforcé" defaultChecked />\n</Card>\n',
  );
  assert.match(
    storyCode(findStory('barre-onglets--preparer')!.story.node),
    /onChange=\{setTab\}/,
  );
  // Props nombreuses : une par ligne.
  assert.match(
    storyCode(findStory('carte-prevision--sans-note')!.story.node),
    /<ForecastCard\n {2}place="Saint-Hilaire"\n/,
  );
});
