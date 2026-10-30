# Plugin Figma desys → Figma

Reporte dans **PFE – Components** les composants construits dans le laboratoire
de desys studio, sans rien recréer à la main.

- Liste les composants du laboratoire à créer ou à mettre à jour dans Figma.
- **Reporter dans Figma** : pour chacun, une page et une section à son nom, et
  un composant fait d’instances des composants existants (textes remplacés) et
  de piles (auto layout aux valeurs des tokens). Une mise à jour garde le même
  nœud et la même clé : les instances déjà posées suivent.
- Renvoie le lien Figma (nœud, clé) à desys (`components/lab/<id>.json`) : le
  studio passe à « Dans Figma · à publier ».

Il n’écrit que dans PFE – Components (il vérifie le fichier ouvert), et desys
n’enregistre le lien que pour la version exacte du composant envoyée. En Dev
Mode, rien n’est créé.

## Installer (une fois, sur ce Mac)

1. Lance desys studio (`npm start`, adresse http://127.0.0.1:4310).
2. Ouvre l’**application Figma desktop** (l’import de plugin local n’existe pas
   dans le navigateur).
3. Menu **Plugins → Development → Import plugin from manifest…** et choisis
   `figma-plugin-desys/manifest.json` de ce projet.

## Reporter un composant

1. Dans Figma desktop, ouvre **PFE – Components**.
2. **Plugins → Development → desys → Figma**.
3. **Reporter dans Figma**.
4. **Assets → Publier** la bibliothèque : la synchro GitHub passe le composant à
   « Iso Figma ». La publication reste un clic dans Figma : aucune API ne la
   fait.

Le plugin relit le laboratoire quand tu reviens dans sa fenêtre ; **Actualiser**
le fait à la demande.
