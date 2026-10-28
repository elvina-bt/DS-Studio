---
title: Typographie
section: fondations
order: 30
summary: Police système iOS, deux tailles de référence et des dérivés calculés.
status: brouillon
figma: font
---

## Tokens

{{tokens:font}}

`font.family` vaut `system-ui` dans le code et **SF Pro** dans Figma : c’est la même police système sur iPhone, seul écart volontaire de valeur.

## Échelle

| Usage | Taille |
| ----- | ------ |
| Grand titre d’écran | `font.heading` × 1,2 |
| Titre de carte | `font.body` × 1,25 |
| Texte courant | `font.body` |
| En-tête de section, note | `font.body` × 0,8125 |
| Libellé d’onglet | `font.body` × 0,6875 |

:::do Texte généreux
17 px minimum pour le texte courant sur iPhone ; anticiper le Dynamic Type.
:::

:::dont Petit texte gris
Pas de texte sous 13 px en `color.muted` pour une information utile en vol.
:::
