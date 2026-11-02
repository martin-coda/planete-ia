# E2 : interface, carte et UX

## Écran de jeu

```
┌ Barre du haut : date · phase (adoption → surconsommation) · vitesse · Règles · Bilan · Sources · Menu ┐
├ 4 jauges : 01 Calcul IA · 02 Énergie · 03 Terres rares · 04 Confiance (chacune avec « ? » = sources) ┤
├──────────────── Carte iso 3D ─────────────────┬── Panneau latéral ─────────────┤
│ fiche de case · bandeau pause/placement       │ Alertes (compte à rebours)     │
│ boutons caméra + − ⟲ ⟳ ⌖                      │ Si l'énergie manque (priorité) │
├──────────────── Chantier ─────────────────────┤ Limiter les usages (phase 2)   │
│ Datacenter · Réacteur Hélios · Réseau         │ Objectif / stabilité           │
└───────────────────────────────────────────────┴ Carnet des secrets · Journal ──┘
```

## Fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `src/ui/TopBar.tsx` | Date, jauge de phase, vitesse, menus | E2-1, E2-5 |
| `src/ui/Gauges.tsx` | Les 4 jauges de la maquette, avec état OK / Attention / Critique | E2-1 |
| `src/scene/PlanetMap.tsx` | Carte iso, survol, sélection, aperçu de placement, caméra | E2-2, E2-4 |
| `src/scene/models.tsx` | Modèles low-poly (formes Three.js, aucun fichier externe) | E2-2 |
| `src/ui/MapView.tsx` | Surcouches HTML de la carte, navigation clavier | E2-2, E2-4, E2-7 |
| `src/ui/BuildPanel.tsx` | Module de chantier (mode placement) | E2-3 |
| `src/ui/SidePanel.tsx` | Arbitrage ville / IA, alertes, usages, objectif, secrets, journal | E2-3 |
| `src/ui/Menu.tsx`, `Notices.tsx`, `EndScreen.tsx` | Menu, annonces (phase 2, secret, stabilisée, enjeux compris), fin de partie | E2-5 |
| `src/ui/InfoTip.tsx`, `dataSources.ts`, `CreditsModal.tsx` | « D'où vient ce chiffre ? » et écran des sources | E2-6 |
| `src/ui/Modal.tsx` | Fenêtre accessible commune (focus piégé puis rendu) | E2-7 |
| `src/ui/BilanCharts.tsx` | Graphiques du bilan + vue tableau | E2-8 |
| `src/ui/RulesModal.tsx` | Règles du jeu | — |

## Règles d'interface

- **Toute fenêtre met le jeu en pause**, et la vitesse d'avant revient quand la dernière se ferme (`openModal` / `closeModal` dans le store, testé dans `src/store/__tests__/gameStore.test.ts`).
- **Construire** : « Placer sur la carte » active le mode placement. Les cases constructibles s'éclaircissent, un aperçu vert ou rouge suit la souris, et un clic construit. Échap annule.
- **Échap**, dans l'ordre : ferme l'annonce, puis la fenêtre ouverte, puis annule le placement, sinon met en pause. **Espace** = pause.
- **Infobulles** : les lignes viennent de `traceability.json` via `GAUGE_PARAMS` (`dataSources.ts`). Quand R3 calibre une valeur (`status: "calibrated"`), le badge « valeur provisoire » disparaît tout seul.
- **Chiffres affichés** : tous lus dans `game-params.json`, jamais écrits en dur.

## Accessibilité (E2-7)

- Carte au clavier : Tab jusqu'à la carte, flèches = curseur (annoncé aux lecteurs d'écran), Entrée = sélectionner ou construire.
- Jauges en `role="meter"`, état donné par une couleur **et** un texte (OK / Attention / Critique).
- Fenêtres en `role="dialog"` avec focus piégé ; lien d'évitement « Aller au chantier ».
- Couleurs des graphiques validées pour les daltoniens ; chaque graphique a une vue tableau.
- `prefers-reduced-motion` coupe les animations (fumée, secrets, annonces).

## Responsive

- **≥ 1000 px** : grille complète (PC de classe, tablette en paysage). Sous 820 px de haut, le chantier passe en version compacte.
- **< 1000 px** : jauges en 2 × 2.
- **< 860 px** : tout s'empile et la page défile (tablette en portrait, téléphone).
- **Tactile** : un doigt pour déplacer la carte, deux doigts pour zoomer ou pivoter.

## Pour tester

En développement, le store est accessible dans la console du navigateur : `__game.getState()`. Par exemple, pour voir l'annonce de la phase 2 :

```js
const g = __game; g.setState({ game: { ...g.getState().game, adoption: 0.9999 } }); g.getState().step();
```

## Reste à faire

- Lancer **Lighthouse et axe** sur la version déployée (E2-7 demande un audit outillé, pas encore fait).
- Les sons (cités dans le PDF, hors backlog E2).
- Remplacer les textes provisoires de `facts.json` (E3-4).
