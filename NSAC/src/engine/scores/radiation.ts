import type { MissionEnvironment, Status } from '../../types';
import thresholdsConfig from '../config/thresholds.json';
import { round } from './utils';

export interface RadiationHistoryPoint {
  date: string; // YYYY-MM-DD
  cumulativeDose_mSv: number;
  rate_mSv_day?: number;
}

export interface RadiationProjectionResult {
  currentCumulative_mSv: number;
  careerPrior_mSv: number;
  totalCareerDose_mSv: number;
  percentOfCareerLimit: number;
  careerLimit_mSv: number;
  status: Status;
  isSpike: boolean;
  spikeFactor: number;
  spikeMessage?: string;
  isDecreaseAnomaly: boolean;
  decreaseAnomalyMessage?: string;
  projected30d: {
    nominal: number;
    min: number;
    max: number;
  };
  projectedEndOfMission?: {
    daysRemaining: number;
    nominal: number;
    min: number;
    max: number;
  };
  explanation: string;
  actions: string[];
}

/**
 * Converts micro-Sieverts per hour (µSv/h) to milli-Sieverts per day (mSv/day)
 * 1 µSv/h * 24 h = 24 µSv/day = 0.024 mSv/day
 */
export function convertMicroSvPerHourToMilliSvPerDay(uSvH: number): number {
  return round((uSvH * 24) / 1000, 3);
}

/**
 * Pure projection and assessment of radiation dose & solar particle events
 */
