import type { CouplingLink, ForecastDriver, Metric } from '../../types';
import rawCouplingData from './coupling.json';

export const COUPLING_LINKS: CouplingLink[] = rawCouplingData as CouplingLink[];

/**
 * Returns all direct parent links influencing a given target metric.
 */
export function getParents(targetMetric: string): CouplingLink[] {
  const normalizedTarget = normalizeMetricName(targetMetric);
  return COUPLING_LINKS.filter(
    (link) => normalizeMetricName(link.to) === normalizedTarget
  );
}

/**
 * Returns all direct child links influenced by a given source metric.
 */
export function getChildren(sourceMetric: string): CouplingLink[] {
  const normalizedSource = normalizeMetricName(sourceMetric);
  return COUPLING_LINKS.filter(
    (link) => normalizeMetricName(link.from) === normalizedSource
  );
}

export interface ParentObservation {
  value: number;
  baselineMean?: number;
  unit?: string;
  daysDuration?: number; // duration of deviation in days (e.g. 3 days of short sleep)
}

export type ParentContextMap = Record<string, ParentObservation | number>;

/**
 * Normalizes metric alias variations (e.g., bpSys vs bloodPressure, sleepHours vs sleep)
 */
export function normalizeMetricName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'bpsys' || lower === 'bpdia' || lower === 'bloodpressure' || lower === 'bp') {
    return 'bloodPressure';
  }
  if (lower === 'sleephours' || lower === 'sleep') {
    return 'sleep';
  }
  if (lower === 'heartrate' || lower === 'hr') {
    return 'heartRate';
  }
  if (lower === 'exercisemin' || lower === 'exercise') {
    return 'exercise';
  }
  if (lower === 'bonemass' || lower === 'boneproxy' || lower === 'bonedensity') {
    return 'boneMass';
  }
  return name;
}

/**
 * Nominal reference baselines for coupling calculations when individual baseline is missing
 */
const NOMINAL_PARENT_BASELINES: Record<string, { nominal: number; unit: string; maxDiff: number; defaultImpactScale: number }> = {
  sleep: { nominal: 7.5, unit: 'h', maxDiff: 3.5, defaultImpactScale: 8 }, // e.g. up to 8 bpm or 8 mmHg
  exercise: { nominal: 60, unit: 'min', maxDiff: 45, defaultImpactScale: 6 },
  mood: { nominal: 70, unit: '/100', maxDiff: 40, defaultImpactScale: 5 },
  temperature: { nominal: 36.8, unit: '°C', maxDiff: 1.5, defaultImpactScale: 10 }, // ~8-10 bpm per °C
  heartRate: { nominal: 70, unit: 'bpm', maxDiff: 30, defaultImpactScale: 6 },
  bloodPressure: { nominal: 115, unit: 'mmHg', maxDiff: 35, defaultImpactScale: 6 },
  inflammation: { nominal: 1.0, unit: 'mg/L', maxDiff: 10.0, defaultImpactScale: 8 }
};

/**
 * Computes individual coupling drivers and their numeric contributions for a target metric.
 */
export function calculateDrivers(
  targetMetric: string,
  parentsContext: ParentContextMap = {},
  horizonDays: number = 7
): { totalDelta: number; drivers: ForecastDriver[] } {
  const parents = getParents(targetMetric);
  const drivers: ForecastDriver[] = [];
  let totalDelta = 0;

  for (const link of parents) {
    const fromKey = link.from;
    const rawObs = parentsContext[fromKey] ?? parentsContext[normalizeMetricName(fromKey)];
    if (rawObs === undefined) continue;

    const obs: ParentObservation = typeof rawObs === 'number' ? { value: rawObs } : rawObs;
    const nominalInfo = NOMINAL_PARENT_BASELINES[fromKey] || NOMINAL_PARENT_BASELINES[normalizeMetricName(fromKey)];
    if (!nominalInfo) continue;

    const baseline = obs.baselineMean ?? nominalInfo.nominal;
    const diff = obs.value - baseline;

    // Negligible variation filter (< 5% deviation)
    if (Math.abs(diff) < 0.05 * Math.abs(nominalInfo.maxDiff)) {
      continue;
    }

    const direction = link.sign === '+' ? 1 : -1;
    // Normalized ratio of deviation (-1 to +1)
    const normalizedRatio = Math.max(-1.5, Math.min(1.5, diff / nominalInfo.maxDiff));

    // Dynamic horizon factor: acute lag (<=1 day) is fully active at 24h; chronic accumulation up to 1.5x at 30d
    const horizonFactor = horizonDays >= 7
      ? Math.min(1.5, Math.pow(horizonDays / 7, 0.35))
      : 1.0;

    // Numeric delta impact
    const impact = Number((direction * normalizedRatio * link.strength * nominalInfo.defaultImpactScale * horizonFactor).toFixed(1));

    if (Math.abs(impact) < 0.3) continue;

    totalDelta += impact;

    // Format plain language explanations in FR and EN
    const formatted = formatDriverExplanation(link, obs.value, baseline, impact, nominalInfo.unit);

    drivers.push({
      name: link.from,
      metric: link.from as Metric,
      impactValue: impact,
      unit: getTargetUnit(targetMetric),
      explanation: formatted.fr,
      explanationEn: formatted.en
    });
  }

  return { totalDelta: Number(totalDelta.toFixed(1)), drivers };
}

