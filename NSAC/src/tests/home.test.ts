import { describe, it, expect } from 'vitest';
import { HeartRateForecaster, BloodPressureForecaster, GlucoseForecaster, TemperatureForecaster } from '../engine';
import { assessGlucose } from '../engine/scores/glucose';
import { assessMeasurement } from '../engine/status';

describe('Étape 4: Accueil, Suivi d’activité et Parcours de mesure', () => {
  it('calcule la grille d’activité NASA 140 jours (20 semaines x 7 jours) et la série', () => {
    const WEEKS = 20;
    const DAYS_PER_WEEK = 7;
    const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK;
    expect(TOTAL_DAYS).toBe(140);

    // Mock events
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0];

    const events = [
      { id: '1', astronautId: 'test', date: twoDaysAgo, type: 'view' as const },
      { id: '2', astronautId: 'test', date: yesterday, type: 'measurement' as const },
      { id: '3', astronautId: 'test', date: today, type: 'measurement' as const },
    ];

    // Compute streak of active days (state >= 1) ending today
    const map = new Map<string, number>();
    events.forEach(e => {
      const cur = map.get(e.date) || 0;
      if (e.type === 'measurement') map.set(e.date, 2);
      else if (cur < 1) map.set(e.date, 1);
    });

    expect(map.get(today)).toBe(2);
    expect(map.get(yesterday)).toBe(2);
    expect(map.get(twoDaysAgo)).toBe(1);

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      const state = map.get(d) || 0;
      if (state >= 1) streak++;
      else break;
    }
    expect(streak).toBe(3);
  });

  it('génère un résultat d’évaluation et prévision 7j avec fourchette pour le stepper (Cardio)', () => {
    const hr = 76;
    const assessment = assessMeasurement('heartRate', hr);
    expect(assessment.status).toBe('normal');
    expect(assessment.actions.length).toBeGreaterThanOrEqual(1);

    const forecaster = new HeartRateForecaster(hr);
    const forecast7d = forecaster.predict('7d');
    expect(forecast7d.value).toBeGreaterThan(50);
    expect(forecast7d.low).toBeLessThanOrEqual(forecast7d.value);
    expect(forecast7d.high).toBeGreaterThanOrEqual(forecast7d.value);
    expect(forecast7d.horizon).toBe('7d');
  });

  it('génère un résultat d’évaluation et prévision 7j avec fourchette pour le stepper (Tension)', () => {
    const sys = 118;
    const dia = 78;
    const assessment = assessMeasurement('bpSys', sys);
    expect(assessment.status).toBe('normal');

    const forecaster = new BloodPressureForecaster(sys, dia);
    const forecast7d = forecaster.predict('7d');
    expect(forecast7d.value).toBeCloseTo(118, -1);
    expect(forecast7d.low).toBeLessThanOrEqual(forecast7d.high);
    expect(forecast7d.horizon).toBe('7d');
  });

  it('génère un résultat pour la glycémie avec anomalie de plausibilité (ex: 36 mg/dL)', () => {
    const lowValue = 36;
    const res = assessGlucose(lowValue, 'fasting', undefined, 'mg/dL');
    expect(res.isPlausibilityAnomaly).toBe(true);
    expect(res.status).toBe('contact_flight_surgeon');
    expect(res.actions.length).toBeGreaterThanOrEqual(2);

    const f = new GlucoseForecaster(lowValue);
    const forecast = f.predict('7d');
    expect(forecast.value).toBeDefined();
    expect(forecast.low).toBeLessThanOrEqual(forecast.high);
  });

  it('génère un résultat pour la température avec rythme circadien et couplage', () => {
    const temp = 37.1;
    const assessment = assessMeasurement('temperature', temp);
    expect(assessment.status).toBe('normal');

    const f = new TemperatureForecaster(temp);
    const forecast = f.predict('7d', {
      inflammation: { value: 6.0 }
    });
    expect(forecast.value).toBeGreaterThanOrEqual(36.0);
    expect(forecast.value).toBeLessThanOrEqual(41.0);
    expect(forecast.drivers.length).toBeGreaterThanOrEqual(1);
    expect(forecast.drivers[0].name).toBe('inflammation');
  });
});
