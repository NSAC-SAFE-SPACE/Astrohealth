import type { Metric, Pattern, Status } from '../types';
import { escalateStatus } from './status';

export interface FusionInputMetrics {
  heartRate?: number;
  bpSys?: number;
  bpDia?: number;
  temperature?: number;
  sleepHours?: number;
  mood?: number;
  glucose?: number;
  exerciseMin?: number;
  boneLossPercent?: number;
  missionStartDate?: string;
}

export interface FusionResult {
  patterns: Pattern[];
  overallStatus: Status;
  dominantPattern?: Pattern;
  summaryFr: string;
  summaryEn: string;
  actionRecommendationsFr: string[];
  actionRecommendationsEn: string[];
}

/**
 * Evaluates combined physiological multi-metric patterns.
 */
export function detectPatterns(
  metrics: FusionInputMetrics,
  baselines: Partial<Record<keyof FusionInputMetrics, number>> = {}
): Pattern[] {
  const patterns: Pattern[] = [];

  const hr = metrics.heartRate;
  const temp = metrics.temperature;
  const sleep = metrics.sleepHours;
  const bpSys = metrics.bpSys;
  const bpDia = metrics.bpDia;
  const mood = metrics.mood;
  const glucose = metrics.glucose;
  const exercise = metrics.exerciseMin;
  const boneLoss = metrics.boneLossPercent;
  const missionStartTimestamp = metrics.missionStartDate ? Date.parse(metrics.missionStartDate) : Number.NaN;
  const elapsedMissionDays = Number.isFinite(missionStartTimestamp)
    ? Math.max(0, Math.floor((Date.now() - missionStartTimestamp) / 86400000))
    : 0;

  // 1. Fatigue or Impending Infection Pattern
  // Heart rate elevated + temperature elevated + sleep debt
  if (hr !== undefined && temp !== undefined && sleep !== undefined) {
    const hrElevated = hr >= 85 || (baselines.heartRate && hr > baselines.heartRate + 12);
    const tempElevated = temp >= 37.4;
    const sleepLow = sleep < 6.0;

    if (hrElevated && tempElevated && sleepLow) {
      let severity: Status = 'watch';
      if (temp >= 38.0 || hr >= 115) {
        severity = 'contact_flight_surgeon';
      } else if (temp >= 37.6 || hr >= 95) {
        severity = 'action';
      }

      patterns.push({
        id: 'fatigue_infection',
        severity,
        explanation:
          'Suspicion de fatigue aiguë ou début de syndrome infectieux : tachycardie associée à une hyperthermie relative et un déficit de sommeil.',
        involvedMetrics: ['heartRate', 'temperature', 'sleepHours']
      });
    }
  }

  // 2. Acute / Chronic Stress & Overload Pattern
  // Elevated BP + high HR + low mood
  if (bpSys !== undefined && hr !== undefined && mood !== undefined) {
    const bpElevated = bpSys >= 135 || (bpDia !== undefined && bpDia >= 88);
    const hrElevated = hr >= 85;
    const moodLow = mood <= 48;

    if (bpElevated && hrElevated && moodLow) {
      let severity: Status = 'watch';
      if (bpSys >= 155 || mood <= 28) {
        severity = 'action';
      }

      patterns.push({
        id: 'chronic_stress',
        severity,
        explanation:
          'Signes de stress aigu ou surcharge opérationnelle : tension et fréquence cardiaque accrues combinées à une baisse du moral.',
        involvedMetrics: ['bpSys', 'heartRate', 'mood']
      });
    }
  }

  // 3. Metabolic Imbalance Pattern
  // High glucose + low physical exercise
  if (glucose !== undefined && exercise !== undefined) {
    const glucoseHigh = glucose >= 115;
    const exerciseLow = exercise < 30;

    if (glucoseHigh && exerciseLow) {
      const severity: Status = glucose >= 140 ? 'action' : 'watch';
      patterns.push({
        id: 'metabolic_imbalance',
        severity,
        explanation:
          'Déséquilibre glycémique favorisé par un niveau d’activité musculaire insuffisant.',
        involvedMetrics: ['glucose', 'exerciseMin']
      });
    }
  }

  // 4. Accelerated Bone Demineralization Pattern
  // Low resistance exercise + prolonged microgravity duration or elevated bone loss
  if (exercise !== undefined) {
    const lowExercise = exercise < 30;
    const elevatedLoss = boneLoss !== undefined && boneLoss >= 2.5;
    const prolongedMission = elapsedMissionDays >= 30;

    if (lowExercise && (elevatedLoss || prolongedMission)) {
      const severity: Status = (boneLoss !== undefined && boneLoss >= 5.0) ? 'action' : 'watch';
      patterns.push({
        id: 'accelerated_bone_loss',
        severity,
        explanation:
          'Risque de déminéralisation osseuse accélérée en l’absence de charges de résistance suffisantes en microgravité.',
        involvedMetrics: ['boneProxy', 'exerciseMin']
      });
    }
  }

  return patterns;
}

