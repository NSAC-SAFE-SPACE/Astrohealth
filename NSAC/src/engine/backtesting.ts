import type { BacktestResult, ForecastHorizon, Forecaster } from '../types';

export interface TimeSeriesPoint {
  timestamp: number; // ms
  value: number;
  parents?: Record<string, any>;
}

export interface BacktestOptions {
  horizon?: ForecastHorizon;
  minWarmupSamples?: number;
}

/**
 * Executes a rolling (sliding-window) backtest of a forecaster on historical time-series observations.
 * Evaluates Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and [low, high] interval coverage rate.
 */
export function runRollingBacktest(
  createForecaster: () => Forecaster,
  series: TimeSeriesPoint[],
  options: BacktestOptions = {}
): BacktestResult {
  const horizon = options.horizon ?? '24h';
  const minWarmup = options.minWarmupSamples ?? 3;

  if (series.length <= minWarmup) {
    return {
      metric: createForecaster().metric,
      sampleCount: 0,
      mae: 0,
      rmse: 0,
      coverageRate: 100,
      horizon
    };
  }

  // Ensure chronological ordering
  const sorted = [...series].sort((a, b) => a.timestamp - b.timestamp);

  let absoluteErrorsSum = 0;
  let squaredErrorsSum = 0;
  let inIntervalCount = 0;
  let evaluatedSteps = 0;

  for (let i = minWarmup; i < sorted.length; i++) {
    const forecaster = createForecaster();

    // Train/update with all observations prior to i
    for (let j = 0; j < i; j++) {
      forecaster.update({
        value: sorted[j].value,
        timestamp: sorted[j].timestamp
      });
    }

    const targetObservation = sorted[i];
    const prediction = forecaster.predict(horizon, targetObservation.parents);

    const error = Math.abs(prediction.value - targetObservation.value);
    absoluteErrorsSum += error;
    squaredErrorsSum += error * error;

    if (targetObservation.value >= prediction.low && targetObservation.value <= prediction.high) {
      inIntervalCount++;
    }

    evaluatedSteps++;
  }

  const mae = evaluatedSteps > 0 ? absoluteErrorsSum / evaluatedSteps : 0;
  const rmse = evaluatedSteps > 0 ? Math.sqrt(squaredErrorsSum / evaluatedSteps) : 0;
  const coverageRate = evaluatedSteps > 0 ? (inIntervalCount / evaluatedSteps) * 100 : 100;

  return {
    metric: createForecaster().metric,
    sampleCount: evaluatedSteps,
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    coverageRate: Math.round(coverageRate * 10) / 10,
    horizon
  };
}
