import type { Forecaster, ForecastHorizon, ForecastResult, Measurement } from '../../types';
import { Kalman1D } from './kalman';
import { calculateDrivers, ParentContextMap } from '../coupling';

export class HeartRateForecaster implements Forecaster {
  public readonly metric = 'heartRate';
  private kalman: Kalman1D;

  constructor(initialBpm: number = 70) {
    // Q = 0.5 (slight daily drift), R = 9.0 (std dev ~3 bpm measurement error)
    this.kalman = new Kalman1D(initialBpm, 0.5, 9.0);
  }

  public update(measurement: Measurement | { value: number; timestamp: number }): void {
    const val = typeof measurement.value === 'number' ? measurement.value : 70;
    const ts = measurement.timestamp ?? Date.now();
    this.kalman.update(val, ts);
  }

  public predict(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;
    const basePred = this.kalman.predict(horizonDays);

    const { totalDelta, drivers } = calculateDrivers('heartRate', parents, horizonDays);

    const rawValue = basePred.value + totalDelta;
    const rawLow = basePred.low + totalDelta;
    const rawHigh = basePred.high + totalDelta;

    // Physiological safety clamp
    const value = Math.max(35, Math.min(180, Math.round(rawValue * 10) / 10));
    const low = Math.max(35, Math.round(rawLow * 10) / 10);
    const high = Math.min(190, Math.round(rawHigh * 10) / 10);

    return {
      metric: this.metric,
      horizon,
      value,
      low: Math.min(value, low),
      high: Math.max(value, high),
      drivers,
      confidence: this.kalman.isInitialized() ? 0.9 : 0.4
    };
  }

  public reset(initialBpm: number = 70): void {
    this.kalman.reset(initialBpm);
  }
}
