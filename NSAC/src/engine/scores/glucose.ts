import type { GlucoseContext, Status, Assessment } from '../../types';
import thresholdsConfig from '../config/thresholds.json';
import { round } from './utils';
import { escalateStatus, BaselineStats } from '../status';

export const GLUCOSE_MOLAR_MASS_FACTOR = 18.016;

/**
 * Converts blood glucose from mg/dL to mmol/L
 */
export function toMmolL(mgDl: number): number {
  return round(mgDl / GLUCOSE_MOLAR_MASS_FACTOR, 2);
}

/**
 * Converts blood glucose from mmol/L to mg/dL
 */
export function toMgDl(mmolL: number): number {
  return Math.round(mmolL * GLUCOSE_MOLAR_MASS_FACTOR);
}

/**
 * Checks plausibility of a blood glucose measurement.
 * Never silently deletes! Flags anomaly for prompt re-measurement.
 */
export function checkGlucosePlausibility(valueMgDl: number): {
  isPlausibilityAnomaly: boolean;
  warningMessage?: string;
} {
  const { min, max, warningMessage } = thresholdsConfig.glucose.plausibility;
  if (valueMgDl < min || valueMgDl > max) {
    return {
      isPlausibilityAnomaly: true,
      warningMessage: `${warningMessage} (${valueMgDl} mg/dL est physiologiquement inhabituel).`
    };
  }
  return { isPlausibilityAnomaly: false };
}

/**
 * Assesses blood glucose given context (fasting / post_meal / random)
 */
export function assessGlucose(
  valueMgDl: number,
  context: GlucoseContext = 'fasting',
  baseline?: BaselineStats,
  unit: 'mg/dL' | 'mmol/L' = 'mg/dL'
): Assessment & { isPlausibilityAnomaly: boolean } {
  const glucoseConfig = thresholdsConfig.glucose as Record<string, any>;
  const ctxRules = glucoseConfig[context] || glucoseConfig.fasting;
  const plausibility = checkGlucosePlausibility(valueMgDl);

  let rawStatus: Status = 'normal';

  // Critical checks (contact flight surgeon)
  if (valueMgDl < ctxRules.criticalLow || valueMgDl >= ctxRules.criticalHigh) {
    rawStatus = 'contact_flight_surgeon';
  } else if (valueMgDl >= ctxRules.actionHigh || valueMgDl < ctxRules.actionLow) {
    rawStatus = 'action';
  } else if (
    (ctxRules.watch && valueMgDl >= ctxRules.watch.min && valueMgDl <= ctxRules.watch.max) ||
    (valueMgDl > ctxRules.normal.max)
  ) {
    rawStatus = 'watch';
  } else if (valueMgDl >= ctxRules.normal.min && valueMgDl <= ctxRules.normal.max) {
    rawStatus = 'normal';
  } else {
    rawStatus = 'watch';
  }

  let finalStatus = rawStatus;
  let zScore: number | undefined;
  const drivers: string[] = [];

  // Baseline deviation check
  if (baseline && baseline.std > 0) {
    zScore = (valueMgDl - baseline.mean) / baseline.std;
    if (Math.abs(zScore) > 2.0) {
      finalStatus = escalateStatus(finalStatus, 1);
      drivers.push(
        `Écart significatif à votre référence habituelle (|z| = ${zScore.toFixed(1)}, baseline: ${round(baseline.mean, 1)} mg/dL).`
      );
    }
  }

  const actions: string[] = [];
  const displayVal = unit === 'mmol/L' ? `${toMmolL(valueMgDl)} mmol/L` : `${valueMgDl} mg/dL`;
  const contextLabel =
    context === 'fasting' ? 'à jeun' : context === 'post_meal' ? 'après repas (2 h)' : 'aléatoire/autre';

  let explanation = '';

  if (plausibility.isPlausibilityAnomaly) {
    explanation = `${plausibility.warningMessage} Lecture actuelle : ${displayVal} (${contextLabel}).`;
    actions.push('Nettoyer le site de prélèvement et effectuer une nouvelle mesure immédiate de contrôle.');
    actions.push('Vérifier la calibration de la bandelette et du glucomètre.');
  } else {
    switch (finalStatus) {
      case 'normal':
        explanation = `Glycémie optimale ${contextLabel} (${displayVal}). Métabolisme énergétique stable.`;
        actions.push('Conserver le programme nutritionnel et d’hydratation prévu.');
        break;
      case 'watch':
        explanation = `Légère variation glycémique ${contextLabel} (${displayVal}).`;
        actions.push('Vérifier l’apport en glucides du dernier repas et le niveau d’activité physique.');
        actions.push('Reprendre une mesure au prochain créneau prévu.');
        break;
      case 'action':
        explanation = `Glycémie significativement hors des cibles ${contextLabel} (${displayVal}).`;
        if (valueMgDl < ctxRules.actionLow) {
          actions.push('Hypoglycémie modérée : consommer 15 g de glucides simples (ex: collation de mission).');
          actions.push('Contrôler à nouveau la glycémie après 15 minutes.');
        } else {
          actions.push('Hyperglycémie : veiller à une bonne hydratation sans sucre.');
          actions.push('Vérifier le journal d’exercice et de ration alimentaire.');
        }
        break;
      case 'contact_flight_surgeon':
        explanation = `Valeur glycémique critique (${displayVal}). Risque métabolique aigu.`;
        actions.push('Contacter immédiatement le médecin de vol / chirurgien de bord.');
        actions.push('Préparer le protocole d’urgence glycémique de bord.');
        break;
    }
  }

  return {
    metric: 'glucose',
    status: finalStatus,
    value: valueMgDl,
    baselineDeviation: zScore,
    explanation,
    actions,
    drivers,
    isPlausibilityAnomaly: plausibility.isPlausibilityAnomaly,
    baseline: baseline ? { mean: baseline.mean, std: baseline.std, zScore } : undefined
  };
}
