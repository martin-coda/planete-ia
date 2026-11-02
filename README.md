# Planète IA (nom provisoire)

Jeu de gestion web pour les élèves de 4e et de seconde, réalisé dans le cadre de l'Open Data University (défi ADEME « L'impact environnemental de l'IA générative »).

Le joueur répond à une demande d'IA qui ne cesse de croître sur une petite planète, sans épuiser l'énergie, les métaux critiques ni la confiance des habitants. Tous les paramètres s'appuient sur des données ouvertes (Compar:IA, RTE, Baromètre du numérique, USGS…).

## Démarrer

Prérequis : Node.js 22 ou plus.

```powershell
npm install
npm run dev        # http://localhost:5173
npm test           # tests du moteur et du contrat de données
npm run build      # build de production dans dist/
```

## Stack

React 19 · TypeScript · Vite · Three.js (React Three Fiber + drei) · Zustand · zod · Vitest. Déploiement sur Vercel.

## Organisation du code

| Dossier | Rôle |
|---|---|
| `src/engine/` | Moteur de jeu pur et testé, sans React ni Three.js |
| `src/data/` | JSON du jeu : paramètres, carte, fiches, sources, traçabilité |
| `src/store/` | Store Zustand et boucle de jeu |
| `src/scene/` | Carte isométrique 3D |
| `src/ui/` | Interface (HUD) |
| `data/` | Données brutes et scripts de transformation (R3) |
| `docs/` | Cadrage, contrat de données, conventions, backlog |

## Documentation

- [Décisions de cadrage (E0-1)](docs/00-decisions-e0.md)
- [Contrat de données (E0-2)](docs/01-contrat-donnees.md)
- [Conventions et board (E0-3)](docs/02-conventions.md)
- [Rendu de la carte (E0-4)](docs/03-rendu-carte.md)
- [Moteur de jeu (E1)](docs/04-moteur.md)
- [Backlog](docs/backlog.md)

## Créer le board

1. Installer GitHub CLI : `winget install GitHub.cli`, puis `gh auth login`.
2. Créer un projet sur GitHub (onglet Projects → New project → Board).
3. Créer les issues à partir du backlog : `.\scripts\create-issues.ps1`
4. Ajouter les issues au projet (Projects → « Add items » → filtrer sur le dépôt).
