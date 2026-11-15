# Astrohealth — audit et comptes de démonstration

Toutes les identités et valeurs de ce jeu sont fictives. Aucun compte n’a de mot de passe : la connexion actuelle demande le nom, le matricule et l’environnement de mission.

## Audit du modèle existant (avant génération)

- **Stockage** : IndexedDB via Dexie, base `AstrohealthDB`, schéma version 4 dans `src/db/index.ts`. Tables et index : `measurements (id, astronautId, metric, timestamp, source)`, `sleepLogs (id, astronautId, date)`, `boneDensityRecords (id, astronautId, date, site, method, isBaseline)`, `psychAssessments (id, astronautId, date, status)`, `activityEvents (id, astronautId, date, type)`, `labResults (id, astronautId, analyte, date)`, `astronauts (id, matricule)`, `users (&matricule, id, name)`, `reports (id, astronautId, generatedAt, status)`. Les données liées utilisent `astronautId`; le profil utilisateur est `Astronaut`, clé de connexion unique `matricule`. v3 ajoute `users` et migre matricules; v4 migre l’ancienne clé mentale `Mood Score` en `Mood_Score`.
- **Profil** (`src/types/index.ts`) : `{id, matricule?, name, age, sex: 'male'|'female', weightKg, heightCm?, mission: 'spacecraft'|'station'|'lunar_base'|'mars_rover', photo?, careerRadiationDose?, baselineBoneDensity?, bloodGlucoseUnit?, commDelayMinutes?, missionDay?, createdAt?, profileComplete?}`. À l’inscription l’app utilise `id = matricule`, `age: 0`, `sex: 'male'`, `weightKg: 0`, `profileComplete: false`; le parcours initial demande âge, sexe, taille, poids.
- **Mesure** : `{id, astronautId, metric, value:number, unit, timestamp:number (epoch ms), source:'manual'|'simulated', context?}`. Le référentiel `BODY_MEASURE_CONFIG` / `BODY_MEASURE_FIELD_BY_KEY` dans `src/engine/config/bodyMeasures.ts` définit les 13 champs, leurs unités et bornes de plausibilité : DMO Z-score (`boneZScore`, SD, -6..6), perte musculaire (`muscleStrengthLoss`, %, 0..100), FC (`heartRate`, bpm, 20..250), pression systolique (`bpSys`, mmHg, 50..260), diastolique (`bpDia`, mmHg, 30..160), SpO₂ (`spo2`, %, 50..100), dose jour (`radiationDoseDaily`, mSv/j, 0..50), cumul (`radiationDose`, mSv, 0..2000), PIO (`intraocularPressure`, mmHg, 3..60), température (`temperature`, °C, 30..44), densité urinaire (`urineSpecificGravity`, -, 1..1.06), CO₂ (`co2PartialPressure`, mmHg, 0..20), glycémie à jeun (`fastingGlucose`, g/L, 0.2..6). `thresholds.json` donne également les seuils opérationnels (non validés) : FC 60–100 bpm normale; PA sys 90–119 / dia 60–79 mmHg; température 36.1–37.2 °C; SpO₂ 95–100 %; sommeil 7–9 h. Les seuils détaillés de chaque champ sont dans la configuration source.
- **Journal sommeil** : `{id, astronautId, date:'YYYY-MM-DD', hours, bedtime:'HH:mm', latencyBucket:'<15'|'15-30'|'30-60'|'>60', awakenings, restfulness:1..5, calculatedQuality?}`. Les cinq entrées brutes UI sont durée, coucher, latence (bucket), réveils, ressenti d’énergie.
- **Calcul sommeil** (`src/engine/scores/sleep.ts`) : `calculateSleepScore`/`computeSleepQuality` combinent durée (40 %), continuité latence/réveils (25 %), régularité (15 %, si au moins 3 nuits), ressenti (20 %), avec les courbes de `thresholds.json`, renormalisent si la régularité manque et bornent le résultat à 0–100. `computePsychSleepQuality` applique `score * 62.53 / 100` et arrondit à 2 décimales. La clé mentale est ainsi dérivée, jamais tirée au sort.
- **Test psycho-émotionnel** : `PsychAssessment` = `{id, astronautId, date, answers:number[], score, status, mentalStateData?}`. L’objet mental possède exactement, dans cet ordre, `Stress_level: 'High'|'Medium'|'Low'`, `Happiness: entier 0..10`, `Mood_Score: 'positive'|'neutral'|'negative'`, `Sleep_Quality: number 0..62.53`, `'Workload Perception': 'impossible'|'possible'|'easy'`, `Time_Perception: 'Slow'|'Normal'|'Fast'`, `Food: 'Bad'|'Good'|'Neutral'`, `Communication_with_Earth_mins: nombre >=0` (l’interface indique des heures). La validation est `validate_mental_state`; construction via `createMentalStateData`.
- **Historique** : événements `{id, astronautId, date:'YYYY-MM-DD', type:'login'|'view'|'measurement'}`. Toutes les tables concernées sont séparées par `astronautId`.

