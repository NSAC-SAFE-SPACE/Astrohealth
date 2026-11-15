import type { Metric, Status, Assessment } from '../types';
import thresholdsConfig from './config/thresholds.json';
import { BODY_MEASURE_CONFIG, BODY_MEASURE_FIELDS, getBodyMeasureStatus } from './config/bodyMeasures';

export interface BaselineStats {
  mean: number;
  std: number;
  n?: number;
}

interface ThresholdRange {
  min?: number;
  max?: number;
  hypotension?: number;
}

interface MetricThresholds {
  normal?: ThresholdRange;
  watch?: ThresholdRange;
  action?: ThresholdRange;
  contact_flight_surgeon?: ThresholdRange;
  criticalLow?: number;
  criticalHigh?: number;
  actionLow?: number;
  actionHigh?: number;
  unit?: string;
}

const STATUS_HIERARCHY: Status[] = ['normal', 'watch', 'action', 'contact_flight_surgeon'];

export function escalateStatus(status: Status, levels: number = 1): Status {
  const currentIndex = STATUS_HIERARCHY.indexOf(status);
  const newIndex = Math.min(currentIndex + levels, STATUS_HIERARCHY.length - 1);
  return STATUS_HIERARCHY[newIndex];
}

function isWithinRange(value: number, range?: ThresholdRange): boolean {
  if (!range) return false;
  return value >= (range.min ?? Number.NEGATIVE_INFINITY) &&
    value <= (range.max ?? Number.POSITIVE_INFINITY);
}

function reachesContactThreshold(value: number, thresholds: MetricThresholds): boolean {
  const contact = thresholds.contact_flight_surgeon;
  if (!contact) return false;

  if (contact.hypotension !== undefined && value <= contact.hypotension) return true;

  if (contact.min !== undefined && contact.max !== undefined) {
    const normal = thresholds.normal;
    const boundsSurroundNormal = normal?.min !== undefined &&
      normal.max !== undefined &&
      contact.min <= normal.min &&
      contact.max >= normal.max;

    return boundsSurroundNormal
      ? value <= contact.min || value >= contact.max
      : isWithinRange(value, contact);
  }

  return (contact.min !== undefined && value <= contact.min) ||
    (contact.max !== undefined && value >= contact.max);
}

/**
 * Assesses an individual numeric biometric metric against thresholds and optional baseline
 */
