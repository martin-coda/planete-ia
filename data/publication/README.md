# Planète IA : paramètres d'un jeu pédagogique sur l'impact de l'IA générative

*Texte prêt à copier dans la description du jeu de données sur data.gouv.fr (E3-5).*

## Description

Planète IA est un jeu de gestion pour les élèves de 4e et de seconde, réalisé dans le cadre de l'Open Data University (défi ADEME « L'impact environnemental de l'IA générative »). Le joueur répond à une demande d'IA croissante sur une petite planète, sans épuiser l'énergie, les métaux critiques ni la confiance des habitants.

Ce jeu de données publie **comment nous avons transformé des données ouvertes en paramètres de jeu**, pour que d'autres puissent vérifier, réutiliser ou adapter notre travail.

## Fichiers

| Fichier | Contenu |
|---|---|
| `parametres-du-jeu.csv` | Chaque paramètre du jeu, sa valeur, la donnée réelle utilisée, la source et le calcul appliqué |
| `categories-usage-comparia.csv` | Répartition des 410 012 conversations Compar:IA (octobre 2024 à mai 2026) en 9 catégories d'usage |
| `energie-par-conversation-comparia.csv` | Électricité estimée par conversation sur Compar:IA (centiles 10 à 90, en Wh) |
| `chiffres-sources.csv` | Tous les chiffres cités dans le jeu, avec leur source et leur lien |

## Sources réutilisées

Compar:IA (ministère de la Culture, Licence Ouverte 2.0), RTE (Bilan électrique 2024), Enedis (Bilan électrique 2024), Insee (bilan démographique), Baromètre du numérique (Arcep, Arcom, CGE, ANCT, Crédoc), Agence internationale de l'énergie (Energy and AI), USGS (Mineral Commodity Summaries 2025). Le détail et les licences de chaque source sont dans `chiffres-sources.csv`.

Ce lot ne redistribue aucune donnée brute sous licence restrictive : il contient des chiffres cités avec leur source, et des agrégats calculés par nos soins.

## Méthode et limites

- Planète fictive de 100 000 habitants : on garde les **proportions** réelles (consommation par habitant, pertes du réseau, rythme d'adoption, croissance des datacenters, rapport réserves / production des terres rares), pas les volumes.
- Les catégories d'usage regroupent les thèmes calculés par Compar:IA. Classer un usage comme « non essentiel » est un **choix pédagogique**, pas une mesure.
- Aucun message d'utilisateur n'a été lu ni publié : seuls des comptes agrégés sont diffusés.
- Le code qui produit ces fichiers est reproductible : `npm run data:extract` puis `npm run data:build`.

## Licence

Licence Ouverte / Open Licence 2.0 (Etalab), pour les fichiers produits par l'équipe.

## Publier sur data.gouv.fr

1. Se connecter sur https://www.data.gouv.fr, puis cliquer sur « Publier sur data.gouv.fr » → « Un jeu de données ».
2. Titre : « Planète IA : paramètres d'un jeu pédagogique sur l'impact de l'IA générative ». Description : le texte ci-dessus. Licence : Licence Ouverte 2.0. Fréquence : ponctuelle.
3. Ajouter les 4 fichiers CSV comme ressources.
4. Optionnel mais conseillé : déclarer ce jeu comme « réutilisation » du jeu de données Compar:IA, pour faire le lien.
