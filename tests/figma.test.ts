import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  figmaChanges,
  figmaDumpSchema,
  figmaName,
  figmaToTokens,
  toFigmaValue,
  type FigmaDump,
} from '../app/shared/figma.js';
import { tokenKeys, tokensSchema, type Tokens } from '../app/shared/model.js';

const seed = async () =>
  tokensSchema.parse(
    JSON.parse(await readFile('workspace/design-system.tokens.json', 'utf8')),
  );

// Relevé fictif au format produit par le skill figma-sync, aligné sur un état donné.
function dumpOf(tokens: Tokens): FigmaDump {
  return figmaDumpSchema.parse({
    fileKey: '90pqKBxgw5j3rUlfZmCM0J',
    collection: 'Semantics',
    readAt: '2026-10-27T10:00:00.000Z',
    variables: [
      ...tokenKeys.map((k) => ({
        name: figmaName(k),
        type:
          tokens[k].$type === 'color'
            ? 'COLOR'
            : tokens[k].$type === 'dimension'
              ? 'FLOAT'
              : 'STRING',
        value: toFigmaValue(k, tokens),
      })),
      { name: 'color/gap', type: 'COLOR', value: '#777777' },
    ],
  });
}

test('Figma → DS-Studio : JSON complet, SF Pro ↔ system-ui, variables en trop ignorées', async () => {
  const tokens = await seed();
  const dump = dumpOf(tokens);
  assert.equal(
    dump.variables.find((v) => v.name === 'font/family')?.value,
    'SF Pro',
  );
  dump.variables.find((v) => v.name === 'color/brand')!.value = '#0b5cad';
  dump.variables.find((v) => v.name === 'font/heading')!.value = 34;
  const result = figmaToTokens(dump);
  assert.equal(result.tokens['color.brand'].$value, '#0B5CAD');
  assert.equal(result.tokens['font.heading'].$value, 34);
  assert.equal(result.tokens['font.family'].$value, 'system-ui');
  assert.deepEqual(result.ignored, ['color/gap']);
  assert.ok(tokensSchema.safeParse(result.tokens).success);
});

test('Figma → DS-Studio : variable absente, mauvais type ou valeur hors format refusés', async () => {
  const tokens = await seed();
  const missing = dumpOf(tokens);
  missing.variables = missing.variables.filter((v) => v.name !== 'space/md');
  assert.throws(() => figmaToTokens(missing), /space\/md/);
  const wrongType = dumpOf(tokens);
  wrongType.variables.find((v) => v.name === 'space/md')!.type = 'COLOR';
  assert.throws(() => figmaToTokens(wrongType), /nombre attendu/);
  const outOfRange = dumpOf(tokens);
  outOfRange.variables.find((v) => v.name === 'space/lg')!.value = 400;
  assert.throws(() => figmaToTokens(outOfRange), /space\/lg/);
  const font = dumpOf(tokens);
  font.variables.find((v) => v.name === 'font/family')!.value = 'Inter';
  assert.throws(() => figmaToTokens(font), /font\/family/);
  assert.throws(() =>
    figmaDumpSchema.parse({ ...dumpOf(tokens), fileKey: '../etc' }),
  );
});

test('DS-Studio → Figma : seules les variables différentes sont reportées', async () => {
  const tokens = await seed();
  assert.deepEqual(figmaChanges(tokens, dumpOf(tokens)), []);
  const next = structuredClone(tokens);
  next['color.canvas'].$value = '#f2f2f7';
  next['font.heading'].$value = 34;
  assert.deepEqual(figmaChanges(next, dumpOf(tokens)), [
    {
      name: 'color/canvas',
      type: 'COLOR',
      from: String(tokens['color.canvas'].$value).toUpperCase(),
      to: '#F2F2F7',
    },
    {
      name: 'font/heading',
      type: 'FLOAT',
      from: tokens['font.heading'].$value,
      to: 34,
    },
  ]);
});
