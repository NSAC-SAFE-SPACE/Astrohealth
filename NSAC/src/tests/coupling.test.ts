import { describe, it, expect } from 'vitest';
import {
  getParents,
  getChildren,
  calculateDrivers,
  HeartRateForecaster,
  BloodPressureForecaster,
  BoneMassForecaster
} from '../engine';

describe('Engine Coupling', () => {
  it('retrieves incoming parent links for heartRate', () => {
    const parents = getParents('heartRate');
    const parentSources = parents.map((p) => p.from);

    expect(parentSources).toContain('sleep');
    expect(parentSources).toContain('exercise');
    expect(parentSources).toContain('mood');
    expect(parentSources).toContain('temperature');
    expect(parentSources).toContain('bloodPressure');
  });

  it('retrieves outgoing children links from sleep', () => {
    const children = getChildren('sleep');
    const childTargets = children.map((c) => c.to);

    expect(childTargets).toContain('mood');
    expect(childTargets).toContain('heartRate');
    expect(childTargets).toContain('bloodPressure');
    expect(childTargets).toContain('glucose');
  });

  it('prolonged sleep deficit elevates predicted heart rate and blood pressure', () => {
    const hrForecasterNominal = new HeartRateForecaster(65);
    const hrForecasterSleepDebt = new HeartRateForecaster(65);

    const bpForecasterNominal = new BloodPressureForecaster(115, 75);
    const bpForecasterSleepDebt = new BloodPressureForecaster(115, 75);

    // Sleep deficit of 3 hours (4.5h vs 7.5h baseline)
    const nominalParents = { sleep: { value: 7.5, baselineMean: 7.5, unit: 'h' } };
    const sleepDebtParents = { sleep: { value: 4.5, baselineMean: 7.5, unit: 'h' } };

    const predHrNominal = hrForecasterNominal.predict('7d', nominalParents);
    const predHrSleepDebt = hrForecasterSleepDebt.predict('7d', sleepDebtParents);

    const predBpNominal = bpForecasterNominal.predict('7d', nominalParents);
    const predBpSleepDebt = bpForecasterSleepDebt.predict('7d', sleepDebtParents);

    // Heart rate is higher due to sympathetic tone
    expect(predHrSleepDebt.value).toBeGreaterThan(predHrNominal.value);
    expect(predHrSleepDebt.drivers.some((d) => d.name === 'sleep')).toBe(true);

    // Blood pressure is higher due to vascular resistance
    expect(predBpSleepDebt.value).toBeGreaterThan(predBpNominal.value);
    expect(predBpSleepDebt.drivers.some((d) => d.name === 'sleep')).toBe(true);
  });

  it('regular resistance exercise counters bone loss', () => {
    const bone = new BoneMassForecaster(100.0);

    const predNoExercise = bone.predict('30d', {
      exercise: { value: 0, baselineMean: 60, unit: 'min' }
    });

    const predGoodExercise = bone.predict('30d', {
      exercise: { value: 60, baselineMean: 60, unit: 'min' }
    });

    expect(predGoodExercise.value).toBeGreaterThan(predNoExercise.value);
    expect(predGoodExercise.drivers.length).toBeGreaterThan(0);
    expect(predGoodExercise.drivers[0].name).toBe('exercise');
  });

  it('temperature elevation increases predicted heart rate (~8-10 bpm per degree)', () => {
    const hr = new HeartRateForecaster(70);

    const nominalPred = hr.predict('24h', {
      temperature: { value: 36.8, baselineMean: 36.8 }
    });

    const feverPred = hr.predict('24h', {
      temperature: { value: 38.3, baselineMean: 36.8 } // +1.5 °C fever
    });

    expect(feverPred.value).toBeGreaterThan(nominalPred.value + 5);
    const tempDriver = feverPred.drivers.find((d) => d.name === 'temperature');
    expect(tempDriver).toBeDefined();
    expect(tempDriver?.impactValue).toBeGreaterThan(0);
    expect(tempDriver?.explanation).toContain('élévation thermique');
  });

  it('provides plain language explanations in both French and English', () => {
    const { drivers } = calculateDrivers('heartRate', {
      sleep: { value: 4.5, baselineMean: 7.5, unit: 'h' }
    }, 7);

    expect(drivers.length).toBeGreaterThan(0);
    const sleepDriver = drivers[0];
    expect(sleepDriver.explanation).toContain('sommeil court');
    expect(sleepDriver.explanationEn).toContain('shorter sleep');
  });
});
