// Lecture seule, à passer tel quel à l'outil use_figma (Plugin API) sur PFE – Tokens.
// Rend le relevé attendu par `npm run figma:import` et `npm run figma:plan`.
const hex = (c) =>
  '#' +
  [c.r, c.g, c.b]
    .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const semantics = collections.find((c) => c.name === 'Semantics');
if (!semantics) throw new Error('Collection Semantics introuvable.');
const resolve = async (variable, modeId) => {
  let value = variable.valuesByMode[modeId];
  for (let i = 0; i < 5 && value?.type === 'VARIABLE_ALIAS'; i++) {
    const target = await figma.variables.getVariableByIdAsync(value.id);
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      target.variableCollectionId,
    );
    value = target.valuesByMode[collection.defaultModeId];
  }
  return value && typeof value === 'object' && 'r' in value ? hex(value) : value;
};
const variables = [];
for (const id of semantics.variableIds) {
  const variable = await figma.variables.getVariableByIdAsync(id);
  variables.push({
    name: variable.name,
    type: variable.resolvedType,
    value: await resolve(variable, semantics.defaultModeId),
  });
}
return JSON.stringify({
  fileKey: figma.fileKey,
  collection: 'Semantics',
  readAt: new Date().toISOString(),
  variables,
});
