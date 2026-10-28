import { test, expect } from '@playwright/test';

test('boucle centrale réelle : diff, validation, propagation, recharge, annulation sélective', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'DS-Studio · atelier du Design System',
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Figma : synchro manuelle via Claude Code', { exact: true }),
  ).toBeVisible();
  const catalogue = page.locator('.ds-panel');
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await page
    .getByRole('combobox', { name: 'Application', exact: true })
    .selectOption('lisiere');
  await page.getByRole('tab', { name: 'Composants' }).click();
  const mobile = page.frameLocator('iframe');
  const mainButton = catalogue.getByRole('button', {
    name: 'Nouvelle sortie',
    exact: true,
  });
  await expect(mainButton).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await page.getByLabel('Valeur du token').fill('#8A3B20');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('#3154C4');
  await expect(dialog).toContainText('#8A3B20');
  await expect(mainButton).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await dialog.getByRole('button', { name: 'Ne pas appliquer' }).click();
  await expect(mainButton).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(mainButton).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await expect(
    catalogue.getByRole('button', { name: 'Voir les sites', exact: true }),
  ).toHaveCSS('color', 'rgb(138, 59, 32)');
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await expect(
    mobile.getByRole('button', { name: 'Réserver une place', exact: true }),
  ).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await expect(
    mobile.getByRole('button', { name: 'Découvrir', exact: true }),
  ).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await page.reload();
  await expect(mainButton).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await page
    .getByRole('combobox', { name: 'Application', exact: true })
    .selectOption('lisiere');
  await page.getByRole('tab', { name: 'Composants' }).click();
  await page.getByRole('button', { name: 'space.md', exact: true }).click();
  await page.getByLabel('Valeur du token').fill('22');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await page.getByRole('button', { name: /Historique/ }).click();
  await page
    .getByRole('button', { name: 'Annuler la révision 1', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(mainButton).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await expect(mainButton).toHaveCSS('padding-left', '22px');
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await expect(
    mobile.getByRole('button', { name: 'Réserver une place', exact: true }),
  ).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await page.screenshot({ path: 'test-results/studio.png', fullPage: true });
});

test('largeurs réelles, interactions, formulaire et desktop responsive', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await page
    .getByRole('combobox', { name: 'Application', exact: true })
    .selectOption('lisiere');
  const frame = page.frameLocator('iframe');
  for (const [value, width] of [
    ['0', 320],
    ['1', 375],
    ['2', 430],
    ['3', 1024],
  ] as const) {
    await page
      .getByRole('combobox', { name: 'Viewport', exact: true })
      .selectOption(value);
    await expect(page.locator('iframe')).toHaveAttribute(
      'width',
      String(width),
    );
    await expect
      .poll(() =>
        page
          .locator('iframe')
          .evaluate((f: HTMLIFrameElement) => f.contentWindow?.innerWidth),
      )
      .toBe(width);
    expect(
      await frame
        .locator('body')
        .evaluate((el) => el.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const columns = await frame
      .locator('.scenario-grid')
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
      );
    expect(columns).toBe(width >= 700 ? 2 : 1);
  }
  await page
    .getByRole('combobox', { name: 'Viewport', exact: true })
    .selectOption('1');
  await frame
    .getByRole('button', { name: 'Réserver une place', exact: true })
    .click();
  await expect(
    frame.getByRole('button', { name: 'Réservation confirmée ✓' }),
  ).toBeVisible();
  await frame.getByRole('button', { name: 'Favoris', exact: true }).click();
  await expect(
    frame.getByText('Vos ateliers favoris apparaîtront ici.'),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Scénario', exact: true })
    .selectOption('form');
  await frame.getByLabel('Votre prénom').fill('Camille');
  await frame.getByLabel('Adresse e-mail').fill('camille@example.com');
  await frame.getByRole('checkbox').check();
  await frame.getByRole('button', { name: 'S’inscrire', exact: true }).click();
  await expect(frame.getByText(/Merci ! Démonstration locale/)).toBeVisible();
  await page.setViewportSize({ width: 700, height: 900 });
  expect(
    await page
      .locator('body')
      .evaluate((el) => el.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test('entrée couleur invalide sans mutation et clavier du diff', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Valeur du token').fill('red');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Données invalides');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByLabel('Valeur du token').fill('#123456');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ne pas appliquer' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('export navigateur, import valide avec diff, fichier invalide sans écriture', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Variables', exact: true }),
  ).toBeVisible();
  const before = await (await page.request.get('/api/state')).json();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter les tokens' }).click();
  const file = await download;
  const { readFile } = await import('node:fs/promises');
  const exported = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(exported).toEqual(before.tokens);
  exported['color.success'].$value = '#125533';
  await page.getByLabel('Importer un JSON').setInputFiles({
    name: 'palette.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('color.success');
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    before.revision,
  );
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(dialog).not.toBeVisible();
  const after = await (await page.request.get('/api/state')).json();
  expect(after.tokens['color.success'].$value).toBe('#125533');
  await page.getByLabel('Importer un JSON').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    after.revision,
  );
});

