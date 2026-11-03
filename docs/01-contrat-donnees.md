# E0-2 : contrat de données JSON

Le moteur (R1) et le pipeline de données (R3) communiquent **uniquement** par les fichiers JSON de `src/data/`. Les schémas sont écrits en TypeScript avec zod dans `src/engine/schema.ts`. **Ce fichier est la référence** : en cas de doute, c'est lui qui fait foi, pas cette page.

## Les fichiers

| Fichier | Producteur | Consommateur | Contenu |
|---|---|---|---|
| `game-params.json` | R3 (valeurs) et R1 (équilibrage) | Moteur | Tous les paramètres numériques du jeu |
| `map.json` | R1 / R2 | Moteur et scène 3D | Carte prédéfinie et position des easter eggs |
| `usageCategories` (dans `game-params.json`) | R3 | Moteur et HUD | Catégories d'usage Compar:IA, essentielles ou non, leur part réelle (`realShare`) et leur part de la surconsommation (`shareOfExtra`) |
| `facts.json` | R3 | UI | Fiches « Et dans le monde réel ? » et fiches secrètes (textes de 300 caractères max, niveau 4e/2nde) |
| `sources.json` | R3 | UI (crédits, infobulles) | Sources : titre, éditeur, URL, licence, année |
| `traceability.json` | R3 | Rendu jury | Tableau de traçabilité : paramètre → donnée réelle → source → transformation → statut |

Les données brutes et le script qui les transforme vont dans `data/raw/` et `data/scripts/`. Le script (`npm run data:build`) **écrit** `game-params.json`, `sources.json` et `traceability.json` dans `src/data/` : ces trois fichiers ne se modifient plus à la main. Il est reproductible, et la CI le vérifie. Voir `data/README.md`.

## Unités

| Grandeur | Unité | Champ |
|---|---|---|
| Demande et puissance de calcul | PFLOP/s | `demand.computePerUserPflops`, `datacenter.computePflops` |
| Énergie | MW | `datacenter.powerMw`, `powerPlant.productionMw`, `city.powerMw` |
| Terres rares (stock et coûts) | t | `rareEarth.initialStockT`, `*.costRareEarthT` |
| Prélèvement de la ville | t/an | `city.rareEarthTPerYear` |
| Taux, ratios, adoption | 0 à 1 | `grid.baseLossRate`, `demand.adoption.initial`… |
| Confiance | 0 à 100 | `trust.*` |
| Durées | mois (entier) | `*.buildMonths`, `end.*Months` |

## Règles

1. **Valider avant de pousser** : `npm test` vérifie tous les JSON (`data.test.ts`). La CI refuse une PR qui casse le contrat.
2. **Chaque fiche et chaque ligne de traçabilité cite un `sourceId` existant** dans `sources.json`. Un `sourceId: null` dans la traçabilité veut dire « choix de design assumé », à justifier dans `transformation`.
3. **Quand une valeur est calibrée**, son statut passe de `placeholder` à `calibrated` dans `traceability.json`.
4. **Chiffres incertains** (coût d'une requête, etc.) : on les donne en fourchette dans `facts.json` (`"figure": "0,3 à 3 Wh"`), jamais en chiffre unique.
5. **Changer un schéma** (ajout ou renommage de champ) demande une PR relue par R1 **et** R3, puisque le moteur et le pipeline cassent tous les deux.
6. **Après un recalibrage**, lancer `npm test` : si un test d'équilibrage (`balance.test.ts`) casse, le jeu n'est plus jouable avec ces valeurs. On ajuste alors l'échelle (population, stock), pas les proportions réelles.

## Exemple : ajouter une fiche secrète

```json
// src/data/facts.json
{ "id": "fact-egg-cooling", "kind": "easterEgg", "title": "Fiche secrète : la chaleur",
  "text": "…", "figure": "…", "sourceId": "iea-energy-ai" }
```

```json
// src/data/map.json → easterEggs
{ "id": "egg-cooling", "x": 2, "y": 10, "factId": "fact-egg-cooling" }
```
