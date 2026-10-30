import { z } from 'zod';

// Tokens utilisés par chaque composant (desys/components/<id>.json). Le chat
// peut proposer d'en changer ; la proposition est vérifiée ici, puis validée par
// l'étudiante avant toute écriture.
export type Slot = {
  label: string;
  type: 'color' | 'space' | 'radius';
  token: string;
};
export type Bindings = Record<
  string,
  { swift: string; slots: Record<string, Slot> }
>;
export const bindingEditSchema = z
  .object({
    component: z.string().max(40),
    slot: z.string().max(40),
    token: z.string().max(40),
  })
  .strict();
export type BindingEdit = z.infer<typeof bindingEditSchema>;

type TokenTypes = Record<string, { $type: string }>;
export function checkEdits(
  edits: BindingEdit[],
  bindings: Bindings,
  tokens: TokenTypes,
): { edits: BindingEdit[]; rejected: string[] } {
  const ok: BindingEdit[] = [];
  const rejected: string[] = [];
  for (const e of edits) {
    const where = `${e.component}.${e.slot}`;
    const slot = bindings[e.component]?.slots[e.slot];
    const t = tokens[e.token];
    if (!slot) rejected.push(`${where} : emplacement inconnu`);
    else if (!t) rejected.push(`${where} : token inconnu ${e.token}`);
    else if (
      slot.type === 'color'
        ? t.$type !== 'color'
        : t.$type !== 'dimension' || !e.token.startsWith(`${slot.type}.`)
    )
      rejected.push(`${where} : ${e.token} n’est pas un token ${slot.type}`);
    // Garde-fou du projet : le rouge sert à supprimer, jamais à signaler un écart.
    else if (e.token === 'color.danger' && where !== 'bouton.fond-destructif')
      rejected.push(`${where} : color.danger réservé au bouton destructif`);
    else if (slot.token === e.token)
      rejected.push(`${where} : utilise déjà ${e.token}`);
    else if (ok.some((o) => o.component === e.component && o.slot === e.slot))
      rejected.push(`${where} : proposé deux fois`);
    else ok.push(e);
  }
  return { edits: ok, rejected };
}

export function applyEdits(bindings: Bindings, edits: BindingEdit[]): Bindings {
  const next: Bindings = structuredClone(bindings);
  for (const e of edits) next[e.component].slots[e.slot].token = e.token;
  return next;
}

// Variables CSS des emplacements, comme desys/src/web/generated/bindings.css.
export const bindingVar = (component: string, slot: string) =>
  `--b-${component}-${slot}`;
export const tokenVar = (key: string) => `--${key.replaceAll('.', '-')}`;
export function bindingsCss(bindings: Bindings, selector = ':root, .ds') {
  const lines = Object.entries(bindings).flatMap(([id, c]) =>
    Object.entries(c.slots).map(
      ([slot, b]) => `${bindingVar(id, slot)}: var(${tokenVar(b.token)});`,
    ),
  );
  return `${selector} { ${lines.join(' ')} }`;
}