test('V2 : contraste proposé immédiat sans modifier les composants enregistrés', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'color.brand', exact: true }).click();
  await page.getByLabel('Valeur du token').fill('#FFFFFF');
  await expect(
    page.getByText('Contraste proposé :', { exact: false }),
  ).toContainText('1.00:1');
  await expect(
    page.getByText('Contraste proposé :', { exact: false }),
  ).toContainText('Contraste à améliorer');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const current = await (await page.request.get('/api/state')).json();
  expect(current.tokens['color.brand'].$value).not.toBe('#FFFFFF');
});

test('V2 : brief privé persistant, indépendant du mode IA', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByText('Mon PFE · brief privé', { exact: true }).click();
  await page
    .getByLabel('Nom du PFE', { exact: true })
    .fill('Mon atelier accessible');
  await page
    .getByLabel('Public concerné', { exact: true })
    .fill('Étudiants en mobilité');
  await page
    .getByLabel('Objectif et critères de réussite', { exact: true })
    .fill('Réserver en moins de trois étapes');
  await page.getByRole('button', { name: 'Enregistrer le brief' }).click();
  await expect(page.getByText('Brief enregistré sur ce poste.')).toBeVisible();
  await page.reload();
  await page.getByText('Mon PFE · brief privé', { exact: true }).click();
  await expect(page.getByLabel('Nom du PFE', { exact: true })).toHaveValue(
    'Mon atelier accessible',
  );
  await expect(
    page.getByRole('combobox', { name: 'Mode de travail' }),
  ).toHaveValue('claude');
});

test('V2 : recherche, brouillon récupéré après recharge et abandon sans écriture', async ({
  page,
}) => {
  await page.goto('/');
  const before = await (await page.request.get('/api/state')).json();
  await page.getByLabel('Rechercher une variable').fill('space');
  await expect(
    page.getByText('3 résultat(s).', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'space.lg', exact: true }).click();
  await page.getByLabel('Valeur du token').fill('31');
  await expect(
    page.getByText('Brouillon non enregistré.', { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'space.lg', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Valeur du token')).toHaveValue('31');
  await expect(
    page.getByText('Brouillon récupéré', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner le brouillon' }).click();
  await expect(page.getByLabel('Valeur du token')).toHaveValue(
    String(before.tokens['space.lg'].$value),
  );
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    before.revision,
  );
});

test('V2 : conflit multi-onglets visible dans le diff, aucune perte de données', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'color.brand', exact: true }).click();
  await page.getByLabel('Valeur du token').fill('#223355');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'color.brand', exact: true }).click();
  await other.getByLabel('Valeur du token').fill('#664422');
  await other.getByRole('button', { name: 'Proposer', exact: true }).click();
  await other.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(other.getByRole('dialog')).not.toBeVisible();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('Une autre validation');
  await expect(
    dialog.getByRole('button', { name: 'Valider et enregistrer' }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Ne pas appliquer' }).click();
  expect(
    (await (await page.request.get('/api/state')).json()).tokens['color.brand']
      .$value,
  ).toBe('#664422');
  await other.close();
});

test('V2 : capacité de session périmée simulée sans rejeu ambigu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Variables', exact: true }).waitFor();
  const boot = await (await page.request.get('/api/bootstrap')).json();
  // Un seul refus certain avant mutation, comme une capacité périmée après restart.
  let requests = 0;
  await page.route('**/api/proposals', async (route) => {
    requests++;
    if (requests === 1)
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation de session manquante. Rechargez la page.',
        }),
      });
    expect(route.request().headers()['x-ds-studio']).toBe(boot.csrf);
    return route.continue();
  });
  await page.getByRole('button', { name: 'color.focus', exact: true }).click();
  await page.getByLabel('Valeur du token').fill('#776622');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(requests).toBe(2);
  await page.keyboard.press('Escape');
});

