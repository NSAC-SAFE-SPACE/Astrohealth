import type { Forecaster, ForecastHorizon, ForecastResult, Measurement } from '../../types';
import { Kalman1D } from './kalman';
import { calculateDrivers, ParentContextMap } from '../coupling';

export class BloodPressureForecaster implements Forecaster {
  public readonly metric = 'bpSys';
  private kalmanSys: Kalman1D;
  private kalmanDia: Kalman1D;

  constructor(initialSys: number = 115, initialDia: number = 75) {
    // Sys: Q=0.5, R=16.0 (~4 mmHg noise)
    this.kalmanSys = new Kalman1D(initialSys, 0.5, 16.0);
    // Dia: Q=0.3, R=9.0 (~3 mmHg noise)
    this.kalmanDia = new Kalman1D(initialDia, 0.3, 9.0);
  }

  public update(
    measurement:
      | Measurement
      | { value: number; timestamp: number; dia?: number }
  ): void {
    const ts = measurement.timestamp ?? Date.now();
    const val = measurement.value;

    if ('metric' in measurement) {
      if (measurement.metric === 'bpSys') {
        this.kalmanSys.update(val, ts);
      } else if (measurement.metric === 'bpDia') {
        this.kalmanDia.update(val, ts);
      }
    } else {
      this.kalmanSys.update(val, ts);
      if (measurement.dia !== undefined) {
        this.kalmanDia.update(measurement.dia, ts);
      }
    }
  }

  public predict(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;
    const basePredSys = this.kalmanSys.predict(horizonDays);

    const { totalDelta, drivers } = calculateDrivers('bloodPressure', parents, horizonDays);

    const rawValue = basePredSys.value + totalDelta;
    const rawLow = basePredSys.low + totalDelta;
    const rawHigh = basePredSys.high + totalDelta;

    const value = Math.max(70, Math.min(220, Math.round(rawValue * 10) / 10));
    const low = Math.max(60, Math.round(rawLow * 10) / 10);
    const high = Math.min(240, Math.round(rawHigh * 10) / 10);

    return {
      metric: this.metric,
      horizon,
      value,
      low: Math.min(value, low),
      high: Math.max(value, high),
      drivers,
      confidence: this.kalmanSys.isInitialized() ? 0.9 : 0.4
    };
  }

  public predictDia(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;
    const basePredDia = this.kalmanDia.predict(horizonDays);
    const { totalDelta, drivers } = calculateDrivers('bloodPressure', parents, horizonDays);

    // Diastolic impact typically ~60% of systolic impact
    const diaDelta = totalDelta * 0.6;
    const rawValue = basePredDia.value + diaDelta;
    const rawLow = basePredDia.low + diaDelta;
    const rawHigh = basePredDia.high + diaDelta;

    const value = Math.max(40, Math.min(140, Math.round(rawValue * 10) / 10));
    const low = Math.max(35, Math.round(rawLow * 10) / 10);
    const high = Math.min(150, Math.round(rawHigh * 10) / 10);

    return {
      metric: 'bpDia',
      horizon,
      value,
      low: Math.min(value, low),
      high: Math.max(value, high),
      drivers,
      confidence: this.kalmanDia.isInitialized() ? 0.9 : 0.4
    };
  }

  public reset(initialSys: number = 115, initialDia: number = 75): void {
    this.kalmanSys.reset(initialSys);
    this.kalmanDia.reset(initialDia);
  }
}
