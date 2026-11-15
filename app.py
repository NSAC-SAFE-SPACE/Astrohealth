import requests

# URL de l'API (Cloud ou Local)
url_physics = "https://api-259997c9.fastapicloud.dev/predict"



def saisir_valeur(message: str):
    """
    Saisit une valeur numérique au clavier.
    Si l'astronaute appuie simplement sur Entrée (vide), retourne None pour ignorer la variable.
    """
    val = input(message).strip()
    if val == "":
        return None
    try:
        return float(val.replace(",", "."))
    except ValueError:
        print("   ⚠️ Valeur non reconnue -> mesure ignorée.")
        return None


def main():
    print("=" * 70)
    print("  PLATEFORME DE SUIVI DE LA SANTÉ PHYSIQUE DE L'ASTRONAUTE")
    print("  Compétition NASA Human Research Program (HRP)")
    print("=" * 70)
    print("\nVeuillez saisir les mesures relevées sur les appareils de bord.")
    print("👉 [CONSEIL] Appuyez simplement sur ENTRÉE pour ignorer une mesure non prise.\n")

    # Saisie des indicateurs par l'astronaute (tous optionnels)
    z_score = saisir_valeur("1. Z-Score densité osseuse (DEXA / ultrason) [Entrée = ignorer] : ")
    perte_force = saisir_valeur("2. Perte de force musculaire en % (dynamomètre) [Entrée = ignorer] : ")
    freq_cardiaque = saisir_valeur("3. Fréquence cardiaque au repos en bpm (Bio-Monitor) [Entrée = ignorer] : ")
    pression_syst = saisir_valeur("4. Pression artérielle systolique en mmHg (tensiomètre) [Entrée = ignorer] : ")
    pression_diast = saisir_valeur("5. Pression artérielle diastolique en mmHg (tensiomètre) [Entrée = ignorer] : ")
    spo2 = saisir_valeur("6. Saturation en oxygène SpO2 en % (oxymètre Bio-Monitor) [Entrée = ignorer] : ")
    dose_rad_jour = saisir_valeur("7. Dose journalière de radiation en mSv/jour (spectromètre CANS) [Entrée = ignorer] : ")
    dose_rad_cumul = saisir_valeur("8. Dose cumulée de radiation en mSv (dosimètre Rad-Silk) [Entrée = ignorer] : ")
    pio = saisir_valeur("9. Pression intraoculaire en mmHg (tonomètre / SANS) [Entrée = ignorer] : ")
    temperature = saisir_valeur("10. Température corporelle en °C (Bio-Monitor) [Entrée = ignorer] : ")
    densite_urinaire = saisir_valeur("11. Densité urinaire USG (réfractomètre / calcul rénal) [Entrée = ignorer] : ")
    co2_cabine = saisir_valeur("12. Pression partielle CO2 cabine en mmHg (capteur ambiance) [Entrée = ignorer] : ")
    glycemie = saisir_valeur("13. Glycémie à jeun en g/L ou mg/dL (glucomètre / capteur CGM) [Entrée = ignorer] : ")

    # Construction dynamique du payload : seules les variables renseignées sont transmises
    payload = {}
    if z_score is not None: payload["Z_Score"] = z_score
    if perte_force is not None: payload["perte_force_musculaire"] = perte_force
    if freq_cardiaque is not None: payload["frequence_cardiaque"] = freq_cardiaque
    if pression_syst is not None: payload["pression_systolique"] = pression_syst
    if pression_diast is not None: payload["pression_diastolique"] = pression_diast
    if spo2 is not None: payload["spo2"] = spo2
    if dose_rad_jour is not None: payload["dose_radiation_journaliere"] = dose_rad_jour
    if dose_rad_cumul is not None: payload["dose_radiation_cumulee"] = dose_rad_cumul
    if pio is not None: payload["pression_intraoculaire"] = pio
    if temperature is not None: payload["temperature_corporelle"] = temperature
    if densite_urinaire is not None: payload["densite_urinaire"] = densite_urinaire
    if co2_cabine is not None: payload["co2_cabine"] = co2_cabine
    if glycemie is not None: payload["glycemie"] = glycemie

    if not payload:
        print("\nℹ️ Aucune mesure n'a été saisie. Aucune analyse à effectuer.")
        return

    print(f"\n📡 Transmission de {len(payload)} mesure(s) à l'API de décision...")

    # Envoi des données à l'API de traitement et de décision (Cloud uniquement)
    reponse = None
    try:
        reponse = requests.post(url_physics, json=payload, timeout=15)
        reponse.raise_for_status()

    except requests.exceptions.ConnectionError:
        print("\n[Erreur] Impossible de joindre l'API en ligne.")
        print("Vérifiez votre connexion internet.")
        return
    except requests.exceptions.Timeout:
        print("\n[Erreur] L'API n'a pas répondu dans le délai imparti (15s).")
        return
    except requests.exceptions.HTTPError as e:
        print(f"\n[Erreur API] Code HTTP {reponse.status_code}")
        print(f"Détail : {reponse.text}")
        return
    except requests.exceptions.RequestException as e:
        print(f"\n[Erreur] Problème réseau inattendu : {e}")
        return

    if reponse and reponse.status_code == 200:
        prediction = reponse.json()

        print("\n" + "=" * 70)
        print("  RÉSULTATS DE L'ÉVALUATION ET DÉCISIONS MÉDICALES")
        print("=" * 70)

        statut = prediction.get("statut_global")
        if statut:
            print(f"\n>>> STATUT : {statut} <<<")
            print(f"Mesures analysées : {prediction.get('nb_mesures_analysees', 0)} | Anomalies critiques : {prediction.get('nb_anomalies_critiques', 0)} | Vigilance : {prediction.get('nb_anomalies_vigilance', 0)}")

        print("\n--- DIAGNOSTICS PHYSIOLOGIQUES (Variables évaluées) ---")
        for d in prediction.get("diagnostic", []):
            print(f"• {d}")

        decisions = prediction.get("decisions_recommandees", [])
        if decisions:
            print("\n--- DÉCISIONS & CONTRE-MESURES RECOMMANDÉES ---")
            for dec in decisions:
                print(f"➜ {dec}")
        else:
            print("\n--- DÉCISIONS & CONTRE-MESURES RECOMMANDÉES ---")
            print("➜ Aucune contre-mesure nécessaire : les paramètres mesurés sont conformes.")

        print("=" * 70)
    else:
        status_code = reponse.status_code if reponse else "Inconnu"
        text = reponse.text if reponse else "Pas de réponse"
        print(f"\nErreur reçue de l'API : {status_code} - {text}")


if __name__ == "__main__":
    main()
