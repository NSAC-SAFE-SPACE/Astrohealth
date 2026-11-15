import { describe, it, expect } from 'vitest';
import { runRollingBacktest, HeartRateForecaster, GlucoseForecaster, TimeSeriesPoint } from '../engine';

describe('Rolling Backtesting Engine', () => {
  it('gracefully handles time-series with insufficient warmup samples', () => {
    const res = runRollingBacktest(() => new HeartRateForecaster(70), [
      { timestamp: 1000, value: 70 },
      { timestamp: 2000, value: 72 }
    ], { minWarmupSamples: 3 });

    expect(res.sampleCount).toBe(0);
    expect(res.coverageRate).toBe(100);
  });

  it('evaluates rolling MAE, RMSE, and coverage rate on synthetic series', () => {
    const baseTime = new Date('2026-11-01T08:00:00Z').getTime();
    const series: TimeSeriesPoint[] = [];

    // 15 days of data centered around 72 bpm with small noise (± 2 bpm)
    for (let day = 0; day < 15; day++) {
      const noise = (day % 3 === 0 ? 1.5 : day % 3 === 1 ? -1.5 : 0);
      series.push({
        timestamp: baseTime + day * 86400000,
        value: 72 + noise
      });
    }

    const result = runRollingBacktest(
      () => new HeartRateForecaster(70),
      series,
      { horizon: '24h', minWarmupSamples: 4 }
    );

    expect(result.sampleCount).toBe(11);
    // Kalman filter should predict very close to 72, with small MAE (< 3 bpm)
    expect(result.mae).toBeLessThan(3.0);
    expect(result.rmse).toBeLessThan(3.5);
    // Interval [low, high] with Kalman error covariance should cover nearly 100% of small variations
    expect(result.coverageRate).toBeGreaterThanOrEqual(80.0);
  });

  it('runs backtest on glucose forecaster with anomaly resilience', () => {
    const baseTime = Date.now();
    const series: TimeSeriesPoint[] = [];

    for (let day = 0; day < 10; day++) {
      series.push({
        timestamp: baseTime + day * 86400000,
        value: 85 + (day % 2 === 0 ? 2 : -2)
      });
    }

    const result = runRollingBacktest(
      () => new GlucoseForecaster(85),
      series,
      { horizon: '24h', minWarmupSamples: 3 }
    );

    expect(result.sampleCount).toBe(7);
    expect(result.mae).toBeLessThan(4.0);
    expect(result.coverageRate).toBeGreaterThanOrEqual(80.0);
  });
});
