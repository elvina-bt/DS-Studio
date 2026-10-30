// Plugin DS-Studio Docs. Décrit la sélection (composants et variables liées) à
// l'interface, qui interroge DS-Studio sur ce poste. Écritures, seulement sur
// clic : poser une instance d'un composant de PFE – Components (« Insérer »), et
// créer dans PFE – Components les composants du laboratoire (« Créer dans Figma »).
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

// --- Laboratoire : créer dans PFE – Components les composants construits dans
// desys studio. Même logique que desys/.agents/skills/figma-sync/push-lab.js :
// une page et une section au nom du composant, un composant fait d'instances
// des composants existants (textes remplacés) et de piles (auto layout aux
// valeurs des tokens). Une mise à jour garde le même nœud et la même clé.
const LAB_PAD = 80;
const labAxis = {
  start: 'MIN',
  center: 'CENTER',
  end: 'MAX',
  between: 'SPACE_BETWEEN',
};
function labCopyStyle(from, to) {
  for (const k of [
    'fills',
    'strokes',
    'strokeWeight',
    'strokeAlign',
    'cornerRadius',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'itemSpacing',
  ])
    if (from && k in from && from[k] !== figma.mixed)
      to[k] = JSON.parse(JSON.stringify(from[k]));
  to.layoutMode =
    from && from.layoutMode && from.layoutMode !== 'NONE'
      ? from.layoutMode
      : 'VERTICAL';
}
function labLayout(node, l) {
  node.layoutMode = l.direction === 'row' ? 'HORIZONTAL' : 'VERTICAL';
  node.itemSpacing = l.gap;
  [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft] =
    l.padding;
  node.counterAxisAlignItems =
    labAxis[l.align] && l.align !== 'between' ? labAxis[l.align] : 'MIN';
  node.primaryAxisAlignItems = labAxis[l.justify] || 'MIN';
  node.fills = l.background ? [figma.util.solidPaint(l.background)] : [];
  node.cornerRadius = l.radius;
}
function labFindText(node, from, index) {
  const all = node.findAll((x) => x.type === 'TEXT');
  return all.find((x) => x.characters === from) || all[index] || null;
}
async function labSetText(node, from, to, index) {
  const t = labFindText(node, from, index);
  if (!t) return false;
  if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName);
  else
    for (const f of t.getRangeAllFontNames(0, t.characters.length))
      await figma.loadFontAsync(f);
  t.characters = to;
  return true;
}
async function labBuild(tree, parent, report, where) {
  if (tree.kind === 'instance') {
    const main = await figma.getNodeByIdAsync(tree.ref);
    if (!main || main.type !== 'COMPONENT') {
      report.push(`${where} : variante ${tree.ref} introuvable, ignorée`);
      return;
    }
    const inst = main.createInstance();
    parent.appendChild(inst);
    for (const [i, [from, to]] of tree.texts.entries())
      if (!(await labSetText(inst, from, to, i)))
        report.push(`${where} : texte « ${from} » introuvable`);
    if (parent.layoutMode === 'VERTICAL') inst.layoutSizingHorizontal = 'FILL';
    return;
  }
  if (tree.kind === 'text') {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const t = figma.createText();
    t.characters = tree.text;
    parent.appendChild(t);
    return;
  }
  const ref = tree.ref ? await figma.getNodeByIdAsync(tree.ref) : null;
  const frame = figma.createFrame();
  frame.name = ref ? ref.name : tree.layout ? 'Pile' : 'Groupe';
  labCopyStyle(ref, frame);
  if (tree.layout) labLayout(frame, tree.layout);
  parent.appendChild(frame);
  if (parent.layoutMode === 'VERTICAL') frame.layoutSizingHorizontal = 'FILL';
  frame.layoutSizingVertical = 'HUG';
  for (const [i, c] of tree.children.entries())
    await labBuild(c, frame, report, `${where}.${i + 1}`);
}
// Garde-fou : on n'écrit que dans PFE – Components (repéré par son composant Bouton).
async function inComponentsFile(plan) {
  if (figma.fileKey) return figma.fileKey === plan.fileKey;
  const marker = await figma.getNodeByIdAsync('9:42');
  return !!marker && marker.name === 'Bouton';
}
async function buildLab(plan) {
  if (figma.editorType === 'dev')
    return { ok: false, error: 'Création impossible en Dev Mode.' };
  if (!(await inComponentsFile(plan)))
    return {
      ok: false,
      error: 'Ouvre le fichier PFE – Components pour créer les composants.',
    };
  const report = [];
  const created = [];
  for (const c of plan.components) {
    let component = c.update ? await figma.getNodeByIdAsync(c.update) : null;
    const rootRef =
      c.tree.kind === 'frame' && c.tree.ref
        ? await figma.getNodeByIdAsync(c.tree.ref)
        : null;
    if (component) {
      for (const child of [...component.children]) child.remove();
    } else {
      let page = figma.root.children.find((p) => p.name === c.name);
      if (!page) {
        page = figma.createPage();
        page.name = c.name;
      }
      await figma.setCurrentPageAsync(page);
      const section = figma.createSection();
      section.name = c.name;
      page.appendChild(section);
      component = figma.createComponent();
      section.appendChild(component);
      component.x = LAB_PAD;
      component.y = LAB_PAD;
    }
    component.name = c.name;
    component.description = `${c.description}\ndesys : components/lab/${c.id}.json`;
    labCopyStyle(rootRef, component);
    if (c.tree.kind === 'frame' && c.tree.layout)
      labLayout(component, c.tree.layout);
    component.resize(rootRef ? rootRef.width : 343, component.height);
    component.layoutSizingVertical = 'HUG';
    if (c.tree.kind === 'frame')
      for (const [i, ch] of c.tree.children.entries())
        await labBuild(ch, component, report, `${c.name}.${i + 1}`);
    else await labBuild(c.tree, component, report, `${c.name}.1`);
    const section = component.parent;
    if (section && section.type === 'SECTION')
      section.resizeWithoutConstraints(
        Math.ceil(component.width) + LAB_PAD * 2,
        Math.ceil(component.height) + LAB_PAD * 2,
      );
    report.push(
      `${c.name} : ${c.update ? 'mis à jour' : 'créé'} (${component.id})`,
    );
    created.push({
      id: c.id,
      node: component.id,
      key: component.key,
      hash: c.hash,
    });
  }
  if (created.length) {
    const last = await figma.getNodeByIdAsync(created[created.length - 1].node);
    if (last) figma.viewport.scrollAndZoomIntoView([last]);
  }
  return { ok: true, report, created };
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
  if (message?.type === 'build-lab' && Array.isArray(message.plan?.components))
    void buildLab(message.plan).then(
      (result) => figma.ui.postMessage({ type: 'lab-built', ...result }),
      (e) =>
        figma.ui.postMessage({
          type: 'lab-built',
          ok: false,
          error: String(e?.message || e),
        }),
    );
  if (message?.type === 'insert' && /^[0-9a-f]{40}$/.test(message.key))
    void insert(message.key).then((result) =>
      figma.ui.postMessage({ type: 'inserted', ...result }),
    );
};
