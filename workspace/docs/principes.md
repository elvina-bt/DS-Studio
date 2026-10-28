---
title: Principes
section: fondations
order: 10
summary: Quatre principes qui tranchent les décisions de design quand on hésite.
status: stable
---

## 1. Lisible en plein soleil

L’écran est consulté au décollage, incliné, parfois avec des gants fins. On vise **7:1** pour les valeurs de vent, rafales et horaires, et jamais une information portée par la seule couleur.

## 2. L’incertitude se montre

Une prévision est une **plage** et une tendance, pas une certitude (maille d’environ 1,3 km, mises à jour horaires au mieux). On affiche une plage et un niveau de confiance.

:::do Plage et confiance
« Vent prévu 12–18 km/h · confiance moyenne »
:::

:::dont Valeur unique
« Vent : 15 km/h », qui laisse croire à une précision qui n’existe pas.
:::

## 3. Comparer, jamais juger

Un écart entre prévu et vécu est une **information**, pas une erreur ni un danger. Il reste neutre : badge, valeur signée, jamais `color.danger`.

## 4. Le jargon s’explique

On garde les vrais mots du vol libre (rafale, plafond, thermique) et on les explique au moment où ils apparaissent, plutôt que de les simplifier.
