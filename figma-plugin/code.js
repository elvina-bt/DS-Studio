// Plugin DS-Studio Docs. Décrit la sélection (composants et variables liées) à
// l'interface, qui interroge DS-Studio sur ce poste. Seule écriture possible :
// poser une instance d'un composant de PFE – Components, quand on clique
// « Insérer ».
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

// Instance d'un composant publié (bibliothèque), sinon du fichier courant
// quand on travaille dans PFE – Components lui-même.
async function insert(key) {
  if (figma.editorType === 'dev')
    return { ok: false, error: 'Insertion impossible en Dev Mode.' };
  let component;
  try {
    component = await figma.importComponentByKeyAsync(key);
  } catch {
    await figma.currentPage.loadAsync();
    component = figma.currentPage.findOne(
      (n) => n.type === 'COMPONENT' && n.key === key,
    );
  }
  if (!component)
    return {
      ok: false,
      error:
        'Composant introuvable : publie la bibliothèque PFE – Components et ajoute-la à ce fichier.',
    };
  const instance = component.createInstance();
  const center = figma.viewport.center;
  instance.x = Math.round(center.x - instance.width / 2);
  instance.y = Math.round(center.y - instance.height / 2);
  figma.currentPage.appendChild(instance);
  figma.currentPage.selection = [instance];
  return { ok: true, name: instance.name };
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
  // Composant source dans PFE – Components.
  if (
    message?.type === 'open' &&
    /^https:\/\/www\.figma\.com\/design\/dRoA2PB74Ne8TWXz5Cafin\/PFE---Components\?node-id=\d+-\d+$/.test(
      message.url,
    )
  )
    figma.openExternal(message.url);
  if (message?.type === 'insert' && /^[0-9a-f]{40}$/.test(message.key))
    void insert(message.key).then((result) =>
      figma.ui.postMessage({ type: 'inserted', ...result }),
    );
};
