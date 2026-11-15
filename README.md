# 🚀 Plateforme de Suivi de la Santé Physique des Astronautes
### Compétition NASA Human Research Program (HRP) & ASC/CSA

Ce projet fournit une solution simple et directe pour le suivi médical des astronautes en mission spatiale.

---

## 📁 Structure des Fichiers

1. **`main.py`** : API FastAPI contenant les indicateurs physiologiques, les seuils cliniques de la NASA/CSA, ainsi que la logique de diagnostic et de prise de décision (contre-mesures médicales et opérationnelles).
2. **`app.py`** : Script console simple où l'astronaute saisit les mesures relevées sur les appareils de bord du vaisseau (`input()`), envoie les données à l'API via une requête POST, et affiche les diagnostics et décisions recommandées.

---

## 📊 Indicateurs Physiologiques & Appareils Embarqués

| # | Indicateur | Appareil Embarqué | Unité | Seuil Nominal | Seuil d'Alerte / Critique | Risque HRP / Danger Spatial |
|---|---|---|---|---|---|---|
| 1 | **Z-Score DMO** | DEXA / Échographe osseux QUS | SD | > -1.0 | <= -2.0 (Ostéoporose) | Déminéralisation osseuse & fractures |
| 2 | **Perte Force Musculaire** | Dynamomètre de préhension | % | < 10% | > 20% (Atrophie sévère) | Atrophie des muscles posturaux |
| 3 | **Fréquence Cardiaque** | Smart Shirt Bio-Monitor CSA | bpm | 55 - 90 | < 50 ou > 105 | Déconditionnement cardiovasculaire |
| 4 | **Pression Artérielle** | Tensiomètre de bord | mmHg | 95-125 / 60-80 | < 90 ou >= 140 | Hypotension (volémie) / Hypertension |
| 5 | **Saturation SpO2** | Oxymètre de pouls Bio-Monitor | % | >= 96% | < 92% (Hypoxie) | Hypoxie cabine / détresse respiratoire |
| 6 | **Dose Radiation Journalière** | Spectromètre neutronique CANS | mSv/j | < 1.0 | > 5.0 (Alerte SPE) | Événement de particules solaires (SPE) |
| 7 | **Dose Radiation Cumulée** | Dosimètre personnel Rad-Silk | mSv | < 100 | > 250 (Seuil NASA 30j) | Cancers radio-induits (REID) & cataracte |
| 8 | **Pression Intraoculaire (PIO)**| Tonomètre portable iCare | mmHg | 11 - 20 | > 24 (Risque SANS) | Syndrome Neuro-Oculaire SANS |
| 9 | **Température Corporelle** | Capteur thermique Bio-Monitor | °C | 36.5 - 37.5 | > 38.2 (Fièvre) ou < 36 | "Space Fever" / Infection en milieu clos |
| 10 | **Densité Urinaire (USG)** | Réfractomètre urinaire | - | 1.005 - 1.020 | > 1.028 (Déshydratation) | Calculs rénaux (lithiase hypercalciurique) |
| 11 | **Pression Partielle CO2** | Capteur d'ambiance vaisseau | mmHg | < 3.0 | > 4.5 (Hypercapnie) | Céphalée spatiale & Intoxication |
| 12 | **Glycémie à jeun** | Glucomètre / Capteur CGM | g/L | 0.70 - 1.10 | < 0.70 ou > 1.40 | Résistance à l'insuline spatiale / Hypoglycémie EVA |

---

## 🛠️ Utilisation

### 1. Démarrer l'API (`main.py`)
Dans un premier terminal :
```bash
uvicorn main:app --reload
```
L'API écoute sur `http://127.0.0.1:8000`.

### 2. Lancer la saisie des mesures (`app.py`)
Dans un second terminal :
```bash
python app.py
```
L'astronaute saisit les valeurs mesurées, le script les transmet à l'API et affiche immédiatement les diagnostics et contre-mesures.
