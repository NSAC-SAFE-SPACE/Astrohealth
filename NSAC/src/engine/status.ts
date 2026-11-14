import type { Metric, Status, Assessment } from '../types';
import thresholdsConfig from './config/thresholds.json';

export interface BaselineStats {
  mean: number;
  std: number;
  n?: number;
}

const STATUS_HIERARCHY: Status[] = ['normal', 'watch', 'action', 'contact_flight_surgeon'];

export function escalateStatus(status: Status, levels: number = 1): Status {
  const currentIndex = STATUS_HIERARCHY.indexOf(status);
  const newIndex = Math.min(currentIndex + levels, STATUS_HIERARCHY.length - 1);
  return STATUS_HIERARCHY[newIndex];
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
  const metricConfig = (thresholdsConfig.metrics as Record<string, any>)[metric];

  let rawStatus: Status = 'normal';
  let explanation = '';
  const actions: string[] = [];
  const drivers: string[] = [];

  if (metricConfig) {
    const { normal, watch, action, contact_flight_surgeon } = metricConfig;

    // Check explicit critical boundaries first
    if (metricConfig.criticalHigh !== undefined && value >= metricConfig.criticalHigh) {
      rawStatus = 'contact_flight_surgeon';
    } else if (metricConfig.criticalLow !== undefined && value <= metricConfig.criticalLow) {
      rawStatus = 'contact_flight_surgeon';
    } else if (metricConfig.actionHigh !== undefined && value >= metricConfig.actionHigh) {
      rawStatus = 'action';
    } else if (metricConfig.actionLow !== undefined && value <= metricConfig.actionLow) {
      rawStatus = 'action';
    } else if (metricConfig.contact_flight_surgeon) {
      if (
        (metricConfig.contact_flight_surgeon.max !== undefined && value >= metricConfig.contact_flight_surgeon.max) ||
        (metricConfig.contact_flight_surgeon.min !== undefined && value <= metricConfig.contact_flight_surgeon.min)
      ) {
        rawStatus = 'contact_flight_surgeon';
      }
    }

    if (rawStatus === 'normal' && metricConfig.action) {
      if (
        (metricConfig.action.max !== undefined && value > metricConfig.action.max) ||
        (metricConfig.action.min !== undefined && value < metricConfig.action.min)
      ) {
        rawStatus = 'action';
      }
    }

    if (rawStatus === 'normal' && metricConfig.watch) {
      if (
        (metricConfig.watch.max !== undefined && value > metricConfig.watch.max) ||
        (metricConfig.watch.min !== undefined && value < metricConfig.watch.min)
      ) {
        rawStatus = 'watch';
      }
    }

    if (rawStatus === 'normal' && metricConfig.normal) {
      if (value < metricConfig.normal.min || value > metricConfig.normal.max) {
        rawStatus = 'watch';
      }
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
