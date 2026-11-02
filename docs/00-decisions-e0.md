# E0-1 : décisions de cadrage

Validé le 2 novembre 2026. Ce document tranche les « Points encore ouverts » de la Logique du jeu v2. En cas de contradiction avec une autre partie du GDoc, **c'est ce document qui fait foi**.

## Décisions

| # | Point ouvert | Décision |
|---|---|---|
| 1 | Type de carte | **Prédéfinie** : grille iso de 16 × 12 cases (`src/data/map.json`). La génération procédurale est hors périmètre. |
| 2 | Échelle de temps | **1 tick = 1 mois de jeu**, 1 tick par seconde en vitesse ×1 (vitesses ×2 et ×5 disponibles). La phase 1 dure environ 15 ans de jeu (3 min), et une partie complète 5 à 10 min à ×1. |
| 3 | Centrale | Un seul réacteur fictif, le **Réacteur Hélios** : production fixe, coût en terres rares, **12 mois de chantier**. Aucun impact sur la confiance. |
| 4 | Priorité ville / datacenters | **Bouton à deux positions** (« Habitants d'abord » / « IA d'abord »). Le curseur passe en Could. |
| 5 | Défaites | Trois défaites, chacune avec son écran « Et dans le monde réel ? » : **panne** (ville alimentée à moins de 50 % pendant 6 mois), **ressources** (plus assez de terres rares pour un datacenter et IA disponible à moins de 50 % pendant 12 mois), **confiance** (0 %). Une défaite en phase 2 affiche la fiche « surconsommation ». |
| 6 | Victoire | **Pas de vraie victoire** (cf. pitch). La planète est **stabilisée** si, en phase 2, la disponibilité reste ≥ 95 %, la confiance ≥ 50 % et la croissance de la demande ≤ 2 %/an pendant 5 ans. Avec tous les secrets trouvés en plus, le jeu affiche « Vous avez compris les enjeux », puis la planète reste ouverte. |
| 7 | Usages inutiles | Chaque catégorie d'usage (reprise de Compar:IA) porte une part de la surconsommation. Les catégories **non essentielles** peuvent être limitées **en phase 2 uniquement**. Limiter abaisse le plafond de surconsommation, donc la demande arrête de monter plus tôt et redescend si elle était au-dessus. Limiter coûte un peu de confiance, une seule fois. |
| 8 | Perte de confiance | Par mois : `−k_IA × (1 − disponibilité) × poids_demande − k_ville × (1 − ratio_ville)`, avec `poids_demande = demande / demande_référence` borné entre 0,2 et 3. Elle remonte de +0,5/mois quand tout va bien. Sacrifier l'IA coûte donc peu en début de partie et cher à la fin. |
| 9 | Annonce de la phase 2 | **Événement plein écran** avec un message, puis la jauge d'intensité qui passe au-dessus de 100 %. Le moteur émet l'événement `phase2Started`. |

## Retiré du MVP

Ces éléments apparaissent dans le GDoc mais ne font **pas** partie du jeu livré le 3 décembre :

- la jauge **Impact / CO₂** et le mix électrique par région (fiche rôle 1, partie données) ;
- les **cartes-requêtes** et les **événements aléatoires** (canicule, etc.), qui passent en Could ;
- les onglets **Finances, Contrats, R&D** de la maquette ;
- la carte procédurale et le curseur de priorité.

## Corrections à reporter dans le GDoc

- Retirer toute mention de l'ancien nom, de l'ancien dépôt et de l'ancien déploiement Vercel.
- Maquette : retirer « 1 prompt IA = 2,9 Wh » (chiffre ancien et discuté, que notre propre partie open data déconseille).
- Backlog : les ID étaient en double (E1-2, E2-2, E3-2). Version corrigée dans `docs/backlog.md`.
- Vérifier qui a accès au projet Google Stitch de la maquette. Si c'est l'ancien membre seul, il ne reste que la capture.

## Encore à trancher (non bloquant)

- **Nom du jeu.** « Planète IA » est un nom provisoire. Pistes : *Surchauffe*, *Prompt Planète*, *Datapolis*, *Plein Régime*.
- **Valeurs de calibration** : toutes les valeurs de `game-params.json` sont provisoires (statut `placeholder` dans `traceability.json`). R3 les remplace par des valeurs sourcées ; les tests d'équilibrage disent si le jeu reste jouable.
