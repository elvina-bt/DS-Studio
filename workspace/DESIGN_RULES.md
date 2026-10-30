# Règles de conception — app parapente

## Socle

- Employer les couleurs sémantiques plutôt que des hexadécimaux dans les composants.
- Distinguer normal, survol, focus, désactivé et erreur.
- Garder un focus clavier visible et des libellés explicites pour les formulaires.
- Expliquer chaque proposition : intention, composants touchés, preuve attendue.

## Terrain : lisible en plein soleil

- Texte courant à 4,5:1 minimum, **viser 7:1** pour les valeurs de vent, rafales et
  horaires (lues au décollage, écran incliné, en plein soleil).
- Grand texte et éléments graphiques utiles (icônes, bordures de champ) à 3:1 minimum.
- Aucune information portée par la seule couleur : une valeur, un mot ou une icône
  accompagne toujours un code couleur.
- Texte courant à 16 px minimum sur iPhone ; anticiper le Dynamic Type sans casser
  les tableaux prévu / vécu.
- Tailles de texte en **multiples de 4 px** (8 de préférence : 12, 16, 20, 24, 28,
  32…) ; jamais de taille de police en pixels impairs (11, 13, 17…) ni à virgule.
- Cibles tactiles de 44 × 44 pt minimum (gants fins, doigts froids).

## Prévision, écart et incertitude

- **Jamais de verdict « vole / ne vole pas »**, ni de bouton, couleur ou icône qui en
  tienne lieu. L’app compare et explique ; la décision reste au pilote.
- Une prévision s’affiche en **plage** (ex. 12–18 km/h) avec un niveau de confiance,
  jamais comme une valeur unique et certaine.
- Un écart prévu / vécu est **neutre** (badge, valeur signée) : jamais `color.danger`,
  qui reste réservé aux erreurs de saisie et aux actions destructrices.
- Le jargon météo est expliqué (glossaire, aide contextuelle), pas supprimé.

## Mobile d’abord

- Vérifier 320, 375 et 430 px sans zoom ni défilement horizontal, puis 1024 px
  pour le site vitrine.
- Structure iOS : 4 onglets (Préparer, Débriefer, Progresser, Profil), grand titre,
  cartes groupées ; l’action principale reste atteignable au pouce.

## Données et Figma

- Exemples du catalogue fictifs : aucun vrai vol, lieu personnel ou niveau de pilote.
- Ne jamais annoncer une synchronisation Figma qui n’a pas été relue et démontrée.
  Le rapprochement suit `../desys/FIGMA.md`.

Ces règles sont des objectifs à tester, pas une certification automatique.
