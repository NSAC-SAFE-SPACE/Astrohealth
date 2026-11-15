import { describe, it, expect, beforeEach } from 'vitest';
import {
  HeartRateForecaster,
  BloodPressureForecaster,
  TemperatureForecaster,
  GlucoseForecaster,
  MoodForecaster,
  BoneMassForecaster,
  SleepObserver,
  Kalman1D
} from '../engine';

describe('Kalman1D Filter', () => {
  it('correctly filters noisy signal towards true state', () => {
    const k = new Kalman1D(70, 0.2, 4.0);
    const now = Date.now();

    // Feed 10 measurements oscillating around 80
    for (let i = 0; i < 10; i++) {
      k.update(80 + (i % 2 === 0 ? 3 : -3), now + i * 86400000);
    }

    const state = k.getState();
    expect(state).toBeGreaterThan(76);
    expect(state).toBeLessThan(84);
  });

  it('widens uncertainty bounds as horizon increases', () => {
    const k = new Kalman1D(70, 0.5, 4.0);
    k.init(70);

    const pred1d = k.predict(1);
    const pred7d = k.predict(7);
    const pred30d = k.predict(30);

    const margin1d = pred1d.high - pred1d.low;
    const margin7d = pred7d.high - pred7d.low;
    const margin30d = pred30d.high - pred30d.low;

    expect(margin7d).toBeGreaterThan(margin1d);
    expect(margin30d).toBeGreaterThan(margin7d);
  });
});

describe('Model 1: HeartRateForecaster', () => {
  let forecaster: HeartRateForecaster;

  beforeEach(() => {
    forecaster = new HeartRateForecaster(68);
  });

  it('initializes and updates with measurements', () => {
    forecaster.update({ value: 72, timestamp: Date.now() });
    const pred = forecaster.predict('24h');
    expect(pred.metric).toBe('heartRate');
    expect(pred.value).toBeGreaterThan(68);
    expect(pred.value).toBeLessThanOrEqual(72);
    expect(pred.low).toBeLessThanOrEqual(pred.value);
    expect(pred.high).toBeGreaterThanOrEqual(pred.value);
  });

  it('predicts for 24h, 7d and 30d with widening uncertainty intervals', () => {
    forecaster.update({ value: 70, timestamp: Date.now() });
    const p24h = forecaster.predict('24h');
    const p7d = forecaster.predict('7d');
    const p30d = forecaster.predict('30d');

    const span24h = p24h.high - p24h.low;
    const span7d = p7d.high - p7d.low;
    const span30d = p30d.high - p30d.low;

    expect(span7d).toBeGreaterThan(span24h);
    expect(span30d).toBeGreaterThan(span7d);
  });
});

describe('Model 2: BloodPressureForecaster', () => {
  let forecaster: BloodPressureForecaster;

  beforeEach(() => {
    forecaster = new BloodPressureForecaster(120, 80);
  });

  it('updates systolic and diastolic blood pressure separately', () => {
    const now = Date.now();
    forecaster.update({ metric: 'bpSys', value: 125, timestamp: now, id: '1', astronautId: 'a', unit: 'mmHg', source: 'manual' });
    forecaster.update({ metric: 'bpDia', value: 84, timestamp: now, id: '2', astronautId: 'a', unit: 'mmHg', source: 'manual' });

    const predSys = forecaster.predict('24h');
    const predDia = forecaster.predictDia('24h');

    expect(predSys.value).toBeGreaterThan(120);
    expect(predSys.value).toBeLessThanOrEqual(125);
    expect(predDia.value).toBeGreaterThan(80);
    expect(predDia.value).toBeLessThanOrEqual(84);
    expect(predSys.high).toBeGreaterThan(predSys.low);
    expect(predDia.high).toBeGreaterThan(predDia.low);
  });
});

