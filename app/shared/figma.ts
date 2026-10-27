import { z } from 'zod';
import {
  tokenKeys,
  tokensSchema,
  type TokenKey,
  type Tokens,
} from './model.js';

// Conversion entre la collection Semantics de PFE – Tokens et le format local.
// Aucune connexion ici : le relevé Figma est produit par Claude Code (MCP Figma,
// voir .agents/skills/figma-sync) puis converti, importé et validé par le diff.
// Contrat de nommage : workspace/FIGMA_MAPPING.md (`color/brand` ↔ `color.brand`).

export const figmaVariableSchema = z
  .object({
    name: z.string().min(1).max(120),
    type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })
  .strict();
export const figmaDumpSchema = z
  .object({
    fileKey: z.string().regex(/^[0-9a-zA-Z]{22,128}$/),
    collection: z.string().min(1),
    readAt: z.string().min(1),
    variables: z.array(figmaVariableSchema).max(500),
  })
  .strict();
export type FigmaVariable = z.infer<typeof figmaVariableSchema>;
export type FigmaDump = z.infer<typeof figmaDumpSchema>;

// Seul écart volontaire de valeur : la police système iOS s'appelle SF Pro dans Figma.
const fontsFromFigma: Record<string, string> = { 'SF Pro': 'system-ui' };
const fontsToFigma: Record<string, string> = { 'system-ui': 'SF Pro' };

export const figmaName = (key: TokenKey) => key.replace('.', '/');

function fromFigma(key: TokenKey, variable: FigmaVariable): unknown {
  const type = tokensSchema.shape[key].shape.$type.value;
  if (type === 'color') {
    if (variable.type !== 'COLOR')
      throw new Error(`${variable.name} : couleur attendue.`);
    return String(variable.value).toUpperCase();
  }
  if (type === 'dimension') {
    if (variable.type !== 'FLOAT')
      throw new Error(`${variable.name} : nombre attendu.`);
    return Number(variable.value);
  }
  if (variable.type !== 'STRING')
    throw new Error(`${variable.name} : police attendue.`);
  return fontsFromFigma[String(variable.value)] ?? variable.value;
}

export function toFigmaValue(key: TokenKey, tokens: Tokens): string | number {
  const value = tokens[key].$value;
  return typeof value === 'string' && key === 'font.family'
    ? (fontsToFigma[value] ?? value)
    : value;
}

// Figma → JSON complet importable. Échoue si une variable manque ou est invalide :
// un import partiel n'existe pas dans le format local.
export function figmaToTokens(dump: FigmaDump): {
  tokens: Tokens;
  ignored: string[];
} {
  const byName = new Map(dump.variables.map((v) => [v.name, v]));
  const missing = tokenKeys.filter((k) => !byName.has(figmaName(k)));
  if (missing.length)
    throw new Error(
      `Variables absentes de ${dump.collection} : ${missing.map(figmaName).join(', ')}.`,
    );
  const raw = Object.fromEntries(
    tokenKeys.map((k) => {
      const type = tokensSchema.shape[k].shape.$type.value;
      return [
        k,
        { $type: type, $value: fromFigma(k, byName.get(figmaName(k))!) },
      ];
    }),
  );
  const parsed = tokensSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      `Valeurs Figma hors du format local : ${parsed.error.issues
        .map((i) => `${String(i.path[0]).replace('.', '/')} (${i.message})`)
        .join(' ; ')}.`,
    );
  const known = new Set(tokenKeys.map(figmaName));
  return {
    tokens: parsed.data,
    ignored: dump.variables.map((v) => v.name).filter((n) => !known.has(n)),
  };
}

export type FigmaChange = {
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING';
  from: string | number | boolean | null;
  to: string | number;
};

// DS-Studio → Figma : uniquement les variables dont la valeur diffère.
export function figmaChanges(tokens: Tokens, dump: FigmaDump): FigmaChange[] {
  const byName = new Map(dump.variables.map((v) => [v.name, v]));
  const changes: FigmaChange[] = [];
  for (const key of tokenKeys) {
    const to = toFigmaValue(key, tokens);
    const current = byName.get(figmaName(key));
    const from =
      current?.type === 'COLOR'
        ? String(current.value).toUpperCase()
        : (current?.value ?? null);
    const target =
      typeof to === 'string' && to.startsWith('#') ? to.toUpperCase() : to;
    if (from === target) continue;
    const type = tokensSchema.shape[key].shape.$type.value;
    changes.push({
      name: figmaName(key),
      type:
        type === 'color' ? 'COLOR' : type === 'dimension' ? 'FLOAT' : 'STRING',
      from,
      to: target,
    });
  }
  return changes;
}
