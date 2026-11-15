import { describe, it, expect } from 'vitest';
import {
  BloodPressureForecaster,
  HeartRateForecaster,
  GlucoseForecaster,
  TemperatureForecaster,
  BoneMassForecaster
} from '../engine';
import frTranslations from '../i18n/fr.json';
import enTranslations from '../i18n/en.json';

describe('Étape 5: Mon corps (Silhouette interactive, zones anatomiques, panneau détaillé)', () => {
  it('fournit les détails cliniques pour les 5 zones corporelles dans les deux langues', () => {
    const zones = ['heart', 'bone', 'belly', 'skin', 'radiation'] as const;

    for (const zone of zones) {
      const frDetails = (frTranslations.body as any).zoneDetails[zone];
      const enDetails = (enTranslations.body as any).zoneDetails[zone];

      expect(frDetails).toBeDefined();
      expect(enDetails).toBeDefined();

      // "À quoi ça sert"
      expect(frDetails.whatIsIt.length).toBeGreaterThan(15);
      expect(enDetails.whatIsIt.length).toBeGreaterThan(15);

      // "Effet de l'espace"
      expect(frDetails.spaceEffect.length).toBeGreaterThan(15);
      expect(enDetails.spaceEffect.length).toBeGreaterThan(15);

      // "Que faire" (au moins 2-3 actions)
      expect(frDetails.whatToDo.length).toBeGreaterThanOrEqual(2);
      expect(enDetails.whatToDo.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('génère une prévision 7j et des influences de couplage pour la zone Cœur', () => {
    const bp = new BloodPressureForecaster(120, 80);
    const parents = {
      sleep: { value: 5.5, unit: 'h' },
      exercise: { value: 30, unit: 'min' }
    };
    const pred = bp.predict('7d', parents);
    expect(pred.value).toBeDefined();
    expect(pred.low).toBeLessThanOrEqual(pred.high);
    expect(pred.drivers.length).toBeGreaterThanOrEqual(1);

    const hr = new HeartRateForecaster(72);
    const hrPred = hr.predict('7d', parents);
    expect(hrPred.value).toBeDefined();
    expect(hrPred.low).toBeLessThanOrEqual(hrPred.high);
  });

  it('génère une prévision à 30 jours pour la zone Os et muscles avec protection exercice ARED', () => {
    const bone = new BoneMassForecaster(142, 60);
    const pred = bone.predict('30d');
    expect(pred.value).toBeGreaterThan(0);
    expect(pred.low).toBeLessThanOrEqual(pred.high);
    expect(pred.drivers.length).toBeGreaterThanOrEqual(1);
    expect(pred.drivers[0].name).toBe('exercise');
  });

  it('génère une prévision 7j et fourchette pour la zone Ventre (Glycémie)', () => {
    const glu = new GlucoseForecaster(92);
    const pred = glu.predict('7d', {
      sleep: { value: 5.0, unit: 'h' }
    });
    expect(pred.value).toBeGreaterThan(50);
    expect(pred.low).toBeLessThanOrEqual(pred.high);
    expect(pred.drivers.length).toBeGreaterThanOrEqual(1);
  });

  it('génère une prévision 7j avec rythme circadien pour la zone Peau (Température)', () => {
    const temp = new TemperatureForecaster(36.8);
    const pred = temp.predict('7d');
    expect(pred.value).toBeGreaterThanOrEqual(36.0);
    expect(pred.value).toBeLessThanOrEqual(38.0);
    expect(pred.low).toBeLessThanOrEqual(pred.high);
  });
});
