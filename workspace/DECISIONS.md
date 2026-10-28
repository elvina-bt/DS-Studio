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

## 2026-10-27 — Panneau Variables façon Figma

- **Problème** : pour parcourir les tokens, il fallait passer par une liste
  déroulante, loin de mon usage du panneau de variables de Figma.
- **Décision** : le panneau gauche s’ouvre sur un onglet **Variables** (l’assistant
  et le brief passent dans l’onglet **Assistant**, conservés sans rechargement).
  Collections (Semantics éditable ; Primitives et Breakpoints signalées « Figma »),
  groupes, recherche et tableau Nom / Valeur. Une valeur éditée sur place partage
  le brouillon de l’éditeur central et ouvre le même diff : rien n’est écrit avant
  validation.
- **Preuves** : 12 tests e2e (dont un nouveau : groupes, recherche, édition, diff
  refusé, révision inchangée) et 38 tests unitaires, macOS ; rendu vérifié à 1440 px.
- **Limite** : les nombres Primitives (16) et Breakpoints (4) sont écrits en dur,
  d’après la relecture Figma du jour ; ils ne se mettent pas à jour seuls.

## 2026-10-27 — Disposition : Variables, Design System, Assistant

- **Décision** : trois colonnes sans lettres A/B/C. À gauche **Variables** ; au
  centre **Design System** avec onglets **Composants** (par défaut) et **Aperçu** ;
  à droite **Assistant** (brief et chat), collé en haut de l’écran sur grand écran.
  Mode par défaut : Claude Code (expérimental).
- **Correctif** : une requête refusée en 413 ferme la connexion
  (`Connection: close`). Avant, la requête suivante pouvait échouer (« fetch failed »,
  environ une fois sur deux en test).
- **Preuves** : 12 tests e2e, 38 tests unitaires (test HTTP 8/8 lancements),
  rendu vérifié à 1440 px, macOS.
- **Limite** : le mode Claude par défaut interroge le CLI au chargement ; sans
  Claude Code installé, l’assistant l’indique et le mode Manuel reste disponible.

## 2026-10-27 — Composants partagés entre catalogue et app

- **Problème** : l’onglet Composants montrait le catalogue Lisière, alors que mon
  app parapente avait ses propres éléments. Je validais des composants que l’app
  n’utilisait pas.
- **Décision** : `app/client/ParapenteDS.tsx` est la seule implémentation de
  bouton, titre, en-tête de section, champ de recherche, carte de prévision,
  badge, ligne de liste (et interrupteur) et barre d’onglets. L’onglet Composants,
  l’app de l’Aperçu et la revue du diff les importent. Lisière reste dans l’Aperçu
  comme exemple ; son ancien catalogue est retiré.
- **Preuves** : 12 tests e2e (dont la présence des 7 sections du catalogue et la
  couleur de marque identique catalogue / app) et 38 tests unitaires, macOS ; revue
  du diff vérifiée sur `color.brand` (6 composants touchés), sans écriture.
- **Limite** : le tableau prévu / vécu, les statistiques et le formulaire de
  débrief restent propres à l’app ; à extraire s’ils entrent dans la bibliothèque
  Figma PFE – Components.

## 2026-10-27 — Un seul éditeur de tokens : le panneau Variables

- **Problème** : l’éditeur de l’onglet Composants doublait le panneau Variables.
- **Décision** : éditeur retiré ; l’onglet Composants ne montre que le catalogue.
  Le panneau Variables reprend le contraste marque / texte sur marque, le contraste
  proposé, l’état du brouillon (récupéré après recharge) et « Abandonner le
  brouillon ». Le lien d’évitement mène aux variables.
- **Preuves** : 12 tests e2e adaptés (sélection par variable plutôt que par liste
  déroulante) et 38 tests unitaires, macOS ; parcours vérifié à 1440 px.

## 2026-10-27 — Synchro Figma via Claude Code

- **Problème** : « Figma non connecté » et aucune façon reproductible d’aligner
  PFE – Tokens et l’atelier. L’API REST des variables est réservée au plan
  Enterprise ; DS-Studio n’est pas un client MCP autorisé par Figma.
- **Décision** : synchro **manuelle** portée par l’agent du terminal, skill
  `.agents/skills/figma-sync` : relevé en lecture seule (`read.js`), conversion
  testée (`app/shared/figma.ts`, `npm run figma:import` / `figma:plan`), import par
  le diff de l’atelier, report vers Figma (`apply.js`) après accord, simulation
  (`dryRun`) puis relecture. Règle d’alias : jamais de primitive partagée ni de
  `size/<n>` modifiée. En-tête : « Figma : synchro manuelle via Claude Code » ;
  l’application reste non connectée.