export function assessMeasurement(
  metric: Metric,
  value: number,
  baseline?: BaselineStats,
  concurrentDegradedIndicatorsCount: number = 0,
  context?: string
): Assessment {
  const bodyField = BODY_MEASURE_FIELDS.find((field) => field.metric === metric);
  if (bodyField) {
    const bodyStatus = getBodyMeasureStatus(bodyField, value);
    let status: Status = bodyStatus;
    let zScore: number | undefined;
    const drivers: string[] = [];
    if (baseline && baseline.std > 0) {
      zScore = (value - baseline.mean) / baseline.std;
      if (Math.abs(zScore) > 2) {
        status = escalateStatus(status);
        drivers.push(`Écart significatif à votre référence personnelle (|z| = ${zScore.toFixed(1)} > 2.0).`);
      }
    }
    if (concurrentDegradedIndicatorsCount >= 2 && status === 'watch') {
      status = 'action';
      drivers.push('Gravité accrue en raison de plusieurs indicateurs simultanément dégradés.');
    }
    const indicator = BODY_MEASURE_CONFIG.indicators.find((item) => item.fields.some((field) => field.key === bodyField.key));
    const explanation = status === 'normal'
      ? `${bodyField.label} : ${value} ${bodyField.unit}, ${bodyField.nominalText.toLocaleLowerCase()}.`
      : `${bodyField.label} : ${value} ${bodyField.unit}. ${indicator?.risk ?? 'Valeur à surveiller selon le référentiel corporel.'}`;
    return {
      metric, status, value, explanation,
      actions: status === 'normal' ? ['Poursuivre le protocole habituel de la mission.'] : ['Confirmer la mesure selon le protocole de bord.'],
      drivers: status === 'normal' ? drivers : [...drivers, indicator?.risk ?? 'Valeur hors de la plage nominale.'],
      baselineDeviation: zScore,
      baseline: baseline ? { mean: baseline.mean, std: baseline.std, zScore } : undefined
    };
  }
  const metricConfig = (thresholdsConfig.metrics as Record<string, MetricThresholds>)[metric];

  let rawStatus: Status = 'normal';
  let explanation = '';
  const actions: string[] = [];
  const drivers: string[] = [];

  if (metricConfig) {
    if (metricConfig.criticalHigh !== undefined && value >= metricConfig.criticalHigh) {
      rawStatus = 'contact_flight_surgeon';
    } else if (metricConfig.criticalLow !== undefined && value <= metricConfig.criticalLow) {
      rawStatus = 'contact_flight_surgeon';
    } else if (reachesContactThreshold(value, metricConfig)) {
      rawStatus = 'contact_flight_surgeon';
    } else if (isWithinRange(value, metricConfig.normal)) {
      rawStatus = 'normal';
    } else if (
      (metricConfig.actionLow !== undefined && value <= metricConfig.actionLow) ||
      (metricConfig.actionHigh !== undefined && value >= metricConfig.actionHigh)
    ) {
      rawStatus = 'action';
    } else if (isWithinRange(value, metricConfig.watch)) {
      rawStatus = 'watch';
    } else if (isWithinRange(value, metricConfig.action)) {
      rawStatus = 'action';
    } else if (metricConfig.watch || metricConfig.action) {
      rawStatus = 'action';
    }
  }

  let finalStatus = rawStatus;
  let zScore: number | undefined;

  // Baseline deviation check (14-day rolling window)
  if (baseline && baseline.std > 0) {
    zScore = (value - baseline.mean) / baseline.std;
    if (Math.abs(zScore) > 2.0) {
      // Escalate status by 1 level due to significant baseline divergence
      finalStatus = escalateStatus(finalStatus, 1);
      drivers.push(
        `Écart significatif à votre référence personnelle (|z| = ${zScore.toFixed(1)} > 2.0, moyenne ${baseline.mean.toFixed(1)}).`
      );
    }
  }

  // Multi-indicator degradation escalation
  if (concurrentDegradedIndicatorsCount >= 2 && finalStatus === 'watch') {
    finalStatus = 'action';
    drivers.push('Gravité accrue en raison de plusieurs indicateurs simultanément dégradés.');
  }

  // Generate plain-language explanations and actions
  switch (finalStatus) {
    case 'normal':
      explanation = `Mesure dans les limites physiologiques habituelles (${value} ${metricConfig?.unit ?? ''}).`;
      actions.push('Poursuivre le protocole habituel de la mission.');
      break;
    case 'watch':
      explanation = `Légère variation observée (${value} ${metricConfig?.unit ?? ''}), à surveiller lors des prochains contrôles.`;
      actions.push('Refaire une mesure de confirmation sous 4 à 8 heures.');
      actions.push('Noter tout symptôme ou facteur de contexte (fatigue, repas, hydratation).');
      break;
    case 'action':
      explanation = `Valeur hors des plages recommandées (${value} ${metricConfig?.unit ?? ''}). Une action correctrice est conseillée.`;
      actions.push('Se reposer et vérifier les facteurs environnementaux (température cabine, CO2).');
      actions.push('Programmer une re-mesure rapprochée.');
      break;
    case 'contact_flight_surgeon':
      explanation = `Valeur critique (${value} ${metricConfig?.unit ?? ''}) nécessitant un avis médical.`;
      actions.push('Contacter sans délai le chirurgien de vol ou le médecin de bord.');
      actions.push('Cette alerte est automatiquement inscrite au rapport médical prioritaire.');
      break;
  }

  return {
    metric,
    status: finalStatus,
    value,
    baselineDeviation: zScore,
    explanation,
    actions,
    drivers,
    baseline: baseline ? { mean: baseline.mean, std: baseline.std, zScore } : undefined
  };
}
