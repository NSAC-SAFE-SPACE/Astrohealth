from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd

# Initialisation de l'application FastAPI pour la santé mentale
app = FastAPI(
    title="NASA Mental Health Decision API",
    description="API de suivi de la santé psychologique et d'aide à la décision pour astronautes (Random Forest ML)",
    version="2.0.0"
)

# Chargement du modèle de Machine Learning entraîné au démarrage du serveur
MODEL_PATH = "mental_stress_model.pkl"
try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    model = None
    print(f"ATTENTION : Impossible de charger le modèle .pkl : {e}")


# Modèle de données Pydantic correspondant aux 8 variables exactes de ton dataset
class MentalHealthData(BaseModel):
    Stress_Level: str                               # Ex: 'Low', 'Medium', 'High'
    Happiness: int                                  # Échelle de 0 à 9
    Mood_Score: str                                 # Ex: 'Positive', 'Neutral', 'Negative'
    Sleep_Quality: float                            # Échelle 0.0 à 62.53
    Workload_Perception: str = Field(..., alias="Workload Perception")  # Ex: 'Impossible', 'Possible', 'Easy'
    Time_Perception: str                            # Ex: 'Slow', 'Normal', 'Fast'
    Food: str                                       # Ex: 'Bad', 'Neutral', 'Good'
    Communication_with_Earth_mins: float            # En minutes

    class Config:
        populate_by_name = True


@app.get("/")
def welcome():
    return {
        "message": "Bienvenue sur l'API de suivi psychologique des astronautes (Astrohealth)",
        "version": "2.0.0",
        "modele_charge": model is not None,
        "indicateurs_surveilles": 8
    }


@app.post("/predict")
def predict_mental_state(data: MentalHealthData):
    if model is None:
        raise HTTPException(
            status_code=500, 
            detail="Le modèle de Machine Learning ('mental_stress_model.pkl') n'est pas chargé sur le serveur."
        )
    
    try:
        # 1. Préparation des données sous forme de dictionnaire respectant les noms de colonnes du DataFrame d'origine
        input_data = {
            "Stress_Level": data.Stress_Level,
            "Happiness": data.Happiness,
            "Mood_Score": data.Mood_Score,
            "Sleep_Quality": data.Sleep_Quality,
            "Workload Perception": data.Workload_Perception,
            "Time_Perception": data.Time_Perception,
            "Food": data.Food,
            "Communication_with_Earth_mins": data.Communication_with_Earth_mins
        }

        # 2. Conversion en DataFrame pour la prédiction par Scikit-Learn
        df_input = pd.DataFrame([input_data])
        
        # 3. Prédiction du score de vulnérabilité / dépression brut (échelle ~0 à 118)
        score_brut = float(model.predict(df_input)[0])
        
        # Conversion normalisée en pourcentage (0 à 100%)
        score_pourcent = min(100, max(0, round((score_brut / 118.0) * 100, 1)))

        # 4. Évaluation qualitative de l'état global
        if score_brut < 35:
            bilan_global = "Tout va bien à bord. Ton équilibre psychologique est solide."
            statut_alerte = "Optimal"
        elif score_brut < 75:
            bilan_global = "Zone de vigilance. La fatigue et la pression commencent à peser sur ton moral."
            statut_alerte = "Vigilance"
        else:
            bilan_global = "Alerte psychologique. Tu montres des signes nets de surcharge émotionnelle."
            statut_alerte = "Critique"

        # 5. Analyse par indicateur clé (catégorisation logique)
        categories = {}
        
        # Stress
        categories["stress"] = "Critique" if data.Stress_Level == "High" else ("Optimal" if data.Stress_Level == "Low" else "Vigilance")
        
        # Bonheur
        if data.Happiness >= 7:
            categories["bien_etre"] = "Optimal"
        elif data.Happiness >= 3:
            categories["bien_etre"] = "Vigilance"
        else:
            categories["bien_etre"] = "Critique"
            
        # Sommeil (seuils basés sur ton analyse statistique)
        if data.Sleep_Quality >= 6.92:
            categories["sommeil"] = "Optimal"
        elif data.Sleep_Quality >= 1.43:
            categories["sommeil"] = "Vigilance"
        else:
            categories["sommeil"] = "Critique"

        # 6. Génération des recommandations ciblées (en anglais pour l'application)
        conseils = []
        if data.Stress_Level == "High" or categories["stress"] == "Critique":
            conseils.append("Take 10 minutes away from screens to perform a cardiac coherence breathing exercise.")
        if categories["sommeil"] == "Critique":
            conseils.append("Dim your cabin lighting and schedule an extended rest period to recover.")
        if data.Happiness < 3 or score_brut >= 75 or data.Workload_Perception == "Impossible":
            conseils.append("Schedule a secure video call with loved ones or the ground psychological support team.")
            
        if not conseils:
            conseils.append("Keep up your current routine, psychological and physiological indicators are stable.")

        # 7. Retour de la réponse structurée en JSON pour le Back-End / Front-End
        return {
            "statut_alerte": statut_alerte,
            "bilan_global": bilan_global,
            "score_vulnerabilite_brut": round(score_brut, 2),
            "indice_vulnerabilite_pourcent": score_pourcent,
            "analyse_par_indicateur": categories,
            "recommandations": conseils
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail="fErreur lors du traitement de l inférence : {str(e)}")


# Lancement local (pour test)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)