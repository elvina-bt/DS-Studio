# Plugin Figma « DS-Studio Docs »

Affiche dans Figma la documentation DS-Studio de ce que tu sélectionnes : la page
du composant (usage, à faire / à éviter), les variables liées avec leur valeur, et
les variantes du composant avec **Insérer** (pose une instance) et **Figma** (ouvre le
composant source dans PFE – Components).

**Seule écriture** : « Insérer » ajoute une instance au centre de l’écran, et
seulement quand tu cliques. Le plugin ne modifie rien d’autre, ni dans Figma ni
dans DS-Studio. En Dev Mode, l’insertion est refusée.

## Installer (plugin de développement, sur ce Mac)

1. Lance DS-Studio (`npm start`, adresse http://127.0.0.1:4310).
2. Ouvre l’**application Figma desktop** (l’import de plugin local n’existe pas
   dans le navigateur).
3. Menu **Plugins → Development → Import plugin from manifest…** et choisis
   `figma-plugin/manifest.json` de ce projet.
4. Dans un fichier, **Plugins → Development → DS-Studio Docs**. En Dev Mode, il
   apparaît dans le panneau Inspect.

## Insérer des instances dans tes flows

Les composants vivent dans **PFE – Components** (section « Composants PFE »). Pour
les insérer depuis un autre fichier (tes flows) :

1. Dans PFE – Components, **Assets → Publish** (publier la bibliothèque).
2. Dans le fichier de flows, **Assets → Libraries** et ajoute PFE – Components.
3. Dans le plugin, ouvre la page du composant puis **Insérer** sur la variante.

Sans publication, l’insertion marche seulement dans PFE – Components lui-même.

## Relier une page à Figma

Le plugin cherche les pages dont le champ **« Noms dans Figma »** (éditeur de la
doc DS-Studio) contient :

- le nom du composant sélectionné, ou de son ensemble de variantes
  (ex. `Carte de prévision`) ;
- le nom d’une variable liée au calque (ex. `color/brand`) ou son groupe (`color`).

Les variantes et leurs clés viennent de `desys/src/web/stories.ts` (champ `figma`).

## Limites

- Fonctionne seulement quand DS-Studio tourne sur le même poste (port 4310).
- Plugin de développement : il n’est pas publié sur la Communauté Figma.
- Les aperçus vivants et tableaux de tokens restent dans DS-Studio ; le bouton
  « Ouvrir dans DS-Studio » y mène.
- Testé : réponses du serveur (tests automatisés) et affichage de l’interface dans
  un navigateur. **Pas encore lancé dans Figma** au moment de l’écriture,
  insertion comprise.
