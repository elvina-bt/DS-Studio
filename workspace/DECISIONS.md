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
- **Ajout** : composant centré dans le canvas ; un trait du sommaire par entrée
  (titre compris) ; la Documentation devient la vue par défaut (`/`), l’Atelier
  passe sur `#/` ; mention Figma retirée de l’en-tête. Bug vu en e2e : le lien
  d’évitement « Aller aux variables » changeait l’adresse et renvoyait vers la doc ;
  il déplace désormais le focus sans toucher à l’adresse. 52 tests, 14 e2e.
- **Ajout** : l’historique s’insérait dans la page (colonnes poussées vers le bas,
  sommaire superposé). Il devient un panneau flottant sous son bouton, fermé par
  Échap ou un clic à côté, identique dans les deux vues. Puis fenêtre modale centrée
  (`<dialog>` natif, fond assombri, focus rendu au bouton) ; « Annuler la révision »
  ferme l’historique pour laisser le diff seul. 52 tests, 14 e2e.
- **Ajout** : historique épuré (tokens d’abord, révision en gris, « Revoir » /
  « Annuler »). Canvas : le bouton de copie devient « ✓ Code copié » sur fond vert.
  Bug corrigé : les styles des outils du canvas restylaient aussi les boutons du DS
  dans l’aperçu (texte brut) ; contrôle e2e ajouté. 52 tests, 14 e2e.

## 2026-10-28 — Composants dans PFE – Components, reliés aux stories

- **Problème** : PFE – Components était vide ; impossible de relier une story à un
  composant Figma ni d’en poser une instance dans mes flows.
- **Décision** : 8 composants (21 variantes) créés par l’agent du terminal via le MCP
  Figma, après mon accord, fidèles au code et liés aux variables Semantics. Chaque
  story porte son nœud et sa clé (`figma` dans `app/shared/stories.ts`). Canvas :
  « Ouvrir dans Figma ». Plugin : « Insérer » pose une instance (seule écriture,
  sur clic, refusée en Dev Mode) et « Figma » ouvre le composant source.
- **Choix contraint** : police Inter, car SF Pro (police locale) donnait des textes
  de largeur nulle dans l’environnement de création.
- **Preuves** : captures Figma de chaque composant ; 53 tests unitaires (lien et clé
  sur chaque story, variantes renvoyées au plugin), 14 e2e (lien du canvas), macOS.
- **Limites** : plugin pas encore lancé dans Figma (insertion non testée en vrai) ;
  insertion depuis un autre fichier seulement après publication de la bibliothèque ;
  tailles dérivées fixées en dur, sans variable.

## 2026-10-29 — Onglet Composants et propriétés façon Figma

- **Problème** : les variantes étaient des pastilles au-dessus de l’aperçu, sans
  rapport avec la façon dont Figma présente un composant ; pas de vue dédiée.
- **Décision** : chaque composant décrit ses propriétés (variantes, textes,
  booléens) ; panneau Propriétés à droite du canvas, comme dans Figma. L’aperçu,
  le code, l’ID et le lien Figma suivent les valeurs. Les 22 variantes Figma ont une
  story (boutons désactivés, chaque type de ligne, chaque onglet actif) ; la Liste
  groupée devient un composant à part (ID `liste-groupee--reglages`, ancien
  `ligne-liste--liste`). Nouvel onglet **Composants** (liste à gauche, canvas en
  grand, lien vers la doc). Fond « Grille » par défaut, libellés « Fond » et
  « Largeur » visibles. « Modifier la page » devient un bouton.
- **Preuves** : 54 tests unitaires (dont ID selon les valeurs), 15 e2e (dont l’onglet
  Composants), macOS ; vérifié à 1440 px.
- **Limite** : modifier un composant dans Figma ne met pas DS-Studio à jour tout
  seul (voir la réponse sur la synchro) ; les tailles dérivées restent en dur.

## 2026-10-29 — Dépôt du design system : desys

- **Problème** : le DS (tokens, composants, doc, synchro Figma) vivait dans l’outil ;
  impossible de le livrer à des devs iOS et web, ni de le tenir iso Figma pour les
  trois bibliothèques.
- **Décision** : nouveau dépôt **desys** (`../desys`) : `tokens/tokens.json` (iso
  PFE – Tokens), `assets/` (6 icônes, iso PFE – Assets), composants React et SwiftUI,
  manifeste `components/components.json` (iso PFE – Components), 15 pages de doc ;
  générateur web (CSS, TS, icônes) et iOS (Swift Package : tokens, `.xcassets`,
  composants) ; synchro Figma par Claude Code (skill `figma-sync` du dépôt).
  DS-Studio ne garde que l’app desys : elle importe composants et stories du dépôt
  (alias `@desys`), y lit la doc et les tokens, propose l’écart en diff et y écrit
  chaque révision validée (sorties régénérées, commit par moi).
