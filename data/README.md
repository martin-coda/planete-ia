# data/

Pipeline de données (R3).

- `raw/` : fichiers bruts téléchargés (ne pas les modifier à la main). Noter la date de téléchargement dans le nom du fichier.
- `scripts/` : script (ou notebook) qui transforme les données brutes en `src/data/game-params.json`, `facts.json`, `sources.json` et `traceability.json`.

Le script doit être reproductible. Ensuite, lancer `npm test` pour vérifier le contrat et l'équilibrage (voir `docs/01-contrat-donnees.md`).
