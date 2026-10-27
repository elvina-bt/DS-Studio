# Journal de décisions du projet

## V1 — Starter

React permet d’employer exactement les mêmes composants dans le catalogue et
le viewport isolé. Le backend HTTP Node utilise la bibliothèque standard ; Zod
valide les entrées et les fichiers. Vite compile le frontend. Pas d’Electron,
base distante, Figma ou LLM obligatoire.

Codex propose du JSON sans outils ; le contrôleur est l’unique auteur des changements
locaux validés. Claude et Gemini ne sont pas activés sans qualification.

## 2026-10-27 — Liaison Figma et brief privé

- **Problème** : bibliothèque Figma Tokens vide ; brief privé limité à un seul lien
  Figma et sans lien avec `workspace/PFE.md`.
- **Décision** : les 18 tokens DS-Studio deviennent la collection Semantics de
  PFE – Tokens, aliasée vers des Primitives (valeurs Lisière en attendant la palette
  du projet). Contrat dans `workspace/FIGMA_MAPPING.md`. Le brief accepte jusqu’à
  8 liens Figma nommés (ancien lien unique migré) et se préremplit depuis `PFE.md`,
  sans écriture avant validation.
- **Preuves** : `npm run check`, `npm test` (31 tests) et parcours de préremplissage
  vérifié dans le navigateur, macOS. Variables Figma : nombres confirmés (16/18/4),
  valeurs non relues une à une. `npm run test:e2e` non lancé.
- **Limite** : la synchronisation reste manuelle ; le préremplissage repose sur les
  titres de section de `PFE.md` (« public », « objectif / prouver / apprendre »).

## 2026-10-27 — Chat Claude Code dans DS-Studio

- **Problème** : le chat embarqué ne proposait que Codex ; je travaille avec Claude.
- **Décision** : adaptateur Claude Code sur le modèle de Codex, propositions seules,
  aucun outil, MCP ni réglage chargé, refus de toute réponse qui annonce ou appelle
  un outil. Détails et limites : `docs/AGENT_ADAPTERS.md`.
- **Preuves** : 35 tests (faux CLI, outils refusés, non-connexion), essais réels sous
  macOS avec Claude Code 2.1.311 : réponse simple puis proposition en diff, révision
  inchangée sans validation.
- **Limite** : consomme mon quota Claude ; Windows et Linux non testés ; le chat ne
  modifie que des tokens, pas le code ni Figma.

## À compléter par l’étudiant

Date, problème, options explorées, décision, preuves et limite connue.
