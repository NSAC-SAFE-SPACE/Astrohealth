import requests

url_physics = "http://127.0.0.1:8000/predict"

print("=" * 65)
print("  PLATEFORME DE SUIVI DE LA SANTÉ PHYSIQUE DE L'ASTRONAUTE")
print("  Compétition NASA Human Research Program (HRP)")
print("=" * 65)
print("\nVeuillez saisir les mesures relevées sur les appareils de bord :\n")

# Saisie des indicateurs par l'astronaute à partir des appareils embarqués
z_score = float(input("1. Entrer le Z-Score de densité osseuse (DEXA / ultrason) : "))
perte_force = float(input("2. Entrer la perte de force musculaire en % (dynamomètre) : "))
freq_cardiaque = float(input("3. Entrer la fréquence cardiaque au repos en bpm (Bio-Monitor) : "))
pression_syst = float(input("4. Entrer la pression artérielle systolique en mmHg (tensiomètre) : "))
pression_diast = float(input("5. Entrer la pression artérielle diastolique en mmHg (tensiomètre) : "))
spo2 = float(input("6. Entrer la saturation en oxygène SpO2 en % (oxymètre Bio-Monitor) : "))
dose_rad_jour = float(input("7. Entrer la dose journalière de radiation en mSv/jour (spectromètre CANS) : "))
dose_rad_cumul = float(input("8. Entrer la dose cumulée de radiation en mSv (dosimètre Rad-Silk) : "))
pio = float(input("9. Entrer la pression intraoculaire en mmHg (tonomètre / SANS) : "))
temperature = float(input("10. Entrer la température corporelle centrale en °C (Bio-Monitor) : "))
densite_urinaire = float(input("11. Entrer la densité urinaire USG (réfractomètre / risque calcul rénal) : "))
co2_cabine = float(input("12. Entrer la pression partielle de CO2 cabine en mmHg (capteur d'ambiance) : "))
glycemie = float(input("13. Entrer la glycémie à jeun en g/L ou mg/dL (glucomètre / capteur CGM) : "))

payload = {
    "Z_Score": z_score,
    "perte_force_musculaire": perte_force,
    "frequence_cardiaque": freq_cardiaque,
    "pression_systolique": pression_syst,
    "pression_diastolique": pression_diast,
    "spo2": spo2,
    "dose_radiation_journaliere": dose_rad_jour,
    "dose_radiation_cumulee": dose_rad_cumul,
    "pression_intraoculaire": pio,
    "temperature_corporelle": temperature,
    "densite_urinaire": densite_urinaire,
    "co2_cabine": co2_cabine,
    "glycemie": glycemie
}

# Envoi des données à l'API de traitement et de décision
try:
    reponse = requests.post(url_physics, json=payload)
    prediction = reponse.json()

    print("\n" + "=" * 65)
    print("  RÉSULTATS DE L'ÉVALUATION ET DÉCISIONS MÉDICALES")
    print("=" * 65)

    print("\n--- DIAGNOSTICS PHYSIOLOGIQUES ---")
    for d in prediction.get("diagnostic", []):
        print(f"• {d}")

    print("\n--- DÉCISIONS & CONTRE-MESURES RECOMMANDÉES ---")
    for dec in prediction.get("decisions_recommandees", []):
        print(f"➜ {dec}")

    print("=" * 65)

except requests.exceptions.ConnectionError:
    print("\n[Erreur] Impossible de joindre l'API sur http://127.0.0.1:8000.")
    print("Veuillez d'abord démarrer l'API avec la commande : uvicorn main:app --reload")
