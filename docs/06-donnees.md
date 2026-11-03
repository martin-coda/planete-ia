# E3 : données, hypothèses et limites

Le fonctionnement du pipeline est décrit dans [`data/README.md`](../data/README.md). Cette page rassemble ce qu'il faut savoir pour **présenter et défendre les données devant le jury**.

## Le principe

On garde les **proportions du monde réel**, pas les volumes. La planète a 100 000 habitants (≈ 1/690 de la France), mais :

- un habitant y consomme autant d'électricité qu'un Français (RTE, Insee) ;
- le réseau perd la même part d'énergie qu'en France (RTE, Enedis) ;
- l'IA s'y diffuse au même rythme qu'en France (Baromètre du numérique), ce qui donne **1 mois de jeu = 1 mois réel** en phase 1 ;
- la demande des datacenters peut grimper autant que le prévoit l'AIE d'ici 2030 ;
- le stock de terres rares dure aussi longtemps que les réserves mondiales au rythme actuel (USGS) ;
- la confiance de départ correspond aux Français non méfiants (Baromètre du numérique) ;
- les usages de la phase 2 reprennent les thèmes réels des conversations Compar:IA.

## Résultat sur l'équilibrage

Avec les vraies valeurs, les joueurs automatiques de `balance.test.ts` racontent toujours la même histoire :

| Stratégie | Résultat |
|---|---|
| Ne rien faire | Défaite (confiance) vers l'an 7,5 |
| Construire sans limiter les usages | Défaite (confiance) en phase 2, vers l'an 38 |
| Construire **et** limiter les usages inutiles | Phase 2 en l'an 16,4, planète stabilisée en l'an 29,5 (≈ 6 min à ×1) |

## Hypothèses (choix assumés)

1. **Usages non essentiels.** Le classement des thèmes Compar:IA en « essentiels » (apprendre, sciences, travail, santé, société) et « non essentiels » (loisirs, création artistique, vie quotidienne, sans sujet précis) est un choix pédagogique. Il est fait pour être **discuté en classe**.
2. **Origine de la surconsommation.** En phase 2, on suppose qu'un usage non essentiel pèse 7 fois plus dans la surconsommation qu'un usage essentiel. Les données ne mesurent pas cela ; sans cette hypothèse, limiter les usages ne changerait presque rien (ils ne représentent que 25 % des conversations).
3. **Datacenters, réacteur, confiance.** Coûts, capacités et formule de confiance sont des choix de conception (`data/scripts/design.json`), réglés pour que les décisions du joueur comptent.

## Limites

- **Une seule source d'énergie** (le Réacteur Hélios) : le vrai mix électrique est plus varié, et le CO₂ n'est pas modélisé (retiré du MVP).
- **« Terres rares »** est un raccourci : les serveurs dépendent surtout d'autres métaux critiques (gallium, germanium, cuivre, cobalt…).
- **Compar:IA n'est pas toute l'IA** : texte seulement (pas de génération d'images ni de vidéos), et un public volontaire qui vient comparer des modèles.
- **L'énergie d'une conversation est une estimation** (méthode EcoLogits) : on la donne en fourchette (0,03 à 7 Wh, médiane 0,4 Wh), jamais en chiffre unique.
- **Années des données** : 2024 (énergie, terres rares), 2023-2025 (Baromètre), octobre 2024 à mai 2026 (Compar:IA), 2025 (AIE).
- **Chiffres à confirmer** : quelques chiffres viennent de sources secondaires. Ils sont listés dans `data/README.md` et marqués `verified: false` dans `data/raw/figures.json`.

## Licences

| Source | Licence |
|---|---|
| Compar:IA | Licence Ouverte 2.0 (Etalab) |
| Insee | Licence Ouverte |
| USGS | Domaine public |
| RTE, Enedis | Chiffres cités depuis leurs publications (données RTE détaillées sous Licence Ouverte sur ODRÉ) |
| Baromètre du numérique | Chiffres cités depuis le communiqué Arcep ; licence des données détaillées à confirmer |
| AIE | Chiffres cités avec attribution ; le produit de données « Energy and AI » n'est pas sous licence ouverte, on n'en redistribue rien |
