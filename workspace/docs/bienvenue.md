---
title: Bienvenue
section: accueil
order: 0
summary: Le Design System de l’app parapente : une seule source pour les fondations, le ton, les tokens et les composants.
status: stable
---

## À quoi sert ce DS

Aider les pilotes fraîchement formés à **comparer ce que la prévision annonçait à ce qu’ils ont vécu**, sur iPhone, au décollage comme au retour de vol. Chaque décision de ce DS sert ce parcours : préparer, débriefer, progresser.

:::note Garde-fou du projet
L’app ne dit jamais « vole » ou « ne vole pas ». Elle explique et compare ; la décision reste au pilote.
:::

## Comment lire cette doc

- **Fondations** : principes, couleurs, typographie, espacements, accessibilité.
- **Tone of voice** : comment l’app parle aux pilotes.
- **Design tokens** : les 18 variables partagées entre Figma et le code.
- **Composants** : usage, do / don’t et aperçu vivant de chaque composant.

## D’où viennent les données

| Élément | Source |
| ------- | ------ |
| Tokens | Figma **PFE – Tokens** (collection Semantics) ↔ atelier DS-Studio |
| Composants | Figma **PFE – Components** ↔ `app/client/ParapenteDS.tsx` |
| Doc | `workspace/docs/`, versionnée avec le projet |

Les aperçus de cette doc utilisent les tokens enregistrés dans l’atelier : une valeur validée dans l’atelier change immédiatement les exemples.