function getTargetUnit(metric: string): string {
  const m = normalizeMetricName(metric);
  switch (m) {
    case 'heartRate': return 'bpm';
    case 'bloodPressure': return 'mmHg';
    case 'glucose': return 'mg/dL';
    case 'temperature': return '°C';
    case 'boneMass': return '%';
    case 'mood': return 'pts';
    default: return '';
  }
}

function formatDriverExplanation(
  link: CouplingLink,
  actualValue: number,
  baseline: number,
  impact: number,
  parentUnit: string
): { fr: string; en: string } {
  const isPositiveImpact = impact > 0;
  const absImpact = Math.abs(impact);
  const from = normalizeMetricName(link.from);
  const to = normalizeMetricName(link.to);

  if (from === 'sleep') {
    if (actualValue < baseline) {
      const hoursDeficit = (baseline - actualValue).toFixed(1);
      return {
        fr: `Votre sommeil court (déficit de ${hoursDeficit} h) fait ${isPositiveImpact ? 'monter' : 'baisser'} ${getFrenchTargetName(to)} d'environ ${absImpact} ${getTargetUnit(to)}.`,
        en: `Your shorter sleep (${hoursDeficit} h deficit) pushes ${getEnglishTargetName(to)} ${isPositiveImpact ? 'up' : 'down'} by approx ${absImpact} ${getTargetUnit(to)}.`
      };
    } else {
      return {
        fr: `Votre sommeil réparateur récent stabilise favorablement ${getFrenchTargetName(to)} (${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`,
        en: `Your recent restorative sleep favorably stabilizes ${getEnglishTargetName(to)} (${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`
      };
    }
  }

  if (from === 'exercise') {
    if (to === 'boneMass') {
      if (actualValue >= 45) {
        return {
          fr: `L'exercice de résistance quotidien régulier (${actualValue} min) ralentit significativement le déclin osseux projected (${impact > 0 ? '+' : ''}${impact} %).`,
          en: `Daily resistance exercise (${actualValue} min) significantly counters projected bone loss (${impact > 0 ? '+' : ''}${impact} %).`
        };
      } else {
        return {
          fr: `La charge d'exercice de résistance insuffisante accélère la déminéralisation osseuse (${impact} %).`,
          en: `Insufficient resistance training volume accelerates bone demineralization (${impact} %).`
        };
      }
    }

    if (actualValue < baseline) {
      return {
        fr: `La baisse d'activité physique contribue à élever ${getFrenchTargetName(to)} de ${absImpact} ${getTargetUnit(to)}.`,
        en: `Reduced physical activity contributes to raising ${getEnglishTargetName(to)} by ${absImpact} ${getTargetUnit(to)}.`
      };
    } else {
      return {
        fr: `L'entraînement régulier (${actualValue} min/j) optimise ${getFrenchTargetName(to)} (${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`,
        en: `Regular training (${actualValue} min/day) optimizes ${getEnglishTargetName(to)} (${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`
      };
    }
  }

  if (from === 'temperature' && to === 'heartRate') {
    return {
      fr: `L'élévation thermique corporelle (${actualValue.toFixed(1)} °C) accélère le rythme cardiaque d'environ ${absImpact} bpm.`,
      en: `Core temperature elevation (${actualValue.toFixed(1)} °C) accelerates resting heart rate by approx ${absImpact} bpm.`
    };
  }

  if (from === 'mood') {
    return {
      fr: `Le niveau de bien-être mental influe sur ${getFrenchTargetName(to)} (${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`,
      en: `Psychological well-being status impacts ${getEnglishTargetName(to)} (${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`
    };
  }

  // Generic fallback
  return {
    fr: `${link.rationale} (effet estimé : ${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`,
    en: `${link.rationaleEn || link.rationale} (estimated impact: ${impact > 0 ? '+' : ''}${impact} ${getTargetUnit(to)}).`
  };
}

function getFrenchTargetName(target: string): string {
  switch (target) {
    case 'heartRate': return 'votre fréquence cardiaque';
    case 'bloodPressure': return 'votre pression artérielle';
    case 'glucose': return 'votre glycémie';
    case 'boneMass': return 'votre densité osseuse';
    case 'mood': return 'votre score d’humeur';
    case 'temperature': return 'votre température';
    default: return target;
  }
}

function getEnglishTargetName(target: string): string {
  switch (target) {
    case 'heartRate': return 'your resting heart rate';
    case 'bloodPressure': return 'your blood pressure';
    case 'glucose': return 'your blood glucose';
    case 'boneMass': return 'your bone density';
    case 'mood': return 'your mood score';
    case 'temperature': return 'your body temperature';
    default: return target;
  }
}
