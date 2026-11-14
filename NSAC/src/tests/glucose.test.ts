import { describe, it, expect } from 'vitest';
import {
  toMmolL,
  toMgDl,
  checkGlucosePlausibility,
  assessGlucose
} from '../engine/scores/glucose';

describe('Engine: Blood Glucose Module', () => {
  it('correctly converts between mg/dL and mmol/L', () => {
    // 90 mg/dL / 18.016 ≈ 5.0 mmol/L
    expect(toMmolL(90)).toBe(5.0);
    // 5.0 mmol/L * 18.016 ≈ 90 mg/dL
    expect(toMgDl(5.0)).toBe(90);
  });

  it('detects plausible vs anomalous readings without deleting them', () => {
    // NASA sample outlier 36 mg/dL
    const anomalyLow = checkGlucosePlausibility(36);
    expect(anomalyLow.isPlausibilityAnomaly).toBe(true);
    expect(anomalyLow.warningMessage).toContain('anomalie possible : vérifier la mesure');

    // Extreme high outlier
    const anomalyHigh = checkGlucosePlausibility(450);
    expect(anomalyHigh.isPlausibilityAnomaly).toBe(true);

    // Normal plausible value
    const plausible = checkGlucosePlausibility(85);
    expect(plausible.isPlausibilityAnomaly).toBe(false);
  });

  it('assesses fasting glucose according to clinical context', () => {
    // 70-99 normal
    const normal = assessGlucose(85, 'fasting');
    expect(normal.status).toBe('normal');

    // 100-125 watch
    const watch = assessGlucose(110, 'fasting');
    expect(watch.status).toBe('watch');

    // >=126 action
    const action = assessGlucose(130, 'fasting');
    expect(action.status).toBe('action');

    // <70 action (mild hypoglycemia)
    const hypoAction = assessGlucose(65, 'fasting');
    expect(hypoAction.status).toBe('action');

    // <54 or >=250 critical
    const criticalLow = assessGlucose(52, 'fasting');
    expect(criticalLow.status).toBe('contact_flight_surgeon');

    const criticalHigh = assessGlucose(260, 'fasting');
    expect(criticalHigh.status).toBe('contact_flight_surgeon');
  });

  it('assesses 2h post-meal glucose with different thresholds', () => {
    // 120 mg/dL after meal is normal (<140)
    const postMealNormal = assessGlucose(120, 'post_meal');
    expect(postMealNormal.status).toBe('normal');

    // 155 mg/dL after meal is watch (140-199)
    const postMealWatch = assessGlucose(155, 'post_meal');
    expect(postMealWatch.status).toBe('watch');

    // 210 mg/dL after meal is action (>=200)
    const postMealAction = assessGlucose(210, 'post_meal');
    expect(postMealAction.status).toBe('action');
  });

  it('preserves NASA 36 mg/dL outlier with anomaly flag and prompt action', () => {
    const assessed = assessGlucose(36, 'fasting');
    expect(assessed.isPlausibilityAnomaly).toBe(true);
    expect(assessed.status).toBe('contact_flight_surgeon');
    expect(assessed.actions.some((a) => a.includes('nouvelle mesure'))).toBe(true);
  });
});
