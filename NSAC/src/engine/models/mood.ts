import type { Forecaster, ForecastHorizon, ForecastResult, Measurement } from '../../types';
import { calculateDrivers, ParentContextMap } from '../coupling';

export class MoodForecaster implements Forecaster {
  public readonly metric = 'mood';
  private smoothedScore: number = 72; // Initial nominal WHO-5 score
  private lastTimestampMs: number = 0;
  private sampleCount: number = 0;
  private readonly alpha: number = 0.35; // Smoothing weight for recent WHO-5 reports

  constructor(initialScore: number = 72) {
    this.smoothedScore = Math.max(0, Math.min(100, initialScore));
  }

  public update(
    measurement: Measurement | { value: number; timestamp?: number }
  ): void {
    const val = Math.max(0, Math.min(100, measurement.value));
    const ts = measurement.timestamp ?? Date.now();

    if (this.sampleCount === 0) {
      this.smoothedScore = val;
    } else {
      // Exponentially weighted moving average
      this.smoothedScore = this.alpha * val + (1 - this.alpha) * this.smoothedScore;
    }

    this.sampleCount++;
    this.lastTimestampMs = ts;
  }

  public predict(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;

    const { totalDelta, drivers } = calculateDrivers('mood', parents, horizonDays);

    const projectedValue = Math.max(0, Math.min(100, this.smoothedScore + totalDelta));

    // Uncertainty interval widens over time (± 6 pts at 24h, ± 12 pts at 7d, ± 18 pts at 30d)
    const uncertaintyMargin = 6.0 * Math.sqrt(horizonDays);
    const low = Math.max(0, Math.round((projectedValue - uncertaintyMargin) * 10) / 10);
    const high = Math.min(100, Math.round((projectedValue + uncertaintyMargin) * 10) / 10);
    const value = Math.round(projectedValue * 10) / 10;

    return {
      metric: this.metric,
      horizon,
      value,
      low,
      high,
      drivers,
      confidence: this.sampleCount > 0 ? 0.85 : 0.5
    };
  }

  public reset(initialScore: number = 72): void {
    this.smoothedScore = initialScore;
    this.sampleCount = 0;
    this.lastTimestampMs = 0;
  }
}
