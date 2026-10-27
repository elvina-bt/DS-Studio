# Adaptateurs d’agents

## Contrat commun

`connectors/agents/types.ts` définit `status()` et `reply(message, context, signal)`.
Entrée : tokens structurés, contexte PFE, règles et dix messages précédents maximum.
Sortie : `{message, changes:[{key,value}]}` validée par Zod. L’adaptateur ne reçoit
pas de Store et ne peut pas accepter une proposition. Le contrôleur HTTP prépare
le diff avec la révision de départ ; l’UI décide de sa validation humaine.

Les conversations de fournisseurs ne sont pas reprises ni mélangées. Le chat embarqué
est en mémoire dans le navigateur ; après recharge l’historique affiché est vide.
Les refus, délais et interruptions n’entraînent aucun renvoi automatique ni commit.
Pas d’orchestration parallèle de plusieurs agents dans la V2 : architecture multi-fournisseurs,
un fournisseur intégré et qualifié, deux points d’extension indisponibles.

## Codex — TESTED sous Linux avec 0.164.0

Le CLI officiel fournit `exec --json`, `--ephemeral` et `--ignore-user-config`.
Ce dernier ignore la configuration globale mais conserve la gestion officielle de
l’authentification. Référence : [official OpenAI documentation — CLI](https://learn.chatgpt.com/docs/cli/reference).
L’activation des outils shell est une option documentée ; le profil du starter la
désactive ainsi que les plugins, apps, MCP et la recherche web.
[Configuration officielle](https://learn.chatgpt.com/docs/config-file/config-reference).

Le processus n’est pas lancé dans le dépôt : un dossier temporaire vide évite de
charger la configuration du projet. Pas de shell interpolé : arguments en liste,
prompt via stdin. Authentification par `codex login`, effectuée par l’utilisateur.
Le starter ne déduit pas la validité d’une session de l’existence d’un fichier.
La disponibilité initiale signifie seulement binaire/version détectés ; le compte,
le réseau et le quota sont réellement sollicités à l’envoi. Délai maximum 120 s.

Choix : `exec` plutôt qu’app-server réduit les RPC, sessions et approbations à
maintenir pour ce profil à propositions seules. Le flux manuel reste indépendant.
Le protocole et la version ont été exécutés, pas seulement décrits. Pour changer
la version acceptée, refaire le smoke test, le test hostile, le refus sans auth,
la proposition/validation via API et les essais sur chaque OS cible.

## Claude Code — TESTED sous macOS avec 2.1.311 (expérimental)

`connectors/agents/claude.ts`. Même contrat que Codex : propositions seules,
diff puis validation humaine. Profil `claude -p` en `stream-json` :
`--tools ""` (aucun outil), `--strict-mcp-config` avec une liste MCP vide,
`--setting-sources ""` (ni réglages utilisateur ni projet), `--disable-slash-commands`,
`--no-session-persistence`, `--permission-mode dontAsk` et `--json-schema` pour la
réponse. Le seul outil exposé par le CLI est `StructuredOutput`, interne, qui rend le
JSON. Tout autre outil annoncé à l’initialisation ou appelé fait refuser la réponse.
Pas de `--bare` : il désactive la lecture du trousseau et donc la connexion par
abonnement. Jamais `--dangerously-skip-permissions` ni `bypassPermissions`.

Processus lancé dans un dossier temporaire vide, environnement réduit, prompt via
stdin. Authentification par `claude` puis `/login`, effectuée par l’utilisateur.
Le binaire est cherché dans le PATH puis dans `~/.local/bin/claude` (installateur
officiel), sans lire les profils shell. Majeure 2 acceptée, le CLI se mettant à jour
seul ; une autre majeure est refusée jusqu’à qualification.

Preuves (macOS, 2.1.311) : tests unitaires avec un faux CLI (dossier vide, contexte
par stdin, variable d’environnement non transmise, version non qualifiée refusée),
outils annoncés ou appelés refusés, non-connexion normalisée, réponse incomplète
refusée ; essai réel non connecté (« Not logged in » normalisé), puis connecté :
réponse simple et proposition `color.border` renvoyée en diff sans changer la
révision. Non testé : Windows, Linux, épuisement du quota.

Captures : jusqu’à 3 images PNG, JPEG, GIF ou WebP de 2 Mo maximum, jointes ou
collées dans le chat. Le serveur vérifie la signature binaire du type annoncé et
limite le corps de `/api/agent` à 8,5 Mo (128 Ko pour les autres routes). Elles
partent en blocs `image` d’un message `stream-json` (`--input-format stream-json`),
jamais recopiées dans le contexte texte, et ne sont ni stockées ni gardées dans
l’historique. Codex les refuse explicitement. Testé réellement sous macOS : image
décrite correctement, aucun token modifié.

## Gemini CLI — NOT IMPLEMENTED

Point d’extension : `unvalidatedAdapter('gemini')`. La [référence headless officielle](https://geminicli.com/docs/cli/headless/)
présente JSON/stream-json. L’authentification et les callbacks de permissions restent
à éprouver dans un vrai processus embarqué. Ne pas utiliser de mode yolo ou
supposer qu’un login étudiant permet un usage gratuit sans quota. Même série de
tests que Claude avant d’exposer un bouton actif.