const STATUS_RANK: Record<Status, number> = {
  normal: 0,
  watch: 1,
  action: 2,
  contact_flight_surgeon: 3
};

/**
 * Synthesizes overall astronaut health status by combining individual metric assessments and multi-metric fusion patterns.
 */
export function fuseHealthStatus(
  individualStatuses: Status[],
  patterns: Pattern[]
): FusionResult {
  let highestStatus: Status = 'normal';

  for (const st of individualStatuses) {
    if (STATUS_RANK[st] > STATUS_RANK[highestStatus]) {
      highestStatus = st;
    }
  }

  // Multi-indicator degradation rule: 2 or more watch statuses escalate baseline to action
  const watchCount = individualStatuses.filter((s) => s === 'watch').length;
  if (watchCount >= 2 && highestStatus === 'watch') {
    highestStatus = 'action';
  }

  // Patterns can escalate overall status
  let dominantPattern: Pattern | undefined;
  for (const pat of patterns) {
    if (STATUS_RANK[pat.severity] > STATUS_RANK[highestStatus]) {
      highestStatus = pat.severity;
      dominantPattern = pat;
    } else if (!dominantPattern && STATUS_RANK[pat.severity] === STATUS_RANK[highestStatus]) {
      dominantPattern = pat;
    }
  }

  let summaryFr = 'Tous les indicateurs biométriques et psychologiques sont nominaux.';
  let summaryEn = 'All biometric and psychological indicators are nominal.';
  const actionRecommendationsFr: string[] = [];
  const actionRecommendationsEn: string[] = [];

  if (highestStatus === 'contact_flight_surgeon') {
    summaryFr = 'Alerte médicale prioritaire : contact requis avec le chirurgien de vol.';
    summaryEn = 'Priority medical alert: immediate flight surgeon consultation requested.';
    actionRecommendationsFr.push('Émettre une communication prioritaire au centre de contrôle de mission.');
    actionRecommendationsEn.push('Issue a priority medical dispatch to mission control.');
  } else if (highestStatus === 'action') {
    if (dominantPattern) {
      summaryFr = dominantPattern.explanation;
      summaryEn = getPatternEnglishSummary(dominantPattern.id);
    } else {
      summaryFr = 'Dérives physiologiques détectées nécessitant des ajustements de protocole.';
      summaryEn = 'Physiological divergences detected requiring protocol adjustments.';
    }
    actionRecommendationsFr.push('Consulter les protocoles de contre-mesures recommandés dans Mon Corps.');
    actionRecommendationsEn.push('Review recommended countermeasure protocols in My Body.');
  } else if (highestStatus === 'watch') {
    if (dominantPattern) {
      summaryFr = dominantPattern.explanation;
      summaryEn = getPatternEnglishSummary(dominantPattern.id);
    } else {
      summaryFr = 'Légères variations observées, à surveiller sur les prochaines 24 heures.';
      summaryEn = 'Mild physiological variations observed, monitor closely over next 24 hours.';
    }
    actionRecommendationsFr.push('Maintenir le protocole d’hydratation et le cycle de sommeil.');
    actionRecommendationsEn.push('Maintain hydration protocol and scheduled sleep hygiene.');
  }

  return {
    patterns,
    overallStatus: highestStatus,
    dominantPattern,
    summaryFr,
    summaryEn,
    actionRecommendationsFr,
    actionRecommendationsEn
  };
}

function getPatternEnglishSummary(patternId: string): string {
  switch (patternId) {
    case 'fatigue_infection':
      return 'Suspected acute fatigue or early infection: elevated heart rate with relative hyperthermia and sleep deficit.';
    case 'chronic_stress':
      return 'Signs of acute stress or operational overload: elevated blood pressure and heart rate with reduced mood.';
    case 'metabolic_imbalance':
      return 'Metabolic imbalance associated with insufficient muscular exercise volume.';
    case 'accelerated_bone_loss':
      return 'Risk of accelerated bone demineralization due to insufficient resistance loading in microgravity.';
    default:
      return 'Multivariate physiological pattern detected.';
  }
}
