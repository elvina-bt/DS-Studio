---
name: figma-sync
description: Synchroniser la collection Semantics de PFE – Tokens (Figma) et les tokens de DS-Studio, dans un sens ou dans l’autre, via le MCP Figma de Claude Code, avec diff et validation humaine. Utiliser quand l’étudiante demande « synchronise depuis Figma » ou « reporte dans Figma ».
---

# Synchroniser Figma et DS-Studio

DS-Studio n’est **pas connecté** à Figma : c’est l’agent du terminal (Claude Code,
client MCP autorisé par Figma) qui lit et écrit, avec l’accord de l’étudiante.
Ne jamais présenter cette procédure comme une synchronisation automatique.
Contrat de nommage : `workspace/FIGMA_MAPPING.md`. Fichier cible unique :
**PFE – Tokens**, `fileKey` `90pqKBxgw5j3rUlfZmCM0J`. Refuser toute autre cible
sans demande explicite.

Avant tout appel `use_figma`, charger les consignes Figma (`/figma-use`) et ouvrir
une session `create_session` sur ce `fileKey`.

## Relever Figma (lecture seule, les deux sens)

1. Passer le contenu de `read.js` à `use_figma` sur le fichier cible.
2. Enregistrer le JSON rendu dans `workspace/private/figma-dump.json` (ignoré par Git).

## Figma → DS-Studio

3. `npm run figma:import -- workspace/private/figma-dump.json`
   Le script valide les 18 variables (types, plages, polices ; `SF Pro` ↔ `system-ui`),
   liste les différences avec l’atelier et écrit `workspace/private/figma-import.json`.
4. Montrer les différences à l’étudiante. Elle importe le fichier avec **Importer un
   JSON**, examine le diff et la revue des composants, puis valide elle-même.
   Ne jamais valider à sa place ni écrire `.ds-studio/state.json`.

## DS-Studio → Figma (après validation dans l’atelier)

3. `npm run figma:plan -- workspace/private/figma-dump.json`
   Le script compare l’état validé de l’atelier au relevé et écrit
   `workspace/private/figma-changes.json`.
4. Afficher le plan (variable, avant, après) et **attendre un accord explicite** pour
   ce plan précis. Un accord donné pour un plan précédent ne vaut pas pour celui-ci.
5. Le relevé doit dater de la même session : sinon relever à nouveau (étape 1) et
   recalculer le plan, pour ne pas écraser une modification faite entre-temps.
6. Remplacer `__PLAN__` dans `apply.js` par le contenu de `figma-changes.json`.
   Exécuter d’abord avec `"dryRun": true` ajouté au plan : le script rend ce qu’il
   ferait (primitive modifiée, ré-alias ou primitive créée) sans rien écrire. Montrer ce
   rapport, puis exécuter sans `dryRun`. Le script refuse un autre `fileKey`, ne
   modifie jamais une primitive partagée par une autre sémantique ni une taille
   nommée d’après sa valeur (`size/28`), et crée alors une primitive.
7. Relire : refaire l’étape 1, puis `npm run figma:plan` doit annoncer « Figma est
   déjà aligné ». Sinon, signaler l’écart sans relancer l’écriture à l’aveugle.

## Consigner

Mettre à jour les tables de `workspace/FIGMA_MAPPING.md` (primitives créées ou
modifiées, valeurs) et ajouter une entrée à `workspace/DECISIONS.md` : sens, variables,
preuve de relecture. Les bibliothèques se publient dans Figma par l’étudiante
(Assets → Publish), l’API ne le permet pas.

## Limites

- Seule la collection Semantics (18 variables, un mode) est synchronisée ; Primitives
  et Breakpoints restent dans Figma.
- Une variable Figma en trop est ignorée ; une variable manquante ou hors format
  bloque l’import (le format local exige les 18 clés).
- Consomme le quota Figma MCP et Claude de l’étudiante.
