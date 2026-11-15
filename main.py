from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any


app = FastAPI(
    title="NASA Physical Health Decision API",
    description="API de suivi de la santé physique et de prise de décision pour astronautes (NASA HRP & CSA)",
    version="1.1.0"
)


# Données physiologiques mesurées par l'astronaute à bord

class PhysicsData(BaseModel):
    Z_Score: float
    perte_force_musculaire: float
    frequence_cardiaque: float
    pression_systolique: float
    pression_diastolique: float
    spo2: float
    dose_radiation_journaliere: float
    dose_radiation_cumulee: float
    pression_intraoculaire: float
    temperature_corporelle: float
    densite_urinaire: float
    co2_cabine: float
    glycemie: float  # Glycémie en g/L (ex: 0.95) ou mg/dL (ex: 95)


# Points de terminaison

@app.get("/")
def welcome():
    return {
        "message": "Bienvenue sur l'API de surveillance de la santé physique des astronautes (NASA HRP & CSA)",
        "version": "1.1.0",
        "indicateurs_surveilles": 12
    }


@app.post("/predict")
def predict(data: PhysicsData):
    diagnostic = []
    decisions = []
    nb_critique = 0
    nb_vigilance = 0

    # 1. Densité minérale osseuse (Z-Score DMO - Réf: NASA HRP Bone Loss Risk)
    if data.Z_Score <= -2.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Densité osseuse inférieure aux attentes pour l'âge (Ostéoporose spatiale / risque de fracture élevé)")
        decisions.append("Prescription de bisphosphonates et augmentation des exercices de charge axiale sur ARED")
    elif data.Z_Score <= -1.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Ostéopénie modérée liée à la microgravité")
        decisions.append("Renforcer les exercices de résistance sur ARED et surveiller l'apport Calcium/Vitamine D")
    else:
        diagnostic.append("NOMINAL : Densité osseuse normale")

    # 2. Force musculaire (Perte en % - Réf: NASA HRP Muscle Atrophy Risk)
    if data.perte_force_musculaire > 20.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Atrophie musculaire sévère des chaînes posturales antigravitaires")
        decisions.append("Augmenter l'intensité des séances sur ARED/CEVIS et supplémentation en acides aminés branchés (BCAA)")
    elif data.perte_force_musculaire >= 10.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Atrophie musculaire modérée")
        decisions.append("Augmenter la durée d'entraînement musculaire de 30 minutes par jour")
    else:
        diagnostic.append("NOMINAL : Force musculaire normale")

    # 3. Fréquence cardiaque au repos (Réf: Bio-Monitor CSA & Hexoskin)
    if data.frequence_cardiaque > 105.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Tachycardie de repos marquée (stress, hypovolémie ou déconditionnement)")
        decisions.append("Enregistrement ECG complet sur Bio-Monitor et vérification de l'état d'hydratation")
    elif data.frequence_cardiaque < 50.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Bradycardie anormale au repos")
        decisions.append("Monitoring holter ECG continu et avis médical de vol")
    elif data.frequence_cardiaque > 90.0 or data.frequence_cardiaque < 55.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Fréquence cardiaque limite")
        decisions.append("Contrôle régulier du rythme cardiaque et repos")
    else:
        diagnostic.append("NOMINAL : Fréquence cardiaque normale")

    # 4. Pression artérielle systolique et diastolique (Réf: Bio-Monitor & Hémodynamique spatiale)
    if data.pression_systolique >= 140.0 or data.pression_diastolique >= 90.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Hypertension artérielle au repos (majoration de la pression céphalique)")
        decisions.append("Mise au repos, relaxation et surveillance ophtalmologique de la pression oculaire")
    elif data.pression_systolique < 90.0 or data.pression_diastolique < 60.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Hypotension artérielle prononcée (perte de volume plasmatique en impesanteur)")
        decisions.append("Protocole de rétention volémique : prise de comprimés de sel et hydratation saline")
    else:
        diagnostic.append("NOMINAL : Pression artérielle normale")

    # 5. Saturation en oxygène SpO2 (Réf: Bio-Monitor CSA)
    if data.spo2 < 92.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Hypoxie sévère (oxygénation tissulaire compromise)")
        decisions.append("Administration immédiate d'oxygène pur au masque et vérification de la ppO2 cabine")
    elif data.spo2 < 96.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Hypoxie modérée")
        decisions.append("Contrôler la ventilation de cabine et le système de support de vie (ECLSS)")
    else:
        diagnostic.append("NOMINAL : Saturation en oxygène normale")

    # 6. Radiation journalière (Réf: Spectromètre neutronique CANS CSA & NASA SRAG)
    if data.dose_radiation_journaliere > 5.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Alerte Tempête Solaire / Événement SPE de particules solaires")
        decisions.append("Repli immédiat dans l'abri blindé anti-radiations (Storm Shelter) et annulation des sorties EVA")
    elif data.dose_radiation_journaliere >= 1.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Flux radiatif élevé (passage SAA ou sursaut solaire modéré)")
        decisions.append("Restreindre les activités dans les modules les moins blindés du vaisseau")
    else:
        diagnostic.append("NOMINAL : Exposition radiative quotidienne normale")

    # 7. Radiation cumulée de mission (Réf: Dosimètre Rad-Silk CSA & Limite 30 jours NASA 250 mSv)
    if data.dose_radiation_cumulee > 250.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Dépassement du seuil mensuel de sécurité radiologique de la NASA (250 mSv)")
        decisions.append("Bilan hématologique complet et révision du profil de mission avec le centre de contrôle")
    elif data.dose_radiation_cumulee >= 100.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Dose de radiation cumulée sous surveillance")
        decisions.append("Surveillance rapprochée des dosimètres personnels et bilan ophtalmologique (dépistage cataracte)")
    else:
        diagnostic.append("NOMINAL : Dose cumulée dans les normes de mission")

    # 8. Pression intraoculaire PIO (Réf: NASA HRP Risk of SANS)
    if data.pression_intraoculaire > 24.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Hypertension oculaire sévère (Risque élevé de syndrome SANS et d'œdème papillaire)")
        decisions.append("Séances quotidiennes de LBNP (pression négative bas du corps) et examen du fond d'œil à bord")
    elif data.pression_intraoculaire > 20.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Hypertension oculaire modérée liée à la redistribution liquidienne vers la tête")
        decisions.append("Surveillance de l'acuité visuelle et test ophtalmologique à J+2")
    else:
        diagnostic.append("NOMINAL : Pression intraoculaire normale")

    # 9. Température corporelle (Réf: Bio-Monitor CSA & Phénomène de 'Space Fever')
    if data.temperature_corporelle > 38.2:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Fièvre avérée (suspicion d'infection bactérienne/virale en milieu clos)")
        decisions.append("Prise d'antipyrétiques, isolement préventif et bilan microbiologique embarqué")
    elif data.temperature_corporelle < 36.0:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Hypothermie corporelle anormale")
        decisions.append("Réchauffement actif et vérification de la combinaison / température cabine")
    elif data.temperature_corporelle >= 37.6:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Élévation thermique modérée ('Space Fever' : altération de la convection en micropesanteur)")
        decisions.append("Ventilation d'air frais directe, hydratation fraîche et temporisation des efforts intenses")
    else:
        diagnostic.append("NOMINAL : Température corporelle normale")

    # 10. Densité urinaire USG (Réf: NASA HRP Risk of Renal Stone Formation)
    if data.densite_urinaire > 1.028:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Déshydratation aiguë et urine hyperconcentrée (Risque critique de calculs rénaux)")
        decisions.append("Hyperhydratation immédiate (boire 1.5 L d'eau électrolytique) et prise de citrate de potassium")
    elif data.densite_urinaire >= 1.021:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Hydratation sous-optimale (urine concentrée)")
        decisions.append("Augmenter l'apport hydrique quotidien d'au moins 1 litre d'eau")
    else:
        diagnostic.append("NOMINAL : Hydratation et fonction rénale normales")

    # 11. Pression partielle de CO2 cabine (Réf: NASA Spacecraft Air Quality & Space Headache)
    if data.co2_cabine > 4.5:
        nb_critique += 1
        diagnostic.append("CRITIQUE : Hypercapnie cabine toxique (CO2 élevé : céphalées sévères et altération cognitive)")
        decisions.append("Basculement d'urgence sur les cartouches de LiOH de secours et ventilation forcée des quartiers d'équipage")
    elif data.co2_cabine >= 3.0:
        nb_vigilance += 1
        diagnostic.append("ATTENTION : Niveau de CO2 cabine élevé (risque de céphalée spatiale 'space headache')")
        decisions.append("Vérification des épurateurs CDRA et optimisation de la circulation d'air")
    else:
        diagnostic.append("NOMINAL : Qualité d'air cabine normale (CO2 optimal)")

    # 12. Glycémie à jeun (Réf: NASA HRP Insulin Resistance & Metabolic Inflexibility in Microgravity)
    glycemie_g_l = data.glycemie / 100.0 if data.glycemie > 20.0 else data.glycemie

    if glycemie_g_l < 0.70:
        nb_critique += 1
        diagnostic.append(f"CRITIQUE : Hypoglycémie aiguë ({glycemie_g_l:.2f} g/L) : Risque de confusion motrice et vertiges en impesanteur/EVA")
        decisions.append("Prise immédiate de 15g de glucides rapides (gel de glucose / collation) et repos 15 minutes")
    elif glycemie_g_l > 1.40:
        nb_critique += 1
        diagnostic.append(f"CRITIQUE : Hyperglycémie marquée ({glycemie_g_l:.2f} g/L) : Résistance sévère à l'insuline d'inactivité musculaire")
        decisions.append("Ajustement de la ration (réduction glucides rapides), hydratation et séance d'exercice résistant ARED")
    elif glycemie_g_l > 1.10:
        nb_vigilance += 1
        diagnostic.append(f"ATTENTION : Intolérance au glucose modérée ({glycemie_g_l:.2f} g/L) : Résistance à l'insuline d'adaptation spatiale")
        decisions.append("Surveiller l'index glycémique des repas et maintenir l'activité physique CEVIS/ARED")
    else:
        diagnostic.append(f"NOMINAL : Glycémie normale ({glycemie_g_l:.2f} g/L)")

    # Statut global de vol
    if nb_critique > 0:
        statut_global = "ALERTE ROUGE : DÉCISION MÉDICALE URGENTE"
    elif nb_vigilance > 0:
        statut_global = "VIGILANCE ORANGE : CONTRE-MESURES REQUISES"
    else:
        statut_global = "STATUT VERT : SANTÉ PHYSIQUE NOMINALE"

    return {
        "statut_global": statut_global,
        "nb_anomalies_critiques": nb_critique,
        "nb_anomalies_vigilance": nb_vigilance,
        "diagnostic": diagnostic,
        "decisions_recommandees": decisions
    }
