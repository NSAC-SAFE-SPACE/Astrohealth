from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


app = FastAPI(
    title="NASA Physical Health Decision API",
    description="API de suivi de la santé physique et de prise de décision pour astronautes (NASA HRP & CSA)",
    version="1.2.0"
)


# Données physiologiques mesurées par l'astronaute à bord (toutes optionnelles)

class PhysicsData(BaseModel):
    Z_Score: Optional[float] = None
    perte_force_musculaire: Optional[float] = None
    frequence_cardiaque: Optional[float] = None
    pression_systolique: Optional[float] = None
    pression_diastolique: Optional[float] = None
    spo2: Optional[float] = None
    dose_radiation_journaliere: Optional[float] = None
    dose_radiation_cumulee: Optional[float] = None
    pression_intraoculaire: Optional[float] = None
    temperature_corporelle: Optional[float] = None
    densite_urinaire: Optional[float] = None
    co2_cabine: Optional[float] = None
    glycemie: Optional[float] = None  # Glycémie en g/L (ex: 0.95) ou mg/dL (ex: 95)


# Points de terminaison

@app.get("/")
def welcome():
    return {
        "message": "Bienvenue sur l'API de surveillance de la santé physique des astronautes (NASA HRP & CSA)",
        "version": "1.2.0",
        "indicateurs_surveilles": 12
    }


