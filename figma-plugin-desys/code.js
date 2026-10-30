// Plugin desys → Figma. Reporte dans PFE – Components les composants construits
// dans le laboratoire de desys studio, puis renvoie leur lien (nœud, clé) à
// desys. Seule écriture, sur clic : « Reporter dans Figma ».
figma.showUI(__html__, { width: 340, height: 480, themeColors: true });

// Créer dans PFE – Components les composants construits dans
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

figma.ui.onmessage = (message) => {
  // L'interface demande si le fichier ouvert est bien PFE – Components.
  if (message?.type === 'check' && message.fileKey)
    void inComponentsFile({ fileKey: message.fileKey }).then((ok) =>
      figma.ui.postMessage({ type: 'file', ok }),
    );
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
  // Composant reporté, dans PFE – Components.
  if (
    message?.type === 'open' &&
    /^https:\/\/www\.figma\.com\/design\/dRoA2PB74Ne8TWXz5Cafin\/PFE---Components\?node-id=\d+-\d+$/.test(
      message.url,
    )
  )
    figma.openExternal(message.url);
  // Le composant dans le laboratoire de desys studio.
  if (
    message?.type === 'open' &&
    /^http:\/\/(127\.0\.0\.1|localhost):4310\/#\/laboratoire\/[a-z0-9-]{1,41}$/.test(
      message.url,
    )
  )
    figma.openExternal(message.url);
};