- **Preuves** : 3 tests de conversion (41 tests au total), 12 tests e2e, macOS.
  Essai réel sur PFE – Tokens : relevé des 18 variables, import et plan cohérents
  (2 écarts : `color.canvas` #F2F2F7 / #F3F5FA, `font.heading` 34 / 28), simulation
  sans écriture. La simulation a révélé un nom trompeur (`size/28` = 34), corrigé.
- **Limite** : écriture réelle dans Figma pas encore exécutée ; publication des
  bibliothèques par l’étudiante dans Figma ; consomme le quota Figma MCP et Claude.

## 2026-10-28 — Documentation du DS façon zeroheight

- **Problème** : fondations, ton, tokens et composants n’étaient documentés nulle
  part ; je voulais tout centraliser moi-même, sans dépendre d’un outil payant.
- **Options** : outil SaaS (zeroheight, Supernova) ; doc dans l’état privé de
  l’app ; fichiers Markdown versionnés. **Choix : Markdown** dans `workspace/docs/`,
  édité dans DS-Studio, lisible sur GitHub, par Claude et par le plugin.
- **Décision** : vue **Documentation** (accueil, fondations, tone of voice, tokens,
  composants, ressources), éditeur avec aperçu et blocs (À faire, À éviter, Note,
  composant vivant, tableau de tokens), diff à valider avant écriture, contrôle de
  conflit. 15 pages de départ tirées du PFE et de `DESIGN_RULES.md`. Plugin Figma
  **DS-Studio Docs** (lecture seule) : page du composant sélectionné et variables
  liées, via `/plugin/lookup` (origine `null`, `localhost` accepté pour ce seul
  usage, pré-vérification Private Network Access).
- **Preuves** : 46 tests unitaires (dont 5 pour la doc : en-tête, Markdown, HTML
  échappé, liens dangereux refusés, conflit, lien symbolique, CSRF, plugin), 13 tests
  e2e (dont lecture → édition → diff → enregistrement sur une copie temporaire),
  macOS. Interface du plugin vérifiée dans un navigateur avec une vraie réponse du
  serveur. Deux bugs trouvés et corrigés en cours de route : bloc « dont » lu comme
  « do », éditeur qui plantait sur un brouillon.
- **Limites** : plugin **pas encore lancé dans Figma** ; PFE – Components ne
  contient encore aucun composant, donc les noms Figma des pages sont des
  propositions ; Markdown volontairement restreint (pas d’images ni de HTML).
- **Ajout** : style épuré inspiré de ma doc zeroheight N’PY et de Notion : page
  blanche, colonne de lecture centrée, grand titre et chapeau, navigation grise
  discrète. Retirés : badges de statut, étiquettes Figma, chemin du fichier, légendes
  des aperçus, aide de l’éditeur, barre export / import dans la doc. 13 tests e2e.
- **Ajout** : sommaire de page à droite (un trait par intertitre, section lue en
  foncé, liste des titres au survol ou au clavier), masqué sous 1180 px. Section
  cliquée gardée active même si la page est trop courte pour la remonter (bug vu
  en e2e). 47 tests unitaires, 13 e2e.

## 2026-10-28 — Demander au DS

- **Problème** : pour retrouver une règle, il fallait parcourir les pages.
- **Décision** : panneau **Demander** dans la doc : Claude Code répond à partir des
  pages, des tokens validés et de `DESIGN_RULES.md`, et cite ses pages (cliquables).
  Lecture seule : schéma de réponse sans changement, aucun outil, révision inchangée.
- **Preuves** : 49 tests unitaires (faux CLI, route HTTP), 14 e2e (réponse simulée,
  aucun quota), un essai réel sous macOS : réponse juste sur l’écart neutre, trois
  pages citées.
- **Limite** : consomme mon quota Claude ; toute la doc part à chaque question
  (assez petite aujourd’hui) ; conversation perdue au rechargement.
- **Ajout** : panneau toujours ouvert, style claude.ai (Arial, titres non gras, bulles
  crème, envoi rond). Doc en plein écran (`100svh`) : navigation, page et chat
  défilent chacun de leur côté ; sous 1100 px, la page défile en entier. En-tête
  identique dans les deux vues (sélecteur centré) ; pied de page retiré. Bug vu en
  e2e : la carte du sommaire restait ouverte après un clic (focus), ouverte
  désormais au survol ou au focus clavier seulement. 49 tests, 14 e2e.
- **Ajout** : liens des réponses bien visibles, et liens vers une section précise
  (`doc:slug#section-…`) : Claude reçoit les intertitres de chaque page ; un clic
  ouvre la page puis défile jusqu’à la section. Police Arial dans toute l’interface
  (les composants du DS gardent le token `font.family`). 50 tests, 14 e2e.

## 2026-10-28 — Stories de composants façon Storybook

- **Problème** : l’aperçu de la doc montrait les composants, sans variantes ni code
  à reprendre, et sans moyen de désigner une variante précise.
- **Options** : installer Storybook (second outil, dépendances, composants à
  re-déclarer) ; stories intégrées à la doc. **Choix : intégrées.**
- **Décision** : `app/shared/stories.ts` décrit chaque variante en données, avec un
  ID stable (`bouton--secondaire`) ; l’aperçu et le JSX affiché sortent des mêmes
  props. Canvas : variantes, Aperçu / Code, fond, largeur (320, 375, 430 px), zoom ;
  copie de l’ID, du lien (`#/docs/page?story=id`) et du code. Lecture et copie
  seulement.
- **Preuves** : 52 tests unitaires (ID uniques, chaque bloc composant couvert, JSX
  attendu), 14 e2e (variante, code, lien direct), macOS ; copie vérifiée par un vrai
  clic.
- **Limites** : pas encore de contrôles pour modifier les props en direct ; seul écart
  d’affichage, la barre d’onglets est posée dans la page au lieu d’être fixée en bas ;
  renommer un ID casse les liens existants.

## À compléter par l’étudiant

Date, problème, options explorées, décision, preuves et limite connue.
