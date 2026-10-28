---
title: Bouton
section: composants
order: 10
summary: Déclenche une action. Un seul bouton principal par écran.
status: brouillon
figma: Bouton, Button
---

## Aperçu

{{composant:bouton}}

## Usage

:::do Une action principale
Un seul bouton principal par écran, avec un verbe : « Nouvelle sortie », « Enregistrer le débrief ».
:::

:::dont Danger pour un écart
La variante destructive sert à supprimer un vol, jamais à signaler un écart ou une météo.
:::

## Code

Composant partagé : `app/client/ParapenteDS.tsx`, utilisé par l’onglet Composants et l’app de l’Aperçu.