## Comptes

Connexion : nom + matricule + environnement de mission (les libellés fournis ci-dessous). Les missions narratives sont documentées ici; le schéma ne stocke que l’environnement (`mission`). Horloge de bord de démonstration : UTC.

L’ancienneté d’utilisation varie de **3 à 45 jours** pour neuf profils. **Kamil Asterive (AST-0009)** est l’exception demandée : inscrit aujourd’hui, une mesure unique. **Ilyana Rovelune (AST-0010)** a `profileComplete: false` pour le parcours initial. Des journées sont omises et les mesures partielles varient selon les jours. La trajectoire d’Idriss montre une période de fatigue récente; celle de Sacha une période d’isolement et de stress.

| Nom fictif | Matricule | Mission fictive | Départ fictif | Environnement |
|---|---|---|---|---|
| Maëlys Virelande | AST-0001 | Aurora-7 | 2026-10-01 | station |
| Idriss Solmaren | AST-0002 | Aurora-7 | 2026-10-01 | station |
| Noura Cendrelune | AST-0003 | Boréal-3 | 2026-10-18 | spacecraft |
| Sacha Orvélis | AST-0004 | Boréal-3 | 2026-10-18 | spacecraft |
| Elian Brumeciel | AST-0005 | Cassiopée-1 | 2026-10-28 | lunar_base |
| Yuna Valombre | AST-0006 | Cassiopée-1 | 2026-10-28 | lunar_base |
| Téo Mirastel | AST-0007 | Périgée-2 | 2026-11-04 | mars_rover |
| Liora Destenac | AST-0008 | Périgée-2 | 2026-11-04 | mars_rover |
| Kamil Asterive | AST-0009 | Sillage-5 (solo) | 2026-11-12 | spacecraft |
| Ilyana Rovelune | AST-0010 | Nébuleuse-4 (solo) | 2026-11-15 | station |

La génération préserve les profils réels et les sessions déjà présents; elle ne vide aucune table. Les comptes marqués première utilisation gardent `profileComplete: false`. En mode développement (`.env.development`) et dans le build de présentation (`npm run build:demo`), le seed se lance au démarrage uniquement si aucun matricule AST de cette liste n’existe. Les fichiers `.env*` activent le mécanisme, sans carte ni commande dans l’interface.

Pour démarrer un serveur dédié au seed, exécuter `npm run seed:demo` et ouvrir l’origine indiquée dans le terminal. `npm run seed:demo -- --reset` recrée uniquement les dix comptes AST de cette liste et leurs enregistrements. Le port et l’hôte sont configurables, par exemple `npm run seed:demo -- --host 127.0.0.1 --port 5173` ; les données IndexedDB sont propres à l’origine, donc il faut employer le même hôte et port que l’application.

Sur une application déjà ouverte en développement, recharger la page puis exécuter dans sa console : `await window.seedAstrohealthDemo()` (ou `await window.seedAstrohealthDemo({ reset: true })` pour remplacer uniquement les comptes fictifs). Le seed est idempotent grâce aux identifiants stables. Les comptes réels n’ayant pas de matricule AST de cette liste ne sont jamais supprimés par le reset.
