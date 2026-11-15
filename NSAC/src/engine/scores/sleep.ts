import type { SleepLog, ScoreResult, ScoreComponent, Status } from '../../types';
import thresholdsConfig from '../config/thresholds.json';
import { interpolatePiecewise, clamp, round } from './utils';

/**
 * Parses "HH:mm" string into minutes referenced from noon (12:00)
 * to smoothly handle bedtimes wrapping around midnight.
 * e.g., 22:30 -> 10.5h * 60 = 630 min
 *       01:15 -> 13.25h * 60 = 795 min
 */
export function bedtimeToMinutesFromNoon(bedtime: string): number {
  const [hStr, mStr] = bedtime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return 0;

  let totalMinutes = h * 60 + m;
  // If bedtime is in early morning (00:00 to 11:59), add 24h (1440 min)
  if (h < 12) {
    totalMinutes += 1440;
  }
  // Reference from 12:00 (720 min)
  return totalMinutes - 720;
}

/**
 * Calculates standard deviation of bedtimes over up to 7 nights
 */
export function calculateBedtimeStdMinutes(bedtimes: string[]): number {
  if (bedtimes.length < 2) return 0;
  const minutesList = bedtimes.map(bedtimeToMinutesFromNoon);
  const mean = minutesList.reduce((acc, v) => acc + v, 0) / minutesList.length;
  const variance =
    minutesList.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (minutesList.length - 1);
  return Math.sqrt(variance);
}

/**
 * Converts latency bucket to representative minutes for scoring
 */
export function latencyBucketToMinutes(bucket: SleepLog['latencyBucket']): number {
  switch (bucket) {
    case '<15':
      return 15;
    case '15-30':
      return 30;
    case '30-60':
      return 45;
    case '>60':
      return 90;
    default:
      return 30;
  }
}

export function calculateSleepScore(
  current: SleepLog,
  historyPast7Days: SleepLog[] = []
): ScoreResult {
  const config = thresholdsConfig.sleepScore;
  const components: ScoreComponent[] = [];
  const missingInputs: string[] = [];

  // 1. Duration (40% default)
  const durationPoints = config.durationCurve.map((d: any) => ({ x: d.hours, y: d.score }));
  const durationScore = round(clamp(interpolatePiecewise(current.hours, durationPoints), 0, 100), 1);
  components.push({
    key: 'duration',
    value: durationScore,
    weight: config.weights.duration,
    explanation: `${current.hours} h dormies (cible optimale : 7 à 9 h).`
  });

  // 2. Continuity (25% default) = mean of latency & awakenings
  const latencyMin = latencyBucketToMinutes(current.latencyBucket);
  const latencyPoints = config.latencyCurve.map((l: any) => ({ x: l.minutes, y: l.score }));
  const latencyScore = interpolatePiecewise(latencyMin, latencyPoints);

  const awakeningsPoints = config.awakeningsCurve.map((a: any) => ({ x: a.count, y: a.score }));
  const awakeningsScore = interpolatePiecewise(Math.max(1, current.awakenings), awakeningsPoints);

  const continuityScore = round(clamp((latencyScore + awakeningsScore) / 2, 0, 100), 1);
  components.push({
    key: 'continuity',
    value: continuityScore,
    weight: config.weights.continuity,
    explanation: `Endormissement en ${current.latencyBucket} min, ${current.awakenings} réveil(s) nocturne(s).`
  });

  // 3. Regularity (15% default)
  // Needs at least 3 recent nights (including current) to compute meaningful std
  const allRecentLogs = [current, ...historyPast7Days.filter((l) => l.id !== current.id)];
  let regularityScore: number | null = null;
  let hasEnoughRegularityData = false;

  if (allRecentLogs.length >= 3) {
    hasEnoughRegularityData = true;
    const stdMin = calculateBedtimeStdMinutes(allRecentLogs.map((l) => l.bedtime));
    const regularityPoints = config.regularityCurve.map((r: any) => ({ x: r.stdMin, y: r.score }));
    regularityScore = round(clamp(interpolatePiecewise(stdMin, regularityPoints), 0, 100), 1);
    components.push({
      key: 'regularity',
      value: regularityScore,
      weight: config.weights.regularity,
      explanation: `Régularité du coucher sur ${allRecentLogs.length} nuits (écart-type : ±${Math.round(stdMin)} min).`
    });
  } else {
    missingInputs.push('bedtime_regularity_7d');
  }

  // 4. Restfulness feeling (20% default): (restfulness - 1) * 25
  const restfulnessClamped = clamp(current.restfulness, 1, 5);
  const restfulnessScore = round((restfulnessClamped - 1) * 25, 1);
  components.push({
    key: 'restfulness',
    value: restfulnessScore,
    weight: config.weights.restfulness,
    explanation: `Ressenti subjectif au réveil noté à ${restfulnessClamped}/5.`
  });

  // Renormalize weights if regularity is missing
  let totalWeight = 0;
  for (const c of components) {
    totalWeight += c.weight;
  }

  let finalValue = 0;
  for (const c of components) {
    const normalizedWeight = c.weight / totalWeight;
    finalValue += c.value * normalizedWeight;
    // update displayed weight to normalized percentage
    c.weight = round(normalizedWeight, 3);
  }
  finalValue = round(clamp(finalValue, 0, 100), 0);

  // Status computation
  let status: Status = 'normal';
  if (finalValue >= config.status.normal) {
    status = 'normal';
  } else if (finalValue >= config.status.watch) {
    status = 'watch';
  } else {
    status = 'action';
  }

  // Special Critical Rule: Less than 4 hours for 3 consecutive nights -> contact_flight_surgeon
  // Sort logs by date descending
  const sortedLogs = [...allRecentLogs].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedLogs.length >= 3) {
    const last3 = sortedLogs.slice(0, 3);
    const allUnder4Hours = last3.every((l) => l.hours < config.criticalRule.maxConsecutiveHours);
    if (allUnder4Hours) {
      status = 'contact_flight_surgeon';
    }
  }

  const confidence = hasEnoughRegularityData ? 'complete' : 'partielle';
  const explanation =
    status === 'contact_flight_surgeon'
      ? 'Alerte critique : moins de 4 heures de sommeil sur 3 nuits consécutives. Dette de sommeil sévère.'
      : status === 'action'
      ? `Qualité du sommeil dégradée (${finalValue}/100). Récupération insuffisante.`
      : status === 'watch'
      ? `Sommeil modérément réparateur (${finalValue}/100), légères perturbations de continuité ou durée.`
      : `Excellente qualité de sommeil (${finalValue}/100), récupération neuromusculaire optimale.`;

  return {
    value: finalValue,
    components,
    confidence,
    missingInputs,
    status,
    explanation
  };
}
