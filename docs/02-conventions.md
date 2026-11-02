# E0-3 : conventions du dépôt et suivi

## Branches

- `main` est toujours déployable et protégée : pas de push direct.
- Une branche par tâche du backlog : `type/ID-description`, par exemple `feat/E2-3-panneau-chantier` ou `data/E3-1-sources`.
- Types : `feat`, `fix`, `data`, `docs`, `chore`, `test`.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/), en français :

```
feat(moteur): ajoute la défaite par panne
data(sources): ajoute les chiffres RTE 2025
fix(hud): corrige l'affichage de la confiance
```

## Pull requests

- Une PR par tâche, liée à son issue (`Closes #12`).
- **Relue et approuvée par un autre membre** avant le merge (squash merge).
- La CI doit être verte : lint, tests, build.
- Toute modif de `src/engine/schema.ts` doit être relue par R1 et R3.

## Définition de « terminé »

Une tâche est terminée quand :

1. le code est mergé dans `main` et déployé ;
2. les tests passent, et une règle de jeu ajoutée a son test ;
3. tout chiffre affiché au joueur a sa source dans `sources.json` ;
4. le texte est lisible par un élève de 4e.

## Board (GitHub Projects)

Colonnes : **Backlog → À faire (sprint) → En cours → En revue → Terminé**.

Labels : `E0` à `E5` (epic), `R1` à `R4` (rôle), `must`, `should`, `could`, `bug`.

Pour créer toutes les issues d'un coup à partir de `docs/backlog.csv` : `scripts/create-issues.ps1` (voir le README).

## Communication

- **Discord** : un salon `#général`, un salon `#dev`, un salon `#données`.
- **Point d'équipe court chaque semaine** : ce qui est fait, ce qui bloque, ce qui suit.