@app.post("/predict")
def predict(data: PhysicsData):
    diagnostic = []
    decisions = []
    nb_critique = 0
    nb_vigilance = 0
    nb_analyses = 0

    # 1. Densité minérale osseuse (Z-Score DMO - Réf: NASA HRP Bone Loss Risk)
    if data.Z_Score is not None:
        nb_analyses += 1
        if data.Z_Score <= -2.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Densité osseuse inférieure aux attentes pour l'âge (Z-Score = {data.Z_Score:.2f}) (Ostéoporose spatiale / risque de fracture élevé)")
            decisions.append("Prescription de bisphosphonates et augmentation des exercices de charge axiale sur ARED")
        elif data.Z_Score <= -1.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Ostéopénie modérée liée à la microgravité (Z-Score = {data.Z_Score:.2f})")
            decisions.append("Renforcer les exercices de résistance sur ARED et surveiller l'apport Calcium/Vitamine D")
        else:
            diagnostic.append(f"NOMINAL : Densité osseuse normale (Z-Score = {data.Z_Score:.2f})")

    # 2. Force musculaire (Perte en % - Réf: NASA HRP Muscle Atrophy Risk)
    if data.perte_force_musculaire is not None:
        nb_analyses += 1
        if data.perte_force_musculaire > 20.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Atrophie musculaire sévère ({data.perte_force_musculaire:.1f}%) des chaînes posturales antigravitaires")
            decisions.append("Augmenter l'intensité des séances sur ARED/CEVIS et supplémentation en acides aminés branchés (BCAA)")
        elif data.perte_force_musculaire >= 10.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Atrophie musculaire modérée ({data.perte_force_musculaire:.1f}%)")
            decisions.append("Augmenter la durée d'entraînement musculaire de 30 minutes par jour")
        else:
            diagnostic.append(f"NOMINAL : Force musculaire normale (Perte = {data.perte_force_musculaire:.1f}%)")

    # 3. Fréquence cardiaque au repos (Réf: Bio-Monitor CSA & Hexoskin)
    if data.frequence_cardiaque is not None:
        nb_analyses += 1
        if data.frequence_cardiaque > 105.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Tachycardie de repos marquée ({data.frequence_cardiaque:.0f} bpm) (stress, hypovolémie ou déconditionnement)")
            decisions.append("Enregistrement ECG complet sur Bio-Monitor et vérification de l'état d'hydratation")
        elif data.frequence_cardiaque < 50.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Bradycardie anormale au repos ({data.frequence_cardiaque:.0f} bpm)")
            decisions.append("Monitoring holter ECG continu et avis médical de vol")
        elif data.frequence_cardiaque > 90.0 or data.frequence_cardiaque < 55.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Fréquence cardiaque limite ({data.frequence_cardiaque:.0f} bpm)")
            decisions.append("Contrôle régulier du rythme cardiaque et repos")
        else:
            diagnostic.append(f"NOMINAL : Fréquence cardiaque normale ({data.frequence_cardiaque:.0f} bpm)")

    # 4. Pression artérielle systolique et diastolique (Réf: Bio-Monitor & Hémodynamique spatiale)
    if data.pression_systolique is not None or data.pression_diastolique is not None:
        nb_analyses += 1
        is_critique_bp = False
        is_warning_bp = False

        if data.pression_systolique is not None:
            if data.pression_systolique >= 140.0 or data.pression_systolique < 90.0:
                is_critique_bp = True
            elif data.pression_systolique > 125.0 or data.pression_systolique < 95.0:
                is_warning_bp = True

        if data.pression_diastolique is not None:
            if data.pression_diastolique >= 90.0 or data.pression_diastolique < 60.0:
                is_critique_bp = True
            elif data.pression_diastolique > 80.0:
                is_warning_bp = True

        sys_str = f"{int(data.pression_systolique)}" if data.pression_systolique is not None else "--"
        dia_str = f"{int(data.pression_diastolique)}" if data.pression_diastolique is not None else "--"
        bp_str = f"{sys_str}/{dia_str} mmHg"

        if is_critique_bp:
            nb_critique += 1
            if (data.pression_systolique and data.pression_systolique >= 140.0) or (data.pression_diastolique and data.pression_diastolique >= 90.0):
                diagnostic.append(f"CRITIQUE : Hypertension artérielle ({bp_str}) au repos (majoration de la pression céphalique)")
                decisions.append("Mise au repos, relaxation et surveillance ophtalmologique de la pression oculaire")
            else:
                diagnostic.append(f"CRITIQUE : Hypotension artérielle prononcée ({bp_str}) (perte de volume plasmatique en impesanteur)")
                decisions.append("Protocole de rétention volémique : prise de comprimés de sel et hydratation saline")
        elif is_warning_bp:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Pression artérielle limite ({bp_str})")
            decisions.append("Surveillance tensionnelle rapprochée et contrôle de l'hydratation")
        else:
            diagnostic.append(f"NOMINAL : Pression artérielle normale ({bp_str})")

    # 5. Saturation en oxygène SpO2 (Réf: Bio-Monitor CSA)
    if data.spo2 is not None:
        nb_analyses += 1
        if data.spo2 < 92.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Hypoxie sévère (SpO2 = {data.spo2:.1f}%) (oxygénation tissulaire compromise)")
            decisions.append("Administration immédiate d'oxygène pur au masque et vérification de la ppO2 cabine")
        elif data.spo2 < 96.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Hypoxie modérée (SpO2 = {data.spo2:.1f}%)")
            decisions.append("Contrôler la ventilation de cabine et le système de support de vie (ECLSS)")
        else:
            diagnostic.append(f"NOMINAL : Saturation en oxygène normale (SpO2 = {data.spo2:.1f}%)")

    # 6. Radiation journalière (Réf: Spectromètre neutronique CANS CSA & NASA SRAG)
    if data.dose_radiation_journaliere is not None:
        nb_analyses += 1
        if data.dose_radiation_journaliere > 5.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Alerte Tempête Solaire / Événement SPE ({data.dose_radiation_journaliere:.2f} mSv/j)")
            decisions.append("Repli immédiat dans l'abri blindé anti-radiations (Storm Shelter) et annulation des sorties EVA")
        elif data.dose_radiation_journaliere >= 1.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Flux radiatif élevé ({data.dose_radiation_journaliere:.2f} mSv/j) (passage SAA ou sursaut solaire)")
            decisions.append("Restreindre les activités dans les modules les moins blindés du vaisseau")
        else:
            diagnostic.append(f"NOMINAL : Exposition radiative quotidienne normale ({data.dose_radiation_journaliere:.2f} mSv/j)")

    # 7. Radiation cumulée de mission (Réf: Dosimètre Rad-Silk CSA & Limite 30 jours NASA 250 mSv)
    if data.dose_radiation_cumulee is not None:
        nb_analyses += 1
        if data.dose_radiation_cumulee > 250.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Dépassement du seuil mensuel de sécurité radiologique ({data.dose_radiation_cumulee:.1f} mSv > 250 mSv)")
            decisions.append("Bilan hématologique complet et révision du profil de mission avec le centre de contrôle")
        elif data.dose_radiation_cumulee >= 100.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Dose de radiation cumulée sous surveillance ({data.dose_radiation_cumulee:.1f} mSv)")
            decisions.append("Surveillance rapprochée des dosimètres personnels et bilan ophtalmologique (dépistage cataracte)")
        else:
            diagnostic.append(f"NOMINAL : Dose cumulée dans les normes de mission ({data.dose_radiation_cumulee:.1f} mSv)")

    # 8. Pression intraoculaire PIO (Réf: NASA HRP Risk of SANS)
    if data.pression_intraoculaire is not None:
        nb_analyses += 1
        if data.pression_intraoculaire > 24.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Hypertension oculaire sévère ({data.pression_intraoculaire:.1f} mmHg) (Risque élevé de syndrome SANS et d'œdème papillaire)")
            decisions.append("Séances quotidiennes de LBNP (pression négative bas du corps) et examen du fond d'œil à bord")
        elif data.pression_intraoculaire > 20.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Hypertension oculaire modérée ({data.pression_intraoculaire:.1f} mmHg) liée à la redistribution liquidienne vers la tête")
            decisions.append("Surveillance de l'acuité visuelle et test ophtalmologique à J+2")
        else:
            diagnostic.append(f"NOMINAL : Pression intraoculaire normale ({data.pression_intraoculaire:.1f} mmHg)")

    # 9. Température corporelle (Réf: Bio-Monitor CSA & Phénomène de 'Space Fever')
    if data.temperature_corporelle is not None:
        nb_analyses += 1
        if data.temperature_corporelle > 38.2:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Fièvre avérée ({data.temperature_corporelle:.1f} °C) (suspicion d'infection bactérienne/virale en milieu clos)")
            decisions.append("Prise d'antipyrétiques, isolement préventif et bilan microbiologique embarqué")
        elif data.temperature_corporelle < 36.0:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Hypothermie corporelle anormale ({data.temperature_corporelle:.1f} °C)")
            decisions.append("Réchauffement actif et vérification de la combinaison / température cabine")
        elif data.temperature_corporelle >= 37.6:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Élévation thermique modérée ({data.temperature_corporelle:.1f} °C) ('Space Fever' : altération de la convection en micropesanteur)")
            decisions.append("Ventilation d'air frais directe, hydratation fraîche et temporisation des efforts intenses")
        else:
            diagnostic.append(f"NOMINAL : Température corporelle normale ({data.temperature_corporelle:.1f} °C)")

    # 10. Densité urinaire USG (Réf: NASA HRP Risk of Renal Stone Formation)
    if data.densite_urinaire is not None:
        nb_analyses += 1
        if data.densite_urinaire > 1.028:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Déshydratation aiguë et urine hyperconcentrée (USG = {data.densite_urinaire:.3f}) (Risque critique de calculs rénaux)")
            decisions.append("Hyperhydratation immédiate (boire 1.5 L d'eau électrolytique) et prise de citrate de potassium")
        elif data.densite_urinaire >= 1.021:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Hydratation sous-optimale (USG = {data.densite_urinaire:.3f}) (urine concentrée)")
            decisions.append("Augmenter l'apport hydrique quotidien d'au moins 1 litre d'eau")
        else:
            diagnostic.append(f"NOMINAL : Hydratation et fonction rénale normales (USG = {data.densite_urinaire:.3f})")

    # 11. Pression partielle de CO2 cabine (Réf: NASA Spacecraft Air Quality & Space Headache)
    if data.co2_cabine is not None:
        nb_analyses += 1
        if data.co2_cabine > 4.5:
            nb_critique += 1
            diagnostic.append(f"CRITIQUE : Hypercapnie cabine toxique ({data.co2_cabine:.1f} mmHg) (CO2 élevé : céphalées sévères et altération cognitive)")
            decisions.append("Basculement d'urgence sur les cartouches de LiOH de secours et ventilation forcée des quartiers d'équipage")
        elif data.co2_cabine >= 3.0:
            nb_vigilance += 1
            diagnostic.append(f"ATTENTION : Niveau de CO2 cabine élevé ({data.co2_cabine:.1f} mmHg) (risque de céphalée spatiale 'space headache')")
            decisions.append("Vérification des épurateurs CDRA et optimisation de la circulation d'air")
        else:
            diagnostic.append(f"NOMINAL : Qualité d'air cabine normale ({data.co2_cabine:.1f} mmHg) (CO2 optimal)")

    # 12. Glycémie à jeun (Réf: NASA HRP Insulin Resistance & Metabolic Inflexibility in Microgravity)
    if data.glycemie is not None:
        nb_analyses += 1
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
    if nb_analyses == 0:
        statut_global = "AUCUNE DONNÉE FOURNIE"
        diagnostic.append("Aucune mesure n'a été transmise pour analyse.")
    elif nb_critique > 0:
        statut_global = "ALERTE ROUGE : DÉCISION MÉDICALE URGENTE"
    elif nb_vigilance > 0:
        statut_global = "VIGILANCE ORANGE : CONTRE-MESURES REQUISES"
    else:
        statut_global = "STATUT VERT : MESURES TRANSMISES CONFORMES"

    return {
        "statut_global": statut_global,
        "nb_mesures_analysees": nb_analyses,
        "nb_anomalies_critiques": nb_critique,
        "nb_anomalies_vigilance": nb_vigilance,
        "diagnostic": diagnostic,
        "decisions_recommandees": decisions
    }