test('V2 : clavier, mobile 375 px et absence de stockage navigateur', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Stockage refusé');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('Stockage refusé');
    };
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('heading', { name: 'Variables', exact: true }).waitFor();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Aller aux variables' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Variables', exact: true }),
  ).toBeFocused();
  await page.getByLabel('Valeur du token').fill('#114477');
  await page.getByRole('button', { name: 'Proposer', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(
    await page.locator('body').evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBe(true);
});

test('app parapente par défaut : 4 onglets, tokens appliqués, sans débordement', async ({
  page,
}) => {
  await page.goto('/');
  const app = page.frameLocator('iframe');
  // Le catalogue présente les composants dont l’app est faite.
  for (const name of [
    'Bouton',
    'Titre et en-tête de section',
    'Champ de recherche',
    'Carte de prévision',
    'Badge',
    'Ligne de liste',
    'Barre d’onglets',
  ])
    await expect(
      page.locator('.ds-panel').getByRole('region', { name, exact: true }),
    ).toBeVisible();
  // Les tests partagent l’état : on compare au bouton du catalogue, pas à une valeur fixe.
  const brand = await page
    .locator('.ds-panel')
    .getByRole('button', { name: 'Nouvelle sortie', exact: true })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await expect(
    app.getByRole('heading', { name: 'Préparer', level: 1 }),
  ).toBeVisible();
  await expect(
    app.getByRole('button', { name: 'Nouvelle sortie', exact: true }),
  ).toHaveCSS('background-color', brand);
  for (const tab of ['Débriefer', 'Progresser', 'Profil', 'Préparer']) {
    await app.getByRole('button', { name: tab, exact: true }).click();
    await expect(
      app.getByRole('heading', { name: tab, level: 1 }),
    ).toBeVisible();
  }
  await page
    .getByRole('combobox', { name: 'Viewport', exact: true })
    .selectOption('0');
  expect(
    await app
      .locator('body')
      .evaluate((el) => el.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test('panneau Variables : groupes, recherche, édition sur place et diff sans écriture', async ({
  page,
}) => {
  await page.goto('/');
  const before = await (await page.request.get('/api/state')).json();
  const panel = page.locator('.variables-panel');
  await panel.getByRole('button', { name: /^Espacements/ }).click();
  await expect(panel.getByRole('rowheader')).toHaveCount(3);
  await panel.getByRole('button', { name: /^Toutes/ }).click();
  await panel.getByLabel('Rechercher une variable').fill('heading');
  await expect(panel.getByRole('rowheader')).toHaveCount(1);
  await panel
    .getByRole('button', { name: 'font.heading', exact: true })
    .click();
  const current = String(before.tokens['font.heading'].$value);
  await expect(panel.getByLabel('Valeur du token')).toHaveValue(current);
  await expect(
    page.getByRole('button', { name: 'font.heading', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await panel.getByLabel('Valeur du token').fill('31');
  await expect(page.getByLabel('Valeur du token')).toHaveValue('31');
  await panel.getByRole('button', { name: 'Proposer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('font.heading');
  await dialog.getByRole('button', { name: 'Ne pas appliquer' }).click();
  const after = await (await page.request.get('/api/state')).json();
  expect(after.revision).toBe(before.revision);
});

test('documentation : navigation, aperçu vivant, édition avec diff puis enregistrement', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Documentation', exact: true }).click();
  await expect(page).toHaveURL(/#\/docs$/);
  await expect(
    page.getByRole('heading', { name: 'Bienvenue', level: 2 }),
  ).toBeVisible();
  const nav = page.getByRole('navigation', {
    name: 'Pages de documentation',
  });
  await nav.getByRole('link', { name: /^Bouton/ }).click();
  await expect(page).toHaveURL(/#\/docs\/bouton$/);
  const specimen = page.getByRole('figure', { name: 'Aperçu : Bouton' });
  await expect(
    specimen.getByRole('button', { name: 'Nouvelle sortie', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.doc-callout.dont')).toHaveCount(1);
  const outline = page.getByRole('navigation', { name: 'Sur cette page' });
  await outline.hover();
  await outline.getByRole('button', { name: 'Aperçu', exact: true }).click();
  await expect(
    outline.getByRole('button', { name: 'Aperçu', exact: true }),
  ).toHaveAttribute('aria-current', 'location');

  await page.getByRole('button', { name: 'Modifier la page' }).click();
  const editor = page.getByRole('form', { name: 'Modifier la page' });
  const body = editor.getByLabel('Contenu (Markdown)');
  await body.fill((await body.inputValue()) + '\n\n:::note\nTest e2e.\n:::');
  await expect(
    page.getByLabel('Aperçu').locator('.doc-callout.note'),
  ).toHaveCount(1);
  await editor.getByRole('button', { name: 'Enregistrer…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Valider la page' });
  await expect(dialog).toContainText('+ :::note');
  await expect(dialog).toContainText('+ Test e2e.');
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(page.getByRole('status')).toContainText(
    'workspace/docs/bouton.md',
  );
  await expect(page.locator('.docs-page .doc-callout.note')).toContainText(
    'Test e2e.',
  );
  await page.reload();
  await expect(page.locator('.docs-page .doc-callout.note')).toContainText(
    'Test e2e.',
  );
  await page.getByRole('link', { name: 'Atelier', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Variables', exact: true }),
  ).toBeVisible();
});

test('documentation : demander au DS, réponse et page citée (Claude simulé)', async ({
  page,
}) => {
  // Aucune requête réelle au service IA : la réponse de /api/ask est simulée.
  let sent: { question: string; history: unknown[] } | undefined;
  await page.route('**/api/ask', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      json: {
        message: 'Utilise **`color.text`**, voir [Couleurs](doc:couleurs).',
        sources: [{ slug: 'couleurs', title: 'Couleurs' }],
      },
    });
  });
  await page.goto('/#/docs');
  await page.getByRole('button', { name: 'Demander' }).click();
  const panel = page.getByRole('complementary', {
    name: 'Demander au Design System',
  });
  await panel.getByLabel('Ta question').fill('Quelle couleur pour un écart ?');
  await panel.getByLabel('Ta question').press('Enter');
  await expect(panel.locator('.ask-answer')).toContainText('color.text');
  expect(sent?.question).toBe('Quelle couleur pour un écart ?');
  await panel
    .getByRole('list', { name: 'Pages citées' })
    .getByRole('link', { name: 'Couleurs' })
    .click();
  await expect(page).toHaveURL(/#\/docs\/couleurs$/);
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Fermer' }).click();
  await expect(panel).toHaveCount(0);
});
