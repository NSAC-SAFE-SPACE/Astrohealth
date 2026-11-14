import type { Forecaster, ForecastHorizon, ForecastResult, Measurement } from '../../types';
import { Kalman1D } from './kalman';
import { calculateDrivers, ParentContextMap } from '../coupling';
import { checkGlucosePlausibility } from '../scores/glucose';

export class GlucoseForecaster implements Forecaster {
  public readonly metric = 'glucose';
  private kalman: Kalman1D;
  private lastAnomalyFlag: boolean = false;

  constructor(initialGlucose: number = 85) {
    // Q = 0.8 (metabolic fluctuations), R = 16.0 (capillary sensor error ~4 mg/dL)
    this.kalman = new Kalman1D(initialGlucose, 0.8, 16.0);
  }

  public update(measurement: Measurement | { value: number; timestamp: number }): void {
    const val = measurement.value;
    const ts = measurement.timestamp ?? Date.now();

    const { isPlausibilityAnomaly } = checkGlucosePlausibility(val);
    this.lastAnomalyFlag = isPlausibilityAnomaly;

    if (isPlausibilityAnomaly) {
      // Never delete in silence! We record with high noise variance R=200 so it doesn't break the model.
      this.kalman.update(val, ts, 200.0);
    } else {
      this.kalman.update(val, ts);
    }
  }

  public predict(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;
    const basePred = this.kalman.predict(horizonDays);

    const { totalDelta, drivers } = calculateDrivers('glucose', parents, horizonDays);

    const rawValue = basePred.value + totalDelta;
    const rawLow = basePred.low + totalDelta;
    const rawHigh = basePred.high + totalDelta;

    const value = Math.max(50, Math.min(300, Math.round(rawValue * 10) / 10));
    const low = Math.max(45, Math.round(rawLow * 10) / 10);
    const high = Math.min(350, Math.round(rawHigh * 10) / 10);

    return {
      metric: this.metric,
      horizon,
      value,
      low: Math.min(value, low),
      high: Math.max(value, high),
      drivers,
      confidence: this.lastAnomalyFlag ? 0.6 : (this.kalman.isInitialized() ? 0.9 : 0.4)
    };
  }

  public reset(initialGlucose: number = 85): void {
    this.kalman.reset(initialGlucose);
    this.lastAnomalyFlag = false;
  }
}
