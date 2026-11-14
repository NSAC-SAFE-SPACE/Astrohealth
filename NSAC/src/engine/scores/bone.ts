import type { BoneDensityRecord, BoneSite, ScoreResult, ScoreComponent, Status } from '../../types';
import thresholdsConfig from '../config/thresholds.json';
import { round } from './utils';

export const DAYS_PER_MONTH = 30.4375;

export interface SingleSiteBoneLossResult {
  site: BoneSite;
  initialValue: number;
  currentValue: number;
  lossPercent: number; // e.g. 3.4%
  ratePerMonth: number; // %/month
  monthsElapsed: number;
  status: Status;
  isNoise: boolean;
  explanation: string;
}

/**
 * Computes bone loss for a single skeletal site.
 * Strictly verifies identical site and method!
 */
export function calculateSiteBoneLoss(
  baseline: BoneDensityRecord,
  current: BoneDensityRecord
): SingleSiteBoneLossResult {
  if (baseline.site !== current.site) {
    throw new Error(
      `Incompatibilité anatomique : impossible de comparer le site ${baseline.site} avec ${current.site}.`
    );
  }

  if (baseline.method !== current.method) {
    throw new Error(
      `Incompatibilité méthodologique : impossible de comparer une mesure ${baseline.method.toUpperCase()} avec ${current.method.toUpperCase()}.`
    );
  }

  if (baseline.valueGcm2 <= 0) {
    throw new Error('Valeur de densité osseuse initiale invalide.');
  }

  const lossPercent = round(((baseline.valueGcm2 - current.valueGcm2) / baseline.valueGcm2) * 100, 2);

  const tBase = new Date(baseline.date).getTime();
  const tCurr = new Date(current.date).getTime();
  const daysDiff = Math.max(1, (tCurr - tBase) / (1000 * 60 * 60 * 24));
  const monthsElapsed = round(daysDiff / DAYS_PER_MONTH, 1);
  const ratePerMonth = round(lossPercent / Math.max(0.2, monthsElapsed), 2);

  const config = thresholdsConfig.bone;
  const isNoise = Math.abs(lossPercent) <= config.measurementNoise;

  let status: Status = 'normal';
  if (lossPercent > config.lossThresholds.actionMax || ratePerMonth > config.ratePerMonthCritical) {
    status = 'contact_flight_surgeon';
  } else if (lossPercent > config.lossThresholds.watchMax) {
    status = 'action';
  } else if (lossPercent > config.lossThresholds.normalMax) {
    status = 'watch';
  } else {
    status = 'normal';
  }

  let explanation = '';
  if (isNoise) {
    explanation = `Variation de ${lossPercent}% sur ${monthsElapsed} mois : située dans la marge d'incertitude de mesure (±${config.measurementNoise}%). Densité stable.`;
  } else if (status === 'contact_flight_surgeon') {
    explanation = `Perte osseuse accélérée critique : -${lossPercent}% (-${ratePerMonth}%/mois). Déminéralisation supérieure aux seuils de sécurité de vol.`;
  } else if (status === 'action') {
    explanation = `Perte osseuse significative : -${lossPercent}% (-${ratePerMonth}%/mois). Renforcement des contre-mesures requis.`;
  } else if (status === 'watch') {
    explanation = `Légère tendance à la déminéralisation osseuse : -${lossPercent}%.`;
  } else {
    explanation = `Densité osseuse préservée à ce site.`;
  }

  return {
    site: baseline.site,
    initialValue: baseline.valueGcm2,
    currentValue: current.valueGcm2,
    lossPercent,
    ratePerMonth,
    monthsElapsed,
    status,
    isNoise,
    explanation
  };
}

/**
 * Computes multi-site bone loss assessment
 */
export function calculateMultiSiteBoneLoss(
  baselineRecords: BoneDensityRecord[],
  currentRecords: BoneDensityRecord[]
): ScoreResult & {
  meanLossPercent: number;
  meanRatePerMonth: number;
  siteResults: SingleSiteBoneLossResult[];
} {
  const siteResults: SingleSiteBoneLossResult[] = [];
  const missingInputs: string[] = [];

  const baselineMap = new Map<string, BoneDensityRecord>();
  for (const b of baselineRecords) {
    baselineMap.set(b.site, b);
  }

  for (const curr of currentRecords) {
    const base = baselineMap.get(curr.site);
    if (!base) {
      missingInputs.push(`baseline_${curr.site}`);
      continue;
    }

    try {
      const res = calculateSiteBoneLoss(base, curr);
      siteResults.push(res);
    } catch (e: any) {
      missingInputs.push(`error_${curr.site}: ${e.message}`);
    }
  }

  if (siteResults.length === 0) {
    return {
      value: 0,
      components: [],
      confidence: 'partielle',
      missingInputs: ['densite_initiale_et_actuelle'],
      status: 'normal',
      explanation: 'Aucune paire de mesures comparable disponible pour évaluer la masse osseuse.',
      meanLossPercent: 0,
      meanRatePerMonth: 0,
      siteResults: []
    };
  }

  const meanLoss = round(
    siteResults.reduce((acc, r) => acc + r.lossPercent, 0) / siteResults.length,
    2
  );
  const meanRate = round(
    siteResults.reduce((acc, r) => acc + r.ratePerMonth, 0) / siteResults.length,
    2
  );

  const worstStatus = siteResults.reduce<Status>((acc, r) => {
    const order: Status[] = ['normal', 'watch', 'action', 'contact_flight_surgeon'];
    return order.indexOf(r.status) > order.indexOf(acc) ? r.status : acc;
  }, 'normal');

  const components: ScoreComponent[] = siteResults.map((r) => ({
    key: `perte_${r.site}`,
    value: r.lossPercent,
    weight: round(1 / siteResults.length, 2),
    explanation: `${r.site} : ${r.lossPercent > 0 ? '-' : '+'}${r.lossPercent}% (${r.ratePerMonth}%/mois). ${r.explanation}`
  }));

  const allMainSitesCovered = ['lumbar_spine', 'total_hip'].every((s) =>
    siteResults.some((r) => r.site === s)
  );

  return {
    value: meanLoss, // Here value represents the cumulative loss %
    components,
    confidence: allMainSitesCovered ? 'complete' : 'partielle',
    missingInputs,
    status: worstStatus,
    explanation:
      worstStatus === 'contact_flight_surgeon'
        ? `Alerte perte osseuse : perte moyenne de ${meanLoss}% (${meanRate}%/mois). Déminéralisation rapide.`
        : worstStatus === 'action'
        ? `Perte osseuse active (${meanLoss}%, vitesse ${meanRate}%/mois). Protocole de charge à adapter.`
        : worstStatus === 'watch'
        ? `Légère perte osseuse (${meanLoss}%), surveillance de la charge squelettique conseillée.`
        : `Masse osseuse remarquablement préservée (variation moyenne ${meanLoss}% dans la marge de mesure).`,
    meanLossPercent: meanLoss,
    meanRatePerMonth: meanRate,
    siteResults
  };
}
