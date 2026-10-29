import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../app/shared/docs.js';
import {
  blockMenu,
  fromBlocks,
  newBlock,
  toBlocks,
} from '../app/shared/blocks.js';

const page = `## Usage

Un paragraphe sur
deux lignes avec **gras**.

- un
- deux

1. premier
2. second

:::do Titre
Ce qu’il faut faire.
:::

{{composant:bouton}}

| Cas | Token |
| --- | ----- |
| Écart | \`color.gap\` |

> Citation

\`\`\`swift
let a = 1
\`\`\`

---
`;

test('éditeur de page : les blocs redonnent le même Markdown', () => {
  const blocks = toBlocks(page);
  assert.deepEqual(
    blocks.map((b) => b.kind),
    [
      'h2',
      'p',
      'ul',
      'ul',
      'ol',
      'ol',
      'callout',
      'component',
      'table',
      'quote',
      'code',
      'rule',
    ],
  );
  const out = fromBlocks(blocks);
  assert.deepEqual(parseMarkdown(out), parseMarkdown(page));
  assert.match(out, /^- un\n- deux$/m);
  assert.match(out, /^1\. premier\n2\. second$/m);
});

test('éditeur de page : blocs vides ignorés, retours à la ligne aplatis', () => {
  const p = newBlock(blockMenu[0], 'Ligne\nsuivante');
  const empty = newBlock(blockMenu[0]);
  const note = newBlock(
    blockMenu.find((i) => i.label === 'Note')!,
    'Texte',
  );
  assert.equal(
    fromBlocks([p, empty, note]),
    'Ligne suivante\n\n:::note\nTexte\n:::\n',
  );
});
