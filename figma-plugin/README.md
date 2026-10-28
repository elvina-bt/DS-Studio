# Plugin Figma « DS-Studio Docs »

Affiche dans Figma la documentation DS-Studio de ce que tu sélectionnes : la page
du composant (usage, à faire / à éviter) et les variables liées avec leur valeur.
**Lecture seule** : le plugin ne modifie ni ton fichier Figma ni DS-Studio.

## Installer (plugin de développement, sur ce Mac)

1. Lance DS-Studio (`npm start`, adresse http://127.0.0.1:4310).
2. Ouvre l’**application Figma desktop** (l’import de plugin local n’existe pas
   dans le navigateur).
3. Menu **Plugins → Development → Import plugin from manifest…** et choisis
   `figma-plugin/manifest.json` de ce projet.
4. Dans un fichier, **Plugins → Development → DS-Studio Docs**. En Dev Mode, il
   apparaît dans le panneau Inspect.

## Relier une page à Figma

Le plugin cherche les pages dont le champ **« Noms dans Figma »** (éditeur de la
doc DS-Studio) contient :

- le nom du composant sélectionné, ou de son ensemble de variantes
  (ex. `Carte de prévision`) ;
- le nom d’une variable liée au calque (ex. `color/brand`) ou son groupe (`color`).

Les pages de départ utilisent des noms français (« Bouton », « Carte de
prévision »…). Nomme tes composants de **PFE – Components** pareil, ou ajuste le
champ dans DS-Studio.

## Limites

- Fonctionne seulement quand DS-Studio tourne sur le même poste (port 4310).
- Plugin de développement : il n’est pas publié sur la Communauté Figma.
- Les aperçus vivants et tableaux de tokens restent dans DS-Studio ; le bouton
  « Ouvrir dans DS-Studio » y mène.
- Testé : réponses du serveur (tests automatisés) et affichage de l’interface dans
  un navigateur. **Pas encore lancé dans Figma** au moment de l’écriture.
