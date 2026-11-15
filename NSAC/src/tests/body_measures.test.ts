import { describe, expect, it } from 'vitest';
import {
  BODY_MEASURE_CONFIG,
  BODY_MEASURE_FIELD_BY_KEY,
  BODY_MEASURE_KEYS,
  getBodyMeasureStatus,
  validateBodyMeasureValues
} from '../engine/config/bodyMeasures';
import { mapBodyMeasureRecords } from '../services/bodyMeasures';
import { BODY_ZONE_CONFIG, BODY_ZONE_FIELD_KEYS } from '../engine/config/bodyZones';
import type { Measurement } from '../types';

describe('body measure reference configuration', () => {
  it('defines twelve indicators and thirteen fields, including paired blood pressure', () => {
    expect(BODY_MEASURE_CONFIG.indicators).toHaveLength(12);
    expect(BODY_MEASURE_KEYS).toHaveLength(13);
    expect(new Set(BODY_MEASURE_KEYS).size).toBe(13);
  });

  it.each([
    ['Heart_Rate', 50, 'watch'], ['Heart_Rate', 55, 'normal'], ['Heart_Rate', 90, 'normal'],
    ['Heart_Rate', 105, 'watch'], ['Heart_Rate', 106, 'action'],
    ['SpO2', 91, 'action'], ['SpO2', 92, 'watch'], ['SpO2', 96, 'normal'],
    ['Intraocular_Pressure', 24, 'watch'], ['Intraocular_Pressure', 25, 'action'],
    ['Fasting_Glucose', 0.69, 'action'], ['Fasting_Glucose', 0.70, 'normal'],
    ['Fasting_Glucose', 1.10, 'normal'], ['Fasting_Glucose', 1.41, 'action'],
    ['Bone_ZScore', -1, 'normal'], ['Bone_ZScore', -1.5, 'watch'], ['Bone_ZScore', -2, 'action'],
    ['Muscle_Strength_Loss', 9.9, 'normal'], ['Muscle_Strength_Loss', 10, 'watch'], ['Muscle_Strength_Loss', 20, 'watch'], ['Muscle_Strength_Loss', 20.1, 'action'],
    ['Radiation_Dose_Daily', 1, 'watch'], ['Radiation_Dose_Daily', 5, 'watch'], ['Radiation_Dose_Daily', 5.1, 'action'],
    ['Radiation_Dose_Cumulative', 100, 'watch'], ['Radiation_Dose_Cumulative', 250, 'watch'], ['Radiation_Dose_Cumulative', 251, 'action'],
    ['Body_Temperature', 35.9, 'action'], ['Body_Temperature', 36.2, 'watch'], ['Body_Temperature', 37, 'normal'], ['Body_Temperature', 38.3, 'action'],
    ['Urine_Specific_Gravity', 1.004, 'watch'], ['Urine_Specific_Gravity', 1.02, 'normal'], ['Urine_Specific_Gravity', 1.029, 'action'],
    ['CO2_Partial_Pressure', 3, 'watch'], ['CO2_Partial_Pressure', 4.5, 'watch'], ['CO2_Partial_Pressure', 4.6, 'action'],
  ] as const)('%s=%s has status %s', (key, value, expected) => {
    expect(getBodyMeasureStatus(BODY_MEASURE_FIELD_BY_KEY[key], value)).toBe(expected);
  });

  it('classifies the requested blood pressure examples', () => {
    expect(getBodyMeasureStatus(BODY_MEASURE_FIELD_BY_KEY.Systolic_BP, 89)).toBe('action');
    expect(getBodyMeasureStatus(BODY_MEASURE_FIELD_BY_KEY.Diastolic_BP, 79)).toBe('normal');
    expect(getBodyMeasureStatus(BODY_MEASURE_FIELD_BY_KEY.Systolic_BP, 140)).toBe('action');
    expect(getBodyMeasureStatus(BODY_MEASURE_FIELD_BY_KEY.Diastolic_BP, 90)).toBe('action');
  });

  it('rejects impossible values and incomplete or inverted blood pressure, but accepts alerts', () => {
    expect(() => validateBodyMeasureValues({ SpO2: 120 })).toThrow(/plausible/);
    expect(() => validateBodyMeasureValues({ Body_Temperature: 3.7 })).toThrow(/plausible/);
    expect(() => validateBodyMeasureValues({ Systolic_BP: 89 })).toThrow(/ensemble/);
    expect(() => validateBodyMeasureValues({ Systolic_BP: 70, Diastolic_BP: 80 })).toThrow(/supérieure/);
    expect(() => validateBodyMeasureValues({ Heart_Rate: 40, Fasting_Glucose: 0.5 })).not.toThrow();
  });

  it('returns null for unmeasured fields and the newest record for measured fields', () => {
    expect(Object.values(mapBodyMeasureRecords([]))).toEqual(Array(13).fill(null));
    const records: Measurement[] = [
      { id: 'hr-old', astronautId: 'A', metric: 'heartRate', value: 72, unit: 'bpm', timestamp: 1, source: 'manual' },
      { id: 'hr-new', astronautId: 'A', metric: 'heartRate', value: 66, unit: 'bpm', timestamp: 2, source: 'manual' },
      { id: 'glucose', astronautId: 'A', metric: 'glucose', value: 95, unit: 'mg/dL', timestamp: 3, source: 'manual', context: 'fasting' }
    ];
    const data = mapBodyMeasureRecords(records);
    expect(data.Heart_Rate).toBe(66);
    expect(data.Fasting_Glucose).toBeCloseTo(0.95);
    expect(data.SpO2).toBeNull();
  });

  it('associates every configured indicator with an accessible body zone', () => {
    const assigned = Object.values(BODY_ZONE_FIELD_KEYS).flat();
    expect(BODY_ZONE_CONFIG).toHaveLength(6);
    expect(new Set(assigned)).toEqual(new Set(BODY_MEASURE_KEYS));
    expect(BODY_ZONE_CONFIG.find((zone) => zone.id === 'whole_body')?.access).toBe('button');
  });
});