export function projectRadiation(
  currentDose_mSv: number,
  environment: MissionEnvironment = 'spacecraft',
  historyLast14Days: RadiationHistoryPoint[] = [],
  careerPriorDose_mSv: number = 0,
  currentRate_mSv_day?: number,
  missionDaysRemaining?: number
): RadiationProjectionResult {
  const config = thresholdsConfig.radiation;
  const typicalRate =
    (config.typicalRates_mSv_day as Record<string, number>)[environment] || 1.0;
  const careerLimit = config.careerLimitTotal_mSv;

  const totalCareerDose = round(currentDose_mSv + careerPriorDose_mSv, 2);
  const percentOfLimit = round((totalCareerDose / careerLimit) * 100, 1);

  // 1. Plausibility check: Cumulative dose must never decrease!
  let isDecreaseAnomaly = false;
  let decreaseAnomalyMessage: string | undefined;

  if (historyLast14Days.length > 0) {
    const previousPoints = [...historyLast14Days].sort((a, b) => b.date.localeCompare(a.date));
    const latestPrev = previousPoints[0];
    if (currentDose_mSv < latestPrev.cumulativeDose_mSv) {
      isDecreaseAnomaly = true;
      decreaseAnomalyMessage = `Attention : la dose cumulée saisie (${currentDose_mSv} mSv) est inférieure à la précédente (${latestPrev.cumulativeDose_mSv} mSv). Réinitialisation ou changement du dosimètre ?`;
    }
  }

  // 2. Rate analysis (effective daily rate)
  let effectiveRate = currentRate_mSv_day;
  let observedMinRate = typicalRate * 0.8;
  let observedMaxRate = typicalRate * 1.2;

  if (historyLast14Days.length >= 2) {
    const sorted = [...historyLast14Days].sort((a, b) => a.date.localeCompare(b.date));
    const dailyIncrements: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const inc = sorted[i].cumulativeDose_mSv - sorted[i - 1].cumulativeDose_mSv;
      if (inc >= 0) dailyIncrements.push(inc);
    }
    if (dailyIncrements.length > 0) {
      const meanObserved = dailyIncrements.reduce((a, b) => a + b, 0) / dailyIncrements.length;
      if (effectiveRate === undefined) {
        effectiveRate = meanObserved;
      }
      observedMinRate = Math.min(...dailyIncrements, typicalRate * 0.7);
      observedMaxRate = Math.max(...dailyIncrements, typicalRate * 1.3);
    }
  }

  if (effectiveRate === undefined) {
    effectiveRate = typicalRate;
  }

  // 3. Solar flare / Radiation spike detection
  const spikeFactor = round(effectiveRate / Math.max(0.01, typicalRate), 1);
  let isSpike = false;
  let spikeMessage: string | undefined;
  let spikeStatus: Status | null = null;

  if (spikeFactor >= config.spikeMultipliers.contact_flight_surgeon) {
    isSpike = true;
    spikeStatus = 'contact_flight_surgeon';
    spikeMessage = `Pic radiatif extrême détecté (débit ×${spikeFactor} supérieur au débit nominal). Événement de particules solaires (SPE) majeur suspecté.`;
  } else if (spikeFactor >= config.spikeMultipliers.watch) {
    isSpike = true;
    spikeStatus = 'watch';
    spikeMessage =
      'Possible événement solaire détecté : rejoignez la zone la plus protégée selon votre protocole de mission.';
  }

  // 4. Cumulative status based on total career limit
  let cumulativeStatus: Status = 'normal';
  if (percentOfLimit >= config.thresholdsPercent.actionMax) {
    cumulativeStatus = 'contact_flight_surgeon';
  } else if (percentOfLimit >= config.thresholdsPercent.watchMax) {
    cumulativeStatus = 'action';
  } else if (percentOfLimit >= config.thresholdsPercent.normalMax) {
    cumulativeStatus = 'watch';
  }

  // Final status combines cumulative status and spike status
  let finalStatus: Status = cumulativeStatus;
  if (spikeStatus) {
    const hierarchy: Status[] = ['normal', 'watch', 'action', 'contact_flight_surgeon'];
    if (hierarchy.indexOf(spikeStatus) > hierarchy.indexOf(finalStatus)) {
      finalStatus = spikeStatus;
    }
  }

  // 5. Linear projection (30 days and end of mission)
  const nominal30d = round(currentDose_mSv + effectiveRate * 30, 1);
  const min30d = round(currentDose_mSv + observedMinRate * 30, 1);
  const max30d = round(currentDose_mSv + observedMaxRate * 30, 1);

  let projectedEndOfMission: RadiationProjectionResult['projectedEndOfMission'];
  if (missionDaysRemaining && missionDaysRemaining > 0) {
    projectedEndOfMission = {
      daysRemaining: missionDaysRemaining,
      nominal: round(currentDose_mSv + effectiveRate * missionDaysRemaining, 1),
      min: round(currentDose_mSv + observedMinRate * missionDaysRemaining, 1),
      max: round(currentDose_mSv + observedMaxRate * missionDaysRemaining, 1)
    };
  }

  // 6. Plain-language explanation and actions
  const actions: string[] = [];
  if (isDecreaseAnomaly && decreaseAnomalyMessage) {
    actions.push(decreaseAnomalyMessage);
  }

  if (isSpike) {
    if (spikeStatus === 'contact_flight_surgeon') {
      actions.push('Rejoindre immédiatement le module blindé anti-tempête solaire de bord (storm shelter).');
      actions.push('Avertir le contrôle de vol et le chirurgien de mission.');
    } else {
      actions.push('Rejoindre la zone la plus protégée selon votre protocole de mission.');
      actions.push('Consigner la lecture du dosimètre actif.');
    }
  } else {
    actions.push('Consigner régulièrement la lecture du dosimètre de mission.');
    actions.push('Respecter les procédures standards d’exposition.');
  }

  const explanation = isSpike
    ? spikeMessage!
    : `Dose cumulée totale : ${totalCareerDose} mSv (${percentOfLimit}% de la limite de carrière de référence de ${careerLimit} mSv). Débit courant : ${round(effectiveRate, 2)} mSv/jour.`;

  return {
    currentCumulative_mSv: currentDose_mSv,
    careerPrior_mSv: careerPriorDose_mSv,
    totalCareerDose_mSv: totalCareerDose,
    percentOfCareerLimit: percentOfLimit,
    careerLimit_mSv: careerLimit,
    status: finalStatus,
    isSpike,
    spikeFactor,
    spikeMessage,
    isDecreaseAnomaly,
    decreaseAnomalyMessage,
    projected30d: {
      nominal: nominal30d,
      min: min30d,
      max: max30d
    },
    projectedEndOfMission,
    explanation,
    actions
  };
}
