// Plugin DS-Studio Docs : lecture seule. Décrit la sélection (composants et
// variables liées) à l'interface, qui interroge DS-Studio sur ce poste.
// Aucune modification du fichier Figma.
figma.showUI(__html__, { width: 380, height: 600, themeColors: true });

async function describe() {
  const selection = figma.currentPage.selection.slice(0, 20);
  const components = new Set();
  const variables = new Set();
  for (const node of selection) {
    let target = node;
    if (node.type === 'INSTANCE') {
      const main = await node.getMainComponentAsync();
      if (main) target = main;
    }
    if (target.type === 'COMPONENT' && target.parent?.type === 'COMPONENT_SET')
      components.add(target.parent.name);
    components.add(target.name);
    const bound = node.boundVariables ?? {};
    for (const value of Object.values(bound)) {
      for (const alias of [].concat(value)) {
        if (!alias?.id) continue;
        const variable = await figma.variables.getVariableByIdAsync(alias.id);
        if (variable) variables.add(variable.name);
      }
    }
  }
  figma.ui.postMessage({
    type: 'selection',
    count: selection.length,
    components: [...components].slice(0, 20),
    variables: [...variables].slice(0, 20),
  });
}

figma.on('selectionchange', () => void describe());
figma.on('currentpagechange', () => void describe());
figma.ui.onmessage = (message) => {
  if (message?.type === 'ready') void describe();
  // Seule une page de doc DS-Studio locale peut être ouverte.
  if (
    message?.type === 'open' &&
    /^http:\/\/(127\.0\.0\.1|localhost):4310\/#\/docs\/[a-z0-9-]{1,60}$/.test(
      message.url,
    )
  )
    figma.openExternal(message.url);
};
