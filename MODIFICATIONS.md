# Modifications du projet Astrohealth

Ce document récapitule les changements apportés dans cette session.

## Frontend — affichage des missions

- Dans l’accueil (`NSAC/src/features/home/HomePage.tsx`), le nom de la mission et le jour de mission sont affichés sur deux lignes.
- Dans l’en-tête partagé (`NSAC/src/ui/Layout.tsx`), le nom de la mission et le compteur `J+…` sont également affichés sur deux lignes.
- Les séparateurs `//` entre ces textes ont été retirés.
- Le compteur de jours de mission n’a pas été rendu automatiquement quotidien : la valeur `missionDay` existante reste pilotée par le stockage du profil et l’action `advanceTime24h`.

## Psyché — questionnaire et données

- Dans `NSAC/src/features/mental/MentalPage.tsx`, le formulaire OMS-5 à cinq questions a été remplacé par les huit champs demandés : bonheur, stress, humeur, charge perçue, perception du temps, communication avec les proches, alimentation et qualité du sommeil.
- Les valeurs catégorielles sont envoyées avec la casse convenue (`High`, `positive`, `Normal`, etc.).
- Les champs numériques ont des contrôles de plage et de pas ; la validation reste désactivée tant que le formulaire est incomplet ou invalide.
- Un récapitulatif des valeurs est présenté avant l’enregistrement.
- Le nouveau dictionnaire est transmis lors de l’ajout d’une évaluation et stocké dans l’enregistrement Psyché via `NSAC/src/store/useAstroStore.ts` et le type `MentalStateData` dans `NSAC/src/types/index.ts`.
- `NSAC/src/features/mental/mentalState.ts` fournit `validate_mental_state(data)`, `save_mental_state_data(data)`, `get_mental_state_data()` et `get_mental_state_history()`. La validation vérifie la structure, les clés et leur ordre, les types et les plages. L’historique conserve un horodatage séparé.
- Le même fichier contient `EXAMPLE_MENTAL_STATE`, l’exemple conforme demandé.

## Vérification

- `npm run build` a réussi après les changements Psyché. Vite affiche son avertissement habituel concernant la taille d’un bundle ; la compilation se termine avec succès.
