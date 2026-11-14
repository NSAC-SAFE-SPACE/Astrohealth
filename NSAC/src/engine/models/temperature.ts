import type { Forecaster, ForecastHorizon, ForecastResult, Measurement } from '../../types';
import { Kalman1D } from './kalman';
import { calculateDrivers, ParentContextMap } from '../coupling';

export class TemperatureForecaster implements Forecaster {
  public readonly metric = 'temperature';
  private kalman: Kalman1D;
  // Circadian amplitude ~0.35 °C (peak-to-trough ~0.7 °C)
  private readonly circadianAmplitude: number = 0.35;
  // Peak at 17:00 (hour 17)
  private readonly peakHour: number = 17;

  constructor(initialTemp: number = 36.8) {
    // Q=0.02 (daily drift), R=0.04 (measurement noise ~0.2 °C)
    this.kalman = new Kalman1D(initialTemp, 0.02, 0.04);
  }

  /**
   * Computes the physiological circadian offset for a given timestamp
   */
  public getCircadianOffset(timestampMs: number = Date.now()): number {
    const date = new Date(timestampMs);
    const hour = date.getHours() + date.getMinutes() / 60;
    // Sinusoidal cycle: max at 17h, min at 05h
    const phaseRad = (2 * Math.PI * (hour - (this.peakHour - 6))) / 24;
    return this.circadianAmplitude * Math.sin(phaseRad);
  }

  public update(measurement: Measurement | { value: number; timestamp: number }): void {
    const val = measurement.value;
    const ts = measurement.timestamp ?? Date.now();

    // Remove circadian phase effect to update pure baseline temperature
    const circadianOffset = this.getCircadianOffset(ts);
    const baselineEstimate = val - circadianOffset;

    this.kalman.update(baselineEstimate, ts);
  }

  public predict(horizon: ForecastHorizon, parents?: ParentContextMap): ForecastResult {
    const horizonDays = horizon === '24h' ? 1 : horizon === '7d' ? 7 : 30;
    const basePred = this.kalman.predict(horizonDays);

    const { totalDelta, drivers } = calculateDrivers('temperature', parents, horizonDays);

    // For 24h: same time of day as now (+24h), circadian offset is same as now
    // For 7d and 30d: envelope expands by circadian amplitude to guarantee safe coverage of daily peaks
    const nowMs = Date.now();
    const futureMs = nowMs + horizonDays * 86400000;
    const targetCircadian = this.getCircadianOffset(futureMs);

    const adjustedValue = basePred.value + targetCircadian + totalDelta;

    // Bounds include circadian variation margin for multi-day horizons
    const circadianBuffer = horizon === '24h' ? 0.1 : this.circadianAmplitude;
    const low = Math.round((basePred.low - circadianBuffer + totalDelta) * 100) / 100;
    const high = Math.round((basePred.high + circadianBuffer + totalDelta) * 100) / 100;
    const value = Math.round(adjustedValue * 100) / 100;

    return {
      metric: this.metric,
      horizon,
      value: Math.max(34.0, Math.min(42.0, value)),
      low: Math.max(33.5, low),
      high: Math.min(42.5, high),
      drivers,
      confidence: this.kalman.isInitialized() ? 0.92 : 0.5
    };
  }

  public reset(initialTemp: number = 36.8): void {
    this.kalman.reset(initialTemp);
  }
}
