# Mon projet de fin d’études

**Application iPhone pour pilotes de parapente fraîchement formés** (PFE UX/UI 2026-27, M2 ECV).

Ne placez ici aucun secret ni donnée sensible. Ce fichier est envoyé au fournisseur
IA uniquement lorsque vous utilisez le chat Codex dans l’application.

## En une phrase

Aider les pilotes fraîchement formés à comparer ce que la prévision annonçait à ce
qu’ils ont réellement vécu, pour mieux interpréter les prochaines prévisions au
moment de passer à l’autonomie.

## Problème et publics

- **Problématique** : comment aider un pilote fraîchement formé à comparer prévu et
  vécu en vol, pour mieux lire les prochaines prévisions et progresser en sécurité ?
- **Cible principale** : le pilote fraîchement formé, sur iPhone, qui prépare des
  sorties de plus en plus autonomes.
- **Partie prenante** : le moniteur, qui guide la lecture météo et peut consulter
  ou annoter les débriefs.
- **Écarté en V1** : le pilote de cross.
- **Garde-fou** : jamais de verdict « vole / ne vole pas ». L’app explique et compare,
  la décision reste au pilote.

## Parcours à soutenir

1. **Préparer une sortie** : choisir site et créneau, lire une synthèse de la
   prévision avec aides à la lecture et glossaire (jargon expliqué, pas supprimé).
2. **Débriefer un vol** : saisir le vent vécu (ressenti ou valeur de balise), puis
   comparer prévu / réel en une vue, sans verdict.
3. **Progresser** : historique des écarts par site, « ce que j’ai appris ».

Arborescence provisoire : 4 onglets — Préparer, Débriefer, Progresser, Profil.

## Contraintes du terrain pour le Design System

- **Mobile d’abord** (iPhone), site vitrine en second support : breakpoints à prévoir.
- **Lisibilité en plein soleil** : contrastes renforcés, tailles de texte généreuses,
  pas d’information portée par la seule couleur.
- **Incertitude visible** : les prévisions sont des plages et des tendances (maille
  ~1,3 km, mises à jour horaires au mieux). Le DS doit savoir afficher une plage,
  un écart et un niveau de confiance, sans ton alarmiste ni code « danger » pour un
  simple écart.
- **Accessibilité** : focus, libellés explicites, Dynamic Type à anticiper.
- **Données personnelles** (RGPD) : localisation, historique et niveau du pilote.
  Exemples du catalogue fictifs uniquement.

## Figma : bibliothèques sources de vérité

| Bibliothèque | Contenu | Lien |
| ------------ | ------- | ---- |
| PFE – Tokens | Collections primitives, semantics, breakpoints | https://www.figma.com/design/90pqKBxgw5j3rUlfZmCM0J/PFE---Tokens |
| PFE – Assets | Icônes, illustrations | https://www.figma.com/design/XTTp2t19IZhVUnxbvomcNp/PFE---Assets |
| PFE – Components | Composants (utilisent Tokens et Assets) | https://www.figma.com/design/dRoA2PB74Ne8TWXz5Cafin/PFE---Components |

Les tokens **sémantiques** de Figma sont ceux à rapprocher des tokens de DS-Studio.
Les primitives restent dans Figma. Le rapprochement est manuel (export, conversion,
import JSON, diff validé) : aucune synchronisation automatique n’est annoncée.

## Ce que je veux apprendre ou prouver

- Que les tokens sémantiques de ma bibliothèque Figma pilotent réellement les
  composants codés, du catalogue à l’écran mobile.
- Que les composants clés de mes deux parcours (préparer, débriefer) tiennent à
  320 px et restent lisibles et accessibles.
- Garder une trace des écarts Figma / code et des décisions dans `DECISIONS.md`.

Échéances liées : **Design System le 12 mars**, tests utilisateurs le 26 mars.