- **Écart à trancher** : Figma (`color.canvas` #F3F5FA, `font.heading` 28) ≠ atelier
  (#F2F2F7, 34). Le dépôt suit Figma ; l’atelier affiche l’écart, « Voir le diff ».
- **Preuves** : desys : 10 tests (sources, génération déterministe, synchro tokens /
  assets / composants), `npm run build` ; DS-Studio : 48 tests, 15 e2e, macOS.
- **Limites** : package Swift écrit mais **non compilé** (licence Xcode non acceptée
  sur ce Mac) ; PFE – Assets encore vide (icônes à y pousser après accord) ;
  `workspace/design-system.tokens.json` reste le jeu de test du starter.

## 2026-10-29 — Accueil de desys et fin de l’onglet Atelier

- **Décision** : écran d’accueil d’après ma maquette (PFE – Components, nœud 17:50) :
  question à Claude, éléments récents, tokens et composants ajoutés récemment, avec
  aperçus réels. Données réelles : révisions validées et pages de doc (modifié),
  premier commit dans le dépôt desys (ajouté). Navigation Accueil · Documentation ·
  Playground ; l’onglet Atelier disparaît (adresse `#/atelier` conservée pour le brief,
  le chat de propositions et les outils du starter). Les tokens se modifient depuis
  les tableaux de la doc, par le même diff validé. Palette chaude de la maquette pour
  l’app (les tokens du DS ne changent pas) ; police DotStudio appelée si installée.
- **Preuves** : 49 tests unitaires (dont l’accueil), 17 e2e (accueil, édition d’un
  token depuis la doc), macOS ; rendu comparé à la maquette à 1512 px.
- **Limites** : DotStudio non distribuée (licence inconnue) : police de repli sur un
  poste qui ne l’a pas ; dates « ajouté » limitées à l’historique git de desys.

## 2026-10-29 — Édition des pages de doc façon Notion

- **Problème** : modifier une page demandait d’écrire du Markdown brut à côté d’un
  aperçu, avec un formulaire de métadonnées lourd.
- **Décision** : la page s’édite telle qu’elle s’affiche. Chaque bloc montre son rendu
  et devient éditable au clic ; « / » ouvre le menu des blocs (texte, titres, listes,
  citation, À faire / À éviter / Note, composant, tokens, tableau, code, séparateur) ;
  la poignée ⋮⋮ glisse le bloc ou le transforme, duplique, déplace, supprime ;
  raccourcis `## `, `- `, `1. `, `> `, ⌘B, ⌘I, ⌘E, ⌘K. Titre et résumé s’écrivent
  en place, les métadonnées deviennent des propriétés discrètes. Le fichier reste du
  Markdown (`app/shared/blocks.ts`) et l’enregistrement passe toujours par le diff.
- **Preuves** : aller-retour blocs → Markdown sans aucune différence sur les 15 pages
  de desys ; 51 tests unitaires, 17 e2e (ajout d’une note par « / »).
- **Limites** : dans un bloc en cours d’édition, le gras et les liens restent écrits
  en `**` et `[ ](…)` ; ils sont rendus dès qu’on quitte le bloc.

## 2026-10-29 — Synchro Figma → desys par PR, composants modifiables via le chat

- **Problème** : desys devait suivre Figma sans manipulation, avec une doc à jour, et
  un composant devait pouvoir se modifier depuis le chat.
- **Décision** :
  - PFE – Components rangé : une page par composant, dans une section à son nom
    (essai à blanc, écriture approuvée, relecture : IDs et clés inchangés).
  - GitHub Action `figma-sync` dans desys, à 8 h, 12 h 30 et 19 h (heure d’hiver) ou à
    la demande : lecture par l’API REST (secret `FIGMA_TOKEN`), relevé
    `components/figma.json`, clés republiées, icônes, résumé des pages de doc repris
    des descriptions Figma, tokens si le plan donne accès aux variables (Enterprise) ;
    PR ouverte si quelque chose change, jamais fusionnée sans relecture.
  - Les tokens de chaque composant deviennent des données
    (`desys/components/bindings.json`). Le chat peut en proposer d’autres ; le
    serveur filtre (emplacement connu, type de token, `color.danger` réservé au
    bouton destructif) ; aperçu avant / après avec le vrai composant ; « Appliquer à
    desys » écrit et régénère web et iOS.
- **Preuves** : desys 15 tests (mapping REST hors réseau, validation des bindings) ;
  studio 52 tests unitaires (filtrage et écriture), 18 e2e (aperçu du chat).
- **Limites** : l’Action n’a pas tourné (secret et autorisation des PR à poser dans
  GitHub) ; variables Figma lisibles par l’API seulement en plan Enterprise ; SwiftUI
  non compilé ici (licence Xcode) ; le chat ne modifie pas encore le code des
  composants, seulement les tokens qu’ils utilisent.

## 2026-10-30 — Laboratoire : construire et modifier les composants avec le chat

- **Problème** : le chat répondait sur place ; impossible de voir le composant dont
  il parlait, ni d’en créer un nouveau.
- **Décision** :
  - L’onglet Aperçu devient **Laboratoire** (`#/laboratoire`, anciennes adresses
    acceptées). Un seul fil de chat pour l’accueil, la doc et le laboratoire.
  - Une réponse qui porte sur un composant l’ouvre dans le laboratoire (canvas,
    propriétés, code, chat à droite pour le modifier).
  - Un composant qui n’existe pas : le chat l’assemble à partir des composants de
    desys (données, jamais du code : `app/shared/lab.ts`), validé par le serveur,
    ouvert en brouillon ; « Ajouter à desys » écrit `desys/components/lab/<id>.json`,
    met à jour le manifeste et crée sa page de doc en brouillon.
  - Le panneau Design est retiré au profit du chat.
- **Preuves** : 54 tests unitaires (schéma, rendu, routes, id de desys refusé, page
  de doc créée une fois) ; 21 e2e (accueil → brouillon dans le laboratoire, question
  sur un composant existant) ; desys 15 tests.
- **Limites** : un composant du laboratoire n’existe pas encore en SwiftUI ni dans
  Figma (il figure dans le manifeste, section `lab`) ; il assemble les composants
  existants sans en créer de nouveaux visuellement.

## 2026-10-30 — Composants du laboratoire reportés dans Figma

- **Problème** : un composant créé dans le studio n’existait pas dans Figma ; desys
  n’était plus iso.
- **Options** : écriture automatique par le studio (impossible : l’API REST de
  Figma ne fait que lire, et aucune API ne publie une bibliothèque) ; report par
  Claude Code + MCP avec une validation (retenu).
- **Décision** : chaque composant du laboratoire porte son état Figma (à créer, à
  mettre à jour, à publier, iso), affiché dans le laboratoire. `push-lab.js`
  (desys) le reconstruit dans PFE – Components avec des instances des composants
  existants, après un essai à blanc validé ; `--record` enregistre nœud et clé ;
  la synchro GitHub détecte la publication.
- **Preuves** : essai à blanc réel dans Figma sur un « Résumé de vol » d’exemple :
  variantes trouvées, textes remplacés (un repris par position, car le badge de
  Figma et celui du code diffèrent) ; desys 17 tests, studio 55 tests.
- **Limites** : la publication reste un clic dans Figma ; le composant Figma reprend
  la variante par défaut (une seule, pas toutes les variantes du laboratoire).

## 2026-10-30 — Éditer la mise en page d’un composant via le chat

- **Problème** : le chat ne pouvait pas ajouter une marge haute à un composant du
  laboratoire : il n’assemblait que des composants, sans réglage d’espacement.
- **Décision** : brique `Stack` dans desys (web et SwiftUI) : direction, espacement,
  marges par côté, alignement, fond et rayon, exprimés en noms de tokens, jamais en
  pixels. Le chat l’utilise pour la mise en page ; le report Figma en fait un auto
  layout avec les valeurs des tokens.
- **Preuves** : desys 18 tests, studio 58 tests et 21 e2e ; dans le navigateur, une
  réponse simulée ajoute `paddingTop: space.lg` au brouillon « État vide » : 24 px
  mesurés.
- **Limites** : `DesysStack` non compilé ici (licence Xcode) ; l’auto layout Figma
  reçoit des valeurs, pas encore des variables liées.

## 2026-10-30 — Plugin Figma dédié : desys → Figma

- **Problème** : reporter un composant du laboratoire passait par une section du
  plugin DS-Studio Docs, outil de lecture de la doc ; le geste était caché.
- **Options** : garder la section dans DS-Studio Docs ; plugin publié (impossible
  sans studio en ligne : un plugin publié ne joint pas 127.0.0.1) ; plugin de
  développement dédié (retenu).
- **Décision** : `figma-plugin-desys/` ne fait que le report : liste à reporter,
  « Reporter dans Figma », lien renvoyé à desys, liste « à publier ». DS-Studio
  Docs redevient lecture et insertion. Dans le studio, le badge « À reporter dans
  Figma » ouvre les étapes et le fichier PFE – Components.
- **Preuves** : studio 59 tests et 21 e2e ; fenêtre du badge vue dans le navigateur.
- **Limites** : plugin jamais lancé dans Figma ici ; à importer une fois depuis son
  manifeste ; la publication de la bibliothèque reste un clic.

## 2026-10-30 — Un fichier JSON par composant dans desys

- **Problème** : tous les composants tenaient dans deux fichiers communs
  (`components/components.json`, généré, et `components/bindings.json`, source) :
  un changement sur un composant touchait le fichier de tous.
- **Décision** : `components/<id>.json` par composant. Champs source `swift` et
  `tokens` (modifiés par le studio via le chat) ; propriétés, variantes et liens
  Figma régénérés depuis `src/web/stories.ts`. Le laboratoire garde
  `components/lab/<id>.json`. Les dates « ajouté » du studio cherchent dans
  l’ancien manifeste puis dans le fichier du composant.
- **Preuves** : sorties web et iOS identiques (seul un commentaire de
  `Bindings.swift` change) ; desys 18 tests, studio 59 tests.
- **Limites** : les entrées plus haut citent encore les anciens fichiers, à lire
  comme historique.

## À compléter par l’étudiant

Date, problème, options explorées, décision, preuves et limite connue.
