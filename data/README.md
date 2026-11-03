# data/ : pipeline de données (E3)

Toutes les valeurs du jeu viennent d'ici. **On ne modifie jamais `src/data/game-params.json`, `sources.json` ou `traceability.json` à la main** : on modifie les fichiers ci-dessous, puis on relance le script.

```
data/raw/figures.json            chiffres relevés dans les rapports (RTE, Enedis, Insee, Arcep, AIE, USGS)
data/raw/sources.json            les sources : éditeur, lien, licence, année
data/raw/comparia-*.csv|json     extraits agrégés de Compar:IA (générés par extract-comparia.mjs)
data/scripts/design.json         choix de conception du jeu (R1), chacun justifié
data/scripts/extract-comparia.mjs   Compar:IA → data/raw/comparia-*
data/scripts/build-params.mjs       data/raw + design.json → src/data/*.json + data/publication/*.csv
data/publication/                lot de données prêt à publier sur data.gouv.fr (E3-5)
```

## Commandes

```powershell
npm run data:extract   # relit Compar:IA (≈ 1 min, lit seulement 4 colonnes du fichier distant de 2,6 Go)
npm run data:build     # recalcule les paramètres du jeu (instantané, hors ligne)
npm test               # contrat de données + équilibrage
```

La CI relance `data:build` et refuse la PR si les fichiers générés ne correspondent pas : le pipeline est donc toujours reproductible.

## Ce qui est calculé à partir des données

| Paramètre du jeu | Donnée réelle | Calcul |
|---|---|---|
| `city.powerMw` | 449,2 TWh consommés en France en 2024 (RTE), 68,7 M d'habitants (Insee) | MWh par habitant × population ÷ 8 760 h → **74,6 MW** |
| `grid.baseLossRate` | ≈ 2,5 % de pertes sur le transport (RTE) + 23,8 TWh sur la distribution (Enedis) | → **7,8 %** |
| `demand.adoption.growthRatePerMonth` | 20 % → 33 % → 48 % d'utilisateurs d'IA générative (Baromètre du numérique, 2023-2025) | courbe logistique → **0,0544 / mois** (1 mois de jeu = 1 mois réel) |
| `demand.overuse.maxExtra` | Datacenters : 415 TWh en 2024 → 945 TWh en 2030 (AIE) | ×2,28 → **+128 %** de surconsommation max |
| `city.rareEarthTPerYear` | Réserves 90 Mt, production 390 kt en 2024 (USGS) → 231 ans | stock ÷ 231 ans → **5,63 t/an** |
| `trust.initial` | 52 % de personnes méfiantes envers l'IA générative en 2025 (Baromètre) | 100 − 52 → **48 %** |
| `usageCategories` | Thèmes de 410 012 conversations Compar:IA (oct. 2024 → mai 2026) | regroupés en 9 catégories, voir `design.json` |

Tout le reste (datacenter, réacteur, formule de confiance, conditions de fin) est un **choix de conception**, justifié dans `design.json` et marqué comme tel dans `traceability.json`.

## Compar:IA et protection des mineurs (E3-3)

- Le script ne lit **aucun message d'utilisateur** : seulement les colonnes `timestamp`, `categories`, `total_conv_a_kwh` et `total_conv_b_kwh`.
- Seuls des **comptes agrégés** sont gardés. Aucun texte libre n'arrive dans le jeu : les libellés affichés sont écrits par l'équipe dans `design.json`.
- Garde-fou supplémentaire : une catégorie Compar:IA dont le nom contient un mot de la liste `moderation.blockedWords` n'est jamais nommée dans le jeu (elle part dans « Sans sujet précis »). Sur l'extraction actuelle, aucune catégorie n'a été filtrée.

## Chiffres encore à vérifier

Dans `figures.json`, `verified: false` signale un chiffre lu seulement dans une source secondaire :

- `rte-transport-loss-rate` (2,5 %) : chercher le chiffre exact dans le rapport complet du Bilan électrique RTE 2024.
- `genai-users-2023` et `genai-users-2024` : vérifier dans le rapport du Baromètre du numérique 2025.
- `dc-electricity-*` et `dc-water-2023` : vérifier dans le rapport « Energy and AI » de l'AIE (le site bloque la lecture automatique).

Quand un chiffre est vérifié : corriger la valeur si besoin, passer `verified` à `true`, puis lancer `npm run data:build` et `npm test`.
