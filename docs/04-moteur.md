# E1 : moteur de jeu

## Architecture

```
src/
  engine/        → logique pure, sans React ni Three.js (testée avec Vitest)
    schema.ts      contrat de données (zod)
    types.ts       état du jeu, événements, erreurs
    simulation.ts  createInitialState, tick, calculs
    actions.ts     actions du joueur
    loadContext.ts charge et valide src/data/*.json
  data/          → JSON du jeu (contrat E0-2)
  store/         → Zustand : fait le pont entre le moteur et React, plus la boucle de jeu
  scene/         → carte 3D (R3F)
  ui/            → interface (voir 05-interface.md)
```

**Règle d'or** : `engine/` n'importe jamais React, Three.js ou le store. On peut donc tester toutes les règles sans navigateur, et R2 peut changer toute l'interface sans toucher aux règles.

## API

```ts
const ctx = loadContext();               // { config, map }, validés
let s = createInitialState(ctx);
s = tick(ctx, s);                        // avance d'un mois
const r = build(ctx, s, 'datacenter', 3, 7);  // { ok: true, state } | { ok: false, error, state }
```

Actions : `build`, `canBuild` (pour griser un bouton), `upgradeGrid`, `setPriority`, `toggleCategoryLimit`, `discoverEgg`.

Chaque tick ou action remplit `state.events` (`phase2Started`, `buildingReady`, `rareEarthDepleted`, `stabilized`, `understood`, `defeat`). L'UI s'en sert pour les messages et les animations.

## Séquence d'un tick (1 mois)

1. **Chantiers** : les bâtiments dont `readyAt` est atteint entrent en service.
2. **Demande**
   - Phase 1 : l'adoption suit une croissance logistique (`a += r·a·(1−a)`). À 99,9 %, passage en phase 2.
   - Phase 2 : la surconsommation tend vers un plafond (`e += r·e·(1 − e/plafond)`). Le plafond baisse quand des usages sont limités, et `e` redescend s'il est au-dessus.
   - `demande = population × adoption × (1 + surconsommation) × calcul_par_utilisateur`.
3. **Énergie**
   - Production nette = centrales × (1 − pertes réseau).
   - Un datacenter consomme `P × (part_à_vide + (1 − part_à_vide) × charge)`.
   - L'énergie va d'abord au secteur prioritaire.
   - Calcul servi = min(demande, capacité × ratio d'alimentation des datacenters).
4. **Terres rares** : la ville en prélève un peu chaque mois.
5. **Confiance** : voir la formule dans `00-decisions-e0.md` (décision 8).
6. **Défaites** : confiance, panne, ressources (compteurs de mois consécutifs).
7. **Stabilisation** (phase 2), puis « Vous avez compris les enjeux » si tous les secrets ont été trouvés.
8. **Historique** : un point par an pour les graphiques du bilan.

## Équilibrage actuel (valeurs calibrées, E3)

Résultats des joueurs automatiques de `balance.test.ts` avec les vraies données :

| Stratégie | Résultat |
|---|---|
| Ne rien faire | Défaite (confiance) en phase 1, vers l'an 7,5 |
| Construire sans jamais limiter les usages | Défaite (confiance) en phase 2, vers l'an 38 |
| Construire **et** limiter les usages inutiles | Planète stabilisée vers l'an 29,5 (environ 6 min à ×1) |

C'est exactement le message pédagogique : construire ne suffit plus. Ces tests protègent ce comportement quand les données sont mises à jour.

## Commandes utiles

```powershell
npm test            # tous les tests
npm run test:watch  # tests en continu pendant le dev
```
