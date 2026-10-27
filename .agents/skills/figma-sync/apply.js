// Écriture, à passer à use_figma UNIQUEMENT après accord explicite de l'étudiante
// sur le plan affiché. Remplacer le marqueur de `const PLAN` par le contenu de
// workspace/private/figma-changes.json (sortie de `npm run figma:plan`).
//
// Règle d'alias : une sémantique reste aliasée vers une primitive.
// 1. Une primitive du même type porte déjà la valeur → on ré-aliase.
// 2. Sinon, si la primitive actuelle ne sert qu'à cette sémantique → on la modifie
//    (jamais pour une taille : `size/28` porte sa valeur dans son nom).
// 3. Sinon on crée une primitive (`color/pfe/<nom>`, `size/<n>`, `font/family/<nom>`)
//    pour ne jamais changer une autre sémantique par effet de bord.
// Avec "dryRun": true dans le plan, rien n'est écrit : le script rend ce qu'il ferait.
const PLAN = __PLAN__;
const DRY = PLAN.dryRun === true;
const set = (variable, mode, value) => {
  if (!DRY) variable.setValueForMode(mode, value);
};
if (PLAN.fileKey !== figma.fileKey)
  throw new Error(`Fichier inattendu : ${figma.fileKey} au lieu de ${PLAN.fileKey}.`);
const rgb = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
const hex = (c) =>
  '#' +
  [c.r, c.g, c.b]
    .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const same = (type, raw, to) =>
  type === 'COLOR' ? raw && typeof raw === 'object' && 'r' in raw && hex(raw) === to : raw === to;
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const semantics = collections.find((c) => c.name === 'Semantics');
const primitives = collections.find((c) => c.name === 'Primitives');
if (!semantics || !primitives) throw new Error('Collections Semantics / Primitives introuvables.');
const load = async (c) =>
  Promise.all(c.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)));
const sem = await load(semantics);
const prim = await load(primitives);
const S = semantics.defaultModeId;
const P = primitives.defaultModeId;
const report = [];
for (const change of PLAN.changes) {
  const variable = sem.find((v) => v.name === change.name);
  if (!variable) throw new Error(`Variable absente : ${change.name}.`);
  const value = change.type === 'COLOR' ? rgb(change.to) : change.to;
  const raw = variable.valuesByMode[S];
  if (raw?.type !== 'VARIABLE_ALIAS') {
    set(variable, S, value);
    report.push(`${change.name} : valeur directe → ${change.to}`);
    continue;
  }
  const existing = prim.find(
    (p) => p.resolvedType === change.type && same(change.type, p.valuesByMode[P], change.to),
  );
  if (existing) {
    set(variable, S, figma.variables.createVariableAlias(existing));
    report.push(`${change.name} → alias ${existing.name}`);
    continue;
  }
  const current = prim.find((p) => p.id === raw.id);
  const shared = sem.filter(
    (v) => v !== variable && v.valuesByMode[S]?.type === 'VARIABLE_ALIAS' && v.valuesByMode[S].id === raw.id,
  );
  if (current && !shared.length && change.type !== 'FLOAT') {
    set(current, P, value);
    report.push(`${change.name} : primitive ${current.name} → ${change.to}`);
    continue;
  }
  const short = change.name.split('/').pop();
  const name =
    change.type === 'COLOR'
      ? `color/pfe/${short}`
      : change.type === 'FLOAT'
        ? `size/${change.to}`
        : `font/family/${String(change.to).toLowerCase().replace(/\s+/g, '-')}`;
  const clash = prim.find((p) => p.name === name);
  if (clash) {
    const users = sem.filter(
      (v) => v !== variable && v.valuesByMode[S]?.type === 'VARIABLE_ALIAS' && v.valuesByMode[S].id === clash.id,
    );
    if (users.length || clash.resolvedType !== change.type)
      throw new Error(`${name} existe déjà et sert ailleurs : arbitrage manuel.`);
    set(clash, P, value);
    set(variable, S, figma.variables.createVariableAlias(clash));
    report.push(`${change.name} → primitive ${name} mise à jour = ${change.to}`);
    continue;
  }
  const created = DRY
    ? { id: `simulée:${name}`, name, resolvedType: change.type, valuesByMode: { [P]: value } }
    : figma.variables.createVariable(name, primitives, change.type);
  set(created, P, value);
  if (!DRY) set(variable, S, figma.variables.createVariableAlias(created));
  prim.push(created);
  report.push(`${change.name} → nouvelle primitive ${name} = ${change.to}`);
}
return (DRY ? 'SIMULATION, rien n’est écrit :\n' : '') + report.join('\n');
