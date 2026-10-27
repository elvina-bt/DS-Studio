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
- **Ajout** : captures d’écran dans le chat Claude (3 max, 2 Mo, type vérifié),
  pour montrer un écran Figma ou un rendu. Envoyées au fournisseur, jamais stockées.
  38 tests ; essai réel réussi.

## 2026-10-27 — Aperçu : mon app parapente

- **Décision** : l’aperçu responsive affiche par défaut mon app (4 onglets :
  Préparer, Débriefer, Progresser, Profil), structure iOS inspirée des apps de vol
  libre existantes, sans reprendre leur marque. Lisière reste sélectionnable.
  Le diff montre un aperçu visuel avant/après de chaque token.
- **Garde-fou** : l’écart prévu / vécu est neutre (badge), jamais `color.danger`.
- **Preuves** : 38 tests, rendu vérifié à 375 px. Tests e2e adaptés mais non
  lancés (Chromium de test non installé).

## 2026-10-27 — Conformité aux consignes du starter

- **Problème** : écarts relevés face au README : règles de conception génériques,
  CLAUDE.md et AGENTS.md périmés sur Claude, variables Figma non relues, e2e non lancés.
- **Décision** : `DESIGN_RULES.md` adapté au terrain (soleil, plages, écart neutre,
  pas de verdict) ; instructions d’agents alignées sur l’adaptateur Claude réel.
- **Preuves** : 38 variables Figma relues, conformes à `FIGMA_MAPPING.md` ; deux
  écarts DS-Studio → Figma relevés (`color.canvas`, `font.heading`), non corrigés.
  `npm run scan` : 0 alerte (avec le git de GitHub Desktop). `npm run test:e2e` :
  11/11 sous macOS (Chromium Playwright), après correction de deux tests e2e
  (choix d’app non conservé au rechargement ; couleur de marque laissée par un
  test précédent). `npm run check` et `npm test` (38) passent.

## À compléter par l’étudiant

Date, problème, options explorées, décision, preuves et limite connue.
