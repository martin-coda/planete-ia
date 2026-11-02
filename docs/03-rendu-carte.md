# E0-4 : rendu de la carte

## Décision

**Three.js via React Three Fiber** (avec `@react-three/drei`), caméra **orthographique en vue isométrique**.

## Pourquoi

- La maquette est isométrique, et une caméra orthographique donne exactement ce rendu.
- Déplacement, zoom et rotation sont fournis par `MapControls` (drei), ce qui couvre les contrôles du GDoc sans code maison.
- Le clic sur une case est géré nativement (`onClick` sur chaque mesh) : pas besoin de calculer de coordonnées iso à la main.
- Three.js était déjà le choix surligné dans le GDoc.
- Un canvas 2D iso aurait été plus léger, mais il aurait fallu coder la rotation, le tri de profondeur et la détection des clics.

## Le spike

`src/scene/PlanetMap.tsx` affiche la carte de `map.json`, les bâtiments (formes simples, semi-transparentes pendant le chantier) et gère la sélection de case. **Validé** : le rendu tourne, sans erreur console, en Chromium avec WebGL logiciel, donc sur les PC de salle de classe.

## Contrôles retenus

| Action | Entrée |
|---|---|
| Déplacer la caméra | Clic gauche maintenu |
| Zoomer / dézoomer | Molette |
| Pivoter la vue | Clic droit maintenu |
| Sélectionner une case / révéler un secret | Clic gauche |
| Changer la priorité | Bouton dans l'interface |
| Pause | Échap |

## Pour l'E2

- Remplacer les formes par des modèles low-poly. Kenney.nl propose des packs gratuits en CC0, ce qui évite tout problème de licence.
- Le bundle pèse environ 1 Mo (Three.js). Si Lighthouse le signale, on charge la scène en `lazy()`.
- Sur tablette, vérifier le pan au toucher (`MapControls` le gère, mais il faut le tester).
