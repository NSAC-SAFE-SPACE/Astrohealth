import type { Forecaster, ForecastHorizon, ForecastResult, Measurement } from '../../types';
import { calculateDrivers, ParentContextMap } from '../coupling';

export interface BoneModelContext {
  resistanceExerciseMinPerDay?: number; // Target 60 min/day
  nutritionAdequacy?: number; // 0.0 to 1.0 (calcium + vit D sufficiency)
}

export class BoneMassForecaster implements Forecaster {
  public readonly metric = 'boneProxy';

  // NASA HRP parameters marked "À VÉRIFIER avec NASA HRP"
  private readonly aprioriDeclineRatePerDay: number = 1.0 / 30.4375 / 100; // ~1% per month in microgravity unmitigated
  private readonly maxCountermeasureProtection: number = 0.75; // Up to 75% protection with ARED
  private readonly targetExerciseMin: number = 60; // minutes/day

  private currentBoneDensityPercent: number = 100.0; // % of pre-flight ground baseline
  private resistanceExerciseMin: number = 45;
  private nutritionAdequacy: number = 1.0;
  private hasPointMeasurement: boolean = false;

  constructor(initialPercent: number = 100.0) {
    this.currentBoneDensityPercent = initialPercent;
  }

  public update(
    measurement: Measurement | { value: number; timestamp?: number },
    context?: BoneModelContext
  ): void {
    if (context) {
      if (context.resistanceExerciseMinPerDay !== undefined) {
        this.resistanceExerciseMin = context.resistanceExerciseMinPerDay;
      }
      if (context.nutritionAdequacy !== undefined) {
        this.nutritionAdequacy = context.nutritionAdequacy;
      }
    }

    if (typeof measurement.value === 'number') {
      this.currentBoneDensityPercent = measurement.value;
      this.hasPointMeasurement = true;
    }
  }

  public setCountermeasures(exerciseMinPerDay: number, nutritionAdequacy: number = 1.0): void {
    this.resistanceExerciseMin = exerciseMinPerDay;
    this.nutritionAdequacy = nutritionAdequacy;
  }

  public predict(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;

    // Check if exercise parent is supplied in parents context
    let effectiveExerciseMin = this.resistanceExerciseMin;
    if (parents?.exercise !== undefined) {
      effectiveExerciseMin = typeof parents.exercise === 'number' ? parents.exercise : parents.exercise.value;
    }

    // Protection factor (0.0 to 0.75)
    const exerciseRatio = Math.min(1.0, Math.max(0, effectiveExerciseMin / this.targetExerciseMin));
    const protection = exerciseRatio * this.maxCountermeasureProtection;

    // Nutrition modulation: poor nutrition increases loss by up to 20%
    const nutritionFactor = 1.0 + (1.0 - Math.min(1.0, Math.max(0.5, this.nutritionAdequacy))) * 0.4;

    // Net daily decline rate
    const dailyDeclineRate = this.aprioriDeclineRatePerDay * (1.0 - protection) * nutritionFactor;
    const projectedDeclinePercent = dailyDeclineRate * horizonDays * 100;

    const { drivers } = calculateDrivers('boneMass', {
      exercise: { value: effectiveExerciseMin, baselineMean: 30, unit: 'min' }
    }, horizonDays);

    const rawValue = this.currentBoneDensityPercent - projectedDeclinePercent;
    const value = Math.round(rawValue * 100) / 100;

    // Measurement noise and biological variation buffer (± 1.2% at 24h to ± 2.5% at 30d)
    const uncertaintyMargin = Math.round((1.0 + 0.3 * Math.sqrt(horizonDays)) * 10) / 10;
    const low = Math.round((value - uncertaintyMargin) * 100) / 100;
    const high = Math.round((value + uncertaintyMargin) * 100) / 100;

    return {
      metric: this.metric,
      horizon,
      value,
      low,
      high,
      drivers,
      confidence: this.hasPointMeasurement ? 0.9 : 0.7
    };
  }

  public reset(initialPercent: number = 100.0): void {
    this.currentBoneDensityPercent = initialPercent;
    this.hasPointMeasurement = false;
    this.resistanceExerciseMin = 45;
  }
}
