---
title: Carte de prévision
section: composants
order: 40
summary: Synthèse d’une prévision : plage de vent, rafales, plafond et confiance.
status: brouillon
figma: Carte de prévision, Forecast card
---

## Aperçu

{{composant:carte-prevision}}

## Usage

:::do Plage et confiance
Toujours une plage (« 12–18 km/h ») et un badge de confiance.
:::

:::dont Verdict
Pas de « favorable / défavorable », pas de couleur rouge ou verte sur la carte.
:::

## Code

Composant partagé : `app/client/ParapenteDS.tsx`, utilisé par l’onglet Composants et l’app de l’Aperçu.
