# Backlog (version corrigée)

Le projet est un jeu de gestion web pour les élèves de 4e et de seconde. Ils répondent à une demande d'IA croissante sans épuiser l'énergie, les métaux critiques ni la confiance du public, à partir de vraies données ouvertes.

Les estimations sont en jours-personne idéaux, marge de 20 % comprise. MoSCoW : **M** indispensable, **S** important, **C** bonus.

Les rôles (R1 game design, R2 front/UX, R3 données, R4 backend/DevOps/RGPD) ne correspondent plus à des personnes : nous sommes 3, chaque personne prend des tâches de plusieurs rôles.

Le rendu final est le **3 décembre 2026**.

## E0 : Cadrage (3 j), fait le 2 novembre

| ID | Tâche | Rôle | Est. | Prio | État |
|---|---|---|---|---|---|
| E0-1 | Trancher les points ouverts | Tous | 1 | M | ✅ `docs/00-decisions-e0.md` (à relire en équipe) |
| E0-2 | Définir le contrat de données JSON | R1, R3 | 1 | M | ✅ `docs/01-contrat-donnees.md` + `schema.ts` |
| E0-3 | Conventions du dépôt + board | R4 | 0,5 | M | ✅ `docs/02-conventions.md`, board à créer |
| E0-4 | Valider le rendu de la carte | R2 | 0,5 | M | ✅ R3F iso, spike dans `src/scene/` |

## E1 : Moteur de jeu (8 j), fait le 2 novembre (à relire)

| ID | Tâche | Rôle | Est. | Prio | État |
|---|---|---|---|---|---|
| E1-1 | Modéliser l'état du jeu et coder la boucle de simulation | R1 | 2 | M | ✅ |
| E1-2 | Règles de ressources : datacenter, ville, centrale, réseau, priorité | R1 | 3 | M | ✅ |
| E1-3 | Confiance du public et conditions de fin | R1 | 1,5 | M | ✅ |
| E1-4 | Phase 2 : intensité > 100 % et usages inutiles limitables | R1 | 1,5 | M | ✅ |
| E1-5 | Brancher le moteur sur React (store, boucle, HUD de debug) | R1, R2 | 0,5 | M | ✅ |

## E2 : Front, carte et UX (11 j), fait le 2 novembre (à relire, voir `docs/05-interface.md`)

| ID | Tâche | Rôle | Est. | Prio | État |
|---|---|---|---|---|---|
| E2-1 | Intégrer la maquette (mise en page, barre latérale, 4 jauges) à la place du HUD de debug | R2 | 2 | M | ✅ |
| E2-2 | Carte iso : modèles low-poly, survol, case sélectionnée | R2 | 2,5 | M | ✅ |
| E2-3 | Panneau de chantier et arbitrage ville / datacenters | R2 | 2 | M | ✅ |
| E2-4 | Caméra : réglages fins, tactile | R2 | 0,5 | S | ✅ (tactile à tester sur une vraie tablette) |
| E2-5 | Menu, pause, écran de fin « Et dans le monde réel ? », annonce de la phase 2 | R2 | 2 | M | ✅ |
| E2-6 | Infobulles « D'où vient ce chiffre ? » et écran de crédits des données | R2 | 1 | M | ✅ |
| E2-7 | Responsive (tablette et PC de classe) et accessibilité de base (Lighthouse / axe) | R2 | 1 | M | 🟡 fait, audit Lighthouse / axe à lancer |
| E2-8 | Écran de bilan avec graphiques (historique annuel déjà fourni par le moteur) | R2 | 1 | S | ✅ |

## E3 : Données (9 j)

| ID | Tâche | Rôle | Est. | Prio |
|---|---|---|---|---|
| E3-1 | Collecter les sources clés, vérifier les licences, remplir `traceability.json` | R3 | 2 | M |
| E3-2 | Script reproductible données brutes → `game-params.json` (dans `data/`) | R3 | 2 | M |
| E3-3 | Extraire les catégories et parts d'usage Compar:IA, modérer pour des mineurs | R3 | 3 | M |
| E3-4 | Rédiger les fiches de fin et les fiches secrètes, plus les hypothèses et limites | R3 | 1 | M |
| E3-5 | Publier le lot de données nettoyé sur data.gouv.fr | R3 | 1 | S |

## E4 : Déploiement et RGPD (4 j)

| ID | Tâche | Rôle | Est. | Prio |
|---|---|---|---|---|
| E4-1 | Déploiement continu (Vercel) depuis le nouveau dépôt | R4 | 1 | M |
| E4-2 | Conformité RGPD mineurs : aucune donnée personnelle, page de confidentialité | R4 | 1 | M |
| E4-3 | Stats de parties anonymes, exportées en open data | R4 | 2 | C |

## E5 : Livraison (4 j)

| ID | Tâche | Rôle | Est. | Prio |
|---|---|---|---|---|
| E5-1 | Playtests (parties de 10 à 15 min) et équilibrage | Tous | 1,5 | M |
| E5-2 | README et documentation des données | Tous | 1 | M |
| E5-3 | Pitch et démo pour le jury | Tous | 1 | M |
| E5-4 | Recette et correction des bugs bloquants | Tous | 0,5 | M |

## Reste à faire

Environ 27 j sur E2 à E5 (29 j avec le Could), pour 3 personnes jusqu’au 3 décembre : environ 9 j chacun. C'est tenable si E4-3 reste en Could et que E2-1/E2-2 démarrent cette semaine.
