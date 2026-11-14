import type { ScoreResult, ScoreComponent, Status } from '../../types';
import thresholdsConfig from '../config/thresholds.json';
import { interpolatePiecewise, clamp, round } from './utils';

export interface CardioInput {
  sys: number; // mmHg
  hr: number;  // bpm
}

export interface AstronautProfileCardio {
  age: number;
  sex: 'male' | 'female';
}

/**
 * Calculates systolic blood pressure penalty (0-100)
 */
export function calculatePenSys(sys: number): number {
  if (sys <= 80) return 100;
  if (sys < 90) {
    // Interpolate between 80 (100) and 90 (0)
    return round(interpolatePiecewise(sys, [
      { x: 80, y: 100 },
      { x: 90, y: 0 }
    ]), 1);
  }
  if (sys >= 90 && sys <= 119) return 0;

  const points = (thresholdsConfig.cardioScore.sysPenalties as any[]).filter(
    (p) => p.sys >= 119
  ).map((p) => ({ x: p.sys, y: p.pen }));

  return round(clamp(interpolatePiecewise(sys, points), 0, 100), 1);
}

/**
 * Calculates resting heart rate penalty (0-100) with sex correction
 */
export function calculatePenHR(hr: number, sex: 'male' | 'female'): {
  penalty: number;
  correctedHr: number;
  isBradycardia: boolean;
} {
  const offset = sex === 'female' ? thresholdsConfig.cardioScore.femaleHrOffset : 0;
  const correctedHr = hr - offset;

  if (correctedHr < 50) {
    return {
      penalty: 20,
      correctedHr,
      isBradycardia: true
    };
  }

  const points = (thresholdsConfig.cardioScore.hrPenalties as any[]).map((p) => ({
    x: p.hr,
    y: p.pen
  }));

  const penalty = round(clamp(interpolatePiecewise(correctedHr, points), 0, 100), 1);
  return {
    penalty,
    correctedHr,
    isBradycardia: false
  };
}

/**
 * Calculates terrain risk factor based on age and sex
 */
export function calculateTerrainFactor(age: number, sex: 'male' | 'female'): number {
  const config = thresholdsConfig.cardioScore;
  let baseFactor = 1.0;

  for (const t of config.terrainAge) {
    if (age <= t.maxAge) {
      baseFactor = t.factor;
      break;
    }
  }

  const { maleAgeThreshold, femaleAgeThreshold, bonus } = config.terrainSexBonus;
  if ((sex === 'male' && age >= maleAgeThreshold) || (sex === 'female' && age >= femaleAgeThreshold)) {
    baseFactor += bonus;
  }

  return round(baseFactor, 2);
}

/**
 * Computes cardiovascular index (0-100) from recent measurements (average of up to 3)
 */
export function calculateCardioScore(
  recentMeasurements: CardioInput[],
  profile: AstronautProfileCardio
): ScoreResult & {
  status: Status;
  meanSys: number;
  meanHr: number;
  penSys: number;
  penHR: number;
  terrainFactor: number;
} {
  const config = thresholdsConfig.cardioScore;
  const missingInputs: string[] = [];

  if (recentMeasurements.length === 0) {
    return {
      value: 0,
      components: [],
      confidence: 'partielle',
      missingInputs: ['measurements_sys_hr'],
      status: 'watch',
      explanation: 'Aucune mesure récente de tension ou de fréquence cardiaque disponible.',
      meanSys: 0,
      meanHr: 0,
      penSys: 0,
      penHR: 0,
      terrainFactor: 1
    };
  }

  const n = Math.min(recentMeasurements.length, 3);
  const sample = recentMeasurements.slice(0, n);

  const meanSys = round(sample.reduce((sum, m) => sum + m.sys, 0) / n, 1);
  const meanHr = round(sample.reduce((sum, m) => sum + m.hr, 0) / n, 1);

  if (sample.length < 3) {
    missingInputs.push(`historique_3_mesures (calculé sur ${sample.length})`);
  }

  const penSys = calculatePenSys(meanSys);
  const { penalty: penHR, isBradycardia } = calculatePenHR(meanHr, profile.sex);
  const terrainFactor = calculateTerrainFactor(profile.age, profile.sex);

  // Combined score formula: clamp(100 - (0.6 * penSys + 0.4 * penHR) * terrainFactor, 0, 100)
  const weightedPenalty = config.weights.sys * penSys + config.weights.hr * penHR;
  const rawScore = 100 - weightedPenalty * terrainFactor;
  const finalScore = round(clamp(rawScore, 0, 100), 0);

  // Components breakdown for UI transparency
  const components: ScoreComponent[] = [
    {
      key: 'pression_arterielle',
      value: round(100 - penSys, 1),
      weight: config.weights.sys,
      explanation: `Pression systolique moyenne : ${meanSys} mmHg (pénalité : ${penSys}/100).`
    },
    {
      key: 'frequence_cardiaque',
      value: round(100 - penHR, 1),
      weight: config.weights.hr,
      explanation: `Fréquence cardiaque au repos moyenne : ${meanHr} bpm ${
        profile.sex === 'female' ? '(ajustement -3 bpm profil féminin)' : ''
      }${isBradycardia ? ' (bradycardie légère : peut être physiologique chez l’astronaute entraîné)' : ''}.`
    },
    {
      key: 'terrain_physiologique',
      value: round((2 - terrainFactor) * 50, 1), // Visualization scaling
      weight: 0,
      explanation: `Facteur d'âge et de sexe non modifiable : ×${terrainFactor} (${profile.age} ans, ${
        profile.sex === 'male' ? 'homme' : 'femme'
      }).`
    }
  ];

  // Status computation with critical guardrails
  let status: Status = 'normal';
  if (
    finalScore < config.status.action ||
    meanSys >= config.criticalThresholds.sysMax ||
    meanHr > config.criticalThresholds.hrMax
  ) {
    status = 'contact_flight_surgeon';
  } else if (finalScore < config.status.watch) {
    status = 'action';
  } else if (finalScore < config.status.normal) {
    status = 'watch';
  } else {
    status = 'normal';
  }

  const explanation =
    status === 'contact_flight_surgeon'
      ? `Alerte cardiovasculaire critique : score de ${finalScore}/100 ou seuil extrême atteint (${meanSys} mmHg / ${meanHr} bpm). Contact chirurgical requis.`
      : status === 'action'
      ? `Indice cardiovasculaire abaissé (${finalScore}/100). Charge hémodynamique élevée.`
      : status === 'watch'
      ? `Indice cardiovasculaire modéré (${finalScore}/100), légères élévations de tension ou du rythme de repos.`
      : `Indice cardiovasculaire optimal (${finalScore}/100). Réponse hémodynamique stable en microgravité.`;

  return {
    value: finalScore,
    components,
    confidence: sample.length >= 3 ? 'complete' : 'partielle',
    missingInputs,
    status,
    explanation,
    meanSys,
    meanHr,
    penSys,
    penHR,
    terrainFactor
  };
}