describe('Model 3: TemperatureForecaster (Circadian rhythm)', () => {
  let forecaster: TemperatureForecaster;

  beforeEach(() => {
    forecaster = new TemperatureForecaster(36.8);
  });

  it('calculates circadian offset according to hour of day (peak at 17h, minimum at 05h)', () => {
    // 17:00 (peak)
    const peakDate = new Date('2026-11-14T17:00:00Z');
    const peakOffset = forecaster.getCircadianOffset(peakDate.getTime());

    // 05:00 (trough)
    const troughDate = new Date('2026-11-14T05:00:00Z');
    const troughOffset = forecaster.getCircadianOffset(troughDate.getTime());

    expect(peakOffset).toBeGreaterThan(0.2);
    expect(troughOffset).toBeLessThan(-0.2);
    expect(peakOffset).toBeGreaterThan(troughOffset);
  });

  it('preserves baseline when measurements are taken at different circadian phases', () => {
    const morning = new Date('2026-11-14T05:00:00Z').getTime();
    // In morning, 36.45 is normal because of circadian dip
    forecaster.update({ value: 36.45, timestamp: morning });

    const pred = forecaster.predict('24h');
    // True underlying core temp is ~36.8
    expect(pred.value).toBeGreaterThanOrEqual(36.3);
    expect(pred.value).toBeLessThanOrEqual(37.3);
  });
});

describe('Model 4: GlucoseForecaster', () => {
  let forecaster: GlucoseForecaster;

  beforeEach(() => {
    forecaster = new GlucoseForecaster(85);
  });

  it('updates nominal fasting glucose and predicts accurately', () => {
    forecaster.update({ value: 90, timestamp: Date.now() });
    const pred = forecaster.predict('7d');
    expect(pred.value).toBeGreaterThan(85);
    expect(pred.value).toBeLessThanOrEqual(90);
    expect(pred.low).toBeLessThan(pred.value);
    expect(pred.high).toBeGreaterThan(pred.value);
  });

  it('handles improbable anomaly (36 mg/dL) safely without breaking baseline', () => {
    const now = Date.now();
    forecaster.update({ value: 85, timestamp: now });
    // Anomaly measurement (LSDS-8 extreme outlier)
    forecaster.update({ value: 36, timestamp: now + 3600000 });

    const pred = forecaster.predict('24h');
    // Baseline should NOT drop drastically to 36!
    expect(pred.value).toBeGreaterThan(70);
    // Confidence reflects anomaly presence
    expect(pred.confidence).toBeLessThanOrEqual(0.7);
  });
});

describe('Model 5: MoodForecaster', () => {
  let forecaster: MoodForecaster;

  beforeEach(() => {
    forecaster = new MoodForecaster(75);
  });

  it('smooths psychological well-being reports using exponential weighting', () => {
    forecaster.update({ value: 60 });
    forecaster.update({ value: 65 });

    const pred = forecaster.predict('7d');
    expect(pred.value).toBeGreaterThan(60);
    expect(pred.value).toBeLessThan(75);
    expect(pred.low).toBeLessThan(pred.value);
    expect(pred.high).toBeGreaterThan(pred.value);
  });
});

describe('Model 6: BoneMassForecaster', () => {
  let forecaster: BoneMassForecaster;

  beforeEach(() => {
    forecaster = new BoneMassForecaster(100.0);
  });

  it('predicts progressive bone demineralization in microgravity', () => {
    // Zero resistance exercise
    forecaster.setCountermeasures(0, 1.0);
    const pred30d = forecaster.predict('30d');

    // Without countermeasures, loss is ~1.0% per month
    expect(pred30d.value).toBeLessThan(99.5);
    expect(pred30d.value).toBeGreaterThan(98.5);
  });

  it('resistance exercise countermeasures significantly slow bone loss', () => {
    const unmitigated = new BoneMassForecaster(100.0);
    unmitigated.setCountermeasures(0, 1.0);
    const predUnmitigated = unmitigated.predict('30d');

    const mitigated = new BoneMassForecaster(100.0);
    mitigated.setCountermeasures(60, 1.0); // 60 min ARED
    const predMitigated = mitigated.predict('30d');

    // The protected astronaut retains significantly more bone density
    expect(predMitigated.value).toBeGreaterThan(predUnmitigated.value);
    const unmitigatedLoss = 100 - predUnmitigated.value;
    const mitigatedLoss = 100 - predMitigated.value;
    expect(mitigatedLoss).toBeLessThan(unmitigatedLoss * 0.4);
  });
});

describe('SleepObserver', () => {
  it('calculates average hours and deficit over rolling window', () => {
    const observer = new SleepObserver();
    const now = Date.now();

    observer.addLog(6.0, now - 2 * 86400000);
    observer.addLog(5.5, now - 1 * 86400000);
    observer.addLog(5.0, now);

    expect(observer.getAverageHours()).toBeCloseTo(5.5, 1);
    // Deficit against 7.5 target
    expect(observer.getSleepDeficit(7.5)).toBeCloseTo(2.0, 1);
  });
});
