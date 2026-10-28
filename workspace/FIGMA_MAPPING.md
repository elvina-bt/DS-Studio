# Correspondance Figma ↔ DS-Studio

Contrat de nommage entre la bibliothèque Figma **PFE – Tokens** et
`workspace/design-system.tokens.json`. Valeurs de départ : exemple Lisière, repris
tel quel pour établir la liaison. Les couleurs de marque du projet parapente
viendront dans un second temps.

Synchronisation **manuelle** : modifier d’un côté, reporter de l’autre (import JSON
et diff validé dans DS-Studio), tester, consigner dans `DECISIONS.md`.

## Règle de nommage

- Figma groupe avec `/`, DS-Studio avec `.` : `color/brand` ↔ `color.brand`.
- Les noms des tokens sémantiques sont **identiques** des deux côtés, casse comprise
  (`color/brandHover` ↔ `color.brandHover`).
- Seule la collection **Semantics** est rapprochée de DS-Studio. Les composants Figma
  utilisent uniquement des tokens sémantiques, jamais des primitives.

## Collection Primitives (Figma uniquement)

| Variable             | Type   | Valeur    |
| -------------------- | ------ | --------- |
| `color/blue/600`     | Color  | `#3154C4` |
| `color/blue/800`     | Color  | `#243F99` |
| `color/neutral/0`    | Color  | `#FFFFFF` |
| `color/neutral/50`   | Color  | `#F3F5FA` |
| `color/neutral/300`  | Color  | `#BCC5D6` |
| `color/neutral/600`  | Color  | `#536078` |
| `color/neutral/900`  | Color  | `#19243D` |
| `color/red/600`      | Color  | `#B4233E` |
| `color/green/700`    | Color  | `#18734B` |
| `color/violet/500`   | Color  | `#7856C8` |
| `font/family/system` | String | `SF Pro`  |
| `size/8`             | Number | `8`       |
| `size/10`            | Number | `10`      |
| `size/16`            | Number | `16`      |
| `size/24`            | Number | `24`      |
| `size/28`            | Number | `28`      |

`font/family/system` vaut `SF Pro` dans Figma (police système iOS) et `system-ui`
dans DS-Studio, qui l’affiche avec SF Pro sur iPhone et Mac. C’est le seul écart
volontaire de valeur.

## Collection Semantics (rapprochée de DS-Studio)

| Figma              | Alias vers           | DS-Studio          | Valeur      |
| ------------------ | -------------------- | ------------------ | ----------- |
| `color/brand`      | `color/blue/600`     | `color.brand`      | `#3154C4`   |
| `color/brandHover` | `color/blue/800`     | `color.brandHover` | `#243F99`   |
| `color/onBrand`    | `color/neutral/0`    | `color.onBrand`    | `#FFFFFF`   |
| `color/surface`    | `color/neutral/0`    | `color.surface`    | `#FFFFFF`   |
| `color/canvas`     | `color/neutral/50`   | `color.canvas`     | `#F3F5FA`   |
| `color/text`       | `color/neutral/900`  | `color.text`       | `#19243D`   |
| `color/muted`      | `color/neutral/600`  | `color.muted`      | `#536078`   |
| `color/border`     | `color/neutral/300`  | `color.border`     | `#BCC5D6`   |
| `color/danger`     | `color/red/600`      | `color.danger`     | `#B4233E`   |
| `color/success`    | `color/green/700`    | `color.success`    | `#18734B`   |
| `color/focus`      | `color/violet/500`   | `color.focus`      | `#7856C8`   |
| `font/family`      | `font/family/system` | `font.family`      | `system-ui` |
| `font/body`        | `size/16`            | `font.body`        | `16`        |
| `font/heading`     | `size/28`            | `font.heading`     | `28`        |
| `space/sm`         | `size/8`             | `space.sm`         | `8`         |
| `space/md`         | `size/16`            | `space.md`         | `16`        |
| `space/lg`         | `size/24`            | `space.lg`         | `24`        |
| `radius/control`   | `size/10`            | `radius.control`   | `10`        |

## Collection Breakpoints (Figma, pas encore dans DS-Studio)

| Variable              | Valeur | Usage                               |
| --------------------- | ------ | ----------------------------------- |
| `breakpoint/mobile-s` | `320`  | Plus petit iPhone, test obligatoire |
| `breakpoint/mobile-m` | `375`  | iPhone standard                     |
| `breakpoint/mobile-l` | `430`  | iPhone grand format                 |
| `breakpoint/desktop`  | `1024` | Site vitrine                        |

Ce sont les largeurs déjà testées par le viewport de DS-Studio. Les ajouter comme
tokens DS-Studio demanderait une migration du schéma (`app/shared/model.ts`).

## Relecture du 2026-10-27

Les 38 variables de PFE – Tokens ont été relues une à une (lecture seule, API
Plugin) : 16 Primitives, 18 Semantics, 4 Breakpoints, un mode chacune. Valeurs,
alias et syntaxe de code `var(--…)` conformes aux tableaux ci-dessus.

L’état courant de DS-Studio s’en écarte sur deux tokens, modifiés et validés dans
l’atelier sans report dans Figma :

| Token          | Figma     | DS-Studio |
| -------------- | --------- | --------- |
| `color.canvas` | `#F3F5FA` | `#F2F2F7` |
| `font.heading` | `28`      | `34`      |

À trancher : reporter ces valeurs dans Figma ou les annuler dans DS-Studio.

## Limites connues

- Le contraste de `color/border` sur blanc (~1,7:1, calcul manuel) est sous le
  3:1 attendu pour une bordure de champ : à corriger avec la nouvelle palette.
- Ajouter un token sémantique d’un côté exige de l’ajouter de l’autre ; côté
  DS-Studio, cela passe par une migration du schéma, pas par une simple édition.

## Composants — PFE – Components (2026-10-28)

Section « Composants PFE », page « Composants ». Couleurs, espacements, rayons et
tailles de base liés aux variables Semantics de PFE – Tokens ; tailles dérivées du
code (titre × 1,2, en-tête × 0,8125, carte × 1,4…) fixées en dur. Police **Inter**
(SF Pro, police locale, ne se mesure pas dans l’environnement de création).

| Composant Figma    | Variantes                                                               | Stories DS-Studio                                              |
| ------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Bouton             | Variante (Principal, Secondaire, Destructif) × État (Défaut, Désactivé) | `bouton--principal`, `--secondaire`, `--danger`, `--desactive` |
| Titre              | Type (Grand titre, En-tête de section)                                  | `titre--grand-titre`, `--en-tete-section`                      |
| Champ de recherche | —                                                                       | `recherche--site`                                              |
| Badge              | —                                                                       | `badge--confiance`, `--ecart`                                  |
| Ligne de liste     | Type (Navigation, Valeur, Badge, Interrupteur)                          | `ligne-liste--valeur`, `--interrupteur`                        |
| Liste groupée      | —                                                                       | `ligne-liste--liste`                                           |
| Carte de prévision | Note (Oui, Non)                                                         | `carte-prevision--confiance-moyenne`, `--sans-note`            |
| Barre d’onglets    | Onglet actif (Préparer, Débriefer, Progresser, Profil)                  | `barre-onglets--preparer`                                      |

Nœuds et clés : champ `figma` de chaque story dans `app/shared/stories.ts`. Si un
composant est recréé, ses ID changent : mettre à jour ce champ.
