import requests

url_mental = "http://127.0.0.1:8000/predict"

print("=" * 65)
print("  PLATEFORME DE SUIVI DE LA SANTÉ PSYCHOLOGIQUE DE L'ASTRONAUTE")
print("  Module d'Évaluation du Stress et du Bien-être (Machine Learning)")
print("=" * 65)
print("\nVeuillez saisir vos indicateurs quotidiens :\n")

# Saisie des 8 indicateurs psychologiques et de bien-être par l'astronaute
stress_level = input(
    "1. Niveau de stress ('Low', 'Medium', 'High') : "
).capitalize()
happiness = int(
    input("2. Niveau de bonheur / moral (Échelle de 0 à 9) : ")
)
mood_score = input(
    "3. Humeur générale ('Positive', 'Neutral', 'Negative') : "
.capitalize()
)
sleep_quality = float(
    input("4. Qualité du sommeil (ex: 3.46) : ")
)
workload_perception = input(
    "5. Perception de la charge de travail ('Impossible', 'Possible', 'Easy') :"
    " "
).capitalize()
time_perception = input(
    "6. Perception du temps ('Slow', 'Normal', 'Fast') : "
).capitalize()
food = input(
    "7. Appréciation de la nourriture ('Bad', 'Neutral', 'Good') : "
).capitalize()
comm_earth = float(
    input("8. Temps de communication avec la Terre en minutes : ")
)

# Construction du payload respectant exactement les clés attendues par l'API
payload = {
    "Stress_Level": stress_level,
    "Happiness": happiness,
    "Mood_Score": mood_score,
    "Sleep_Quality": sleep_quality,
    "Workload Perception": workload_perception,
    "Time_Perception": time_perception,
    "Food": food,
    "Communication_with_Earth_mins": comm_earth,
}

# Envoi des données à l'API FastAPI de santé mentale
try:
  reponse = requests.post(url_mental, json=payload)

  if reponse.status_code == 200:
    prediction = reponse.json()

    print("\n" + "=" * 65)
    print("  RÉSULTATS DE L'ÉVALUATION PSYCHOLOGIQUE (IA)")
    print("=" * 65)
    print(f"\n> STATUT D'ALERTE : {prediction.get('statut_alerte')}")
    print(f"> BILAN GLOBAL : {prediction.get('bilan_global')}")
    print(
        f"> INDICE DE VULNÉRABILITÉ : "
        f"{prediction.get('indice_vulnerabilite_pourcent')}% (Score brut :"
        f" {prediction.get('score_vulnerabilite_brut')})\n"
    )

    print("-" * 65)
    print("ANALYSE PAR INDICATEUR :")
    for indicateur, etat in prediction.get(
        "analyse_par_indicateur", {}
    ).items():
      print(f"  * {indicateur.capitalize()} : {etat}")

    print("\n" + "-" * 65)
    print("RECOMMANDATIONS CIBLÉES :")
    for conseil in prediction.get("recommandations", []):
      print(f"  ➜ {conseil}")
    print("=" * 65)
  else:
    print(f"\n[Erreur de l'API] Code {reponse.status_code} : {reponse.text}")

except requests.exceptions.ConnectionError:
  print("\n[Erreur] Impossible de joindre l'API sur http://127.0.0.1:8000.")
  print("Veuillez d'abord démarrer l'API avec la commande : uvicorn app:app --reload")