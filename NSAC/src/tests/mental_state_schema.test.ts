import { describe, expect, it } from 'vitest';
import { EXAMPLE_MENTAL_STATE, MENTAL_STATE_KEYS, migrateLegacyMentalStateData, validate_mental_state } from '../features/mental/mentalState';
import { calculateSleepScore, computePsychSleepQuality } from '../engine/scores/sleep';
import { defaultSleepLogValues } from '../ui/SleepLogFields';

describe('nouveau schéma Psyché', () => {
  it('accepte les huit champs valides dans le bon ordre et types', () => {
    expect(validate_mental_state(EXAMPLE_MENTAL_STATE, { sleepQualityCalculated: true })).toBe(true);
    expect(Object.keys(EXAMPLE_MENTAL_STATE)).toEqual(MENTAL_STATE_KEYS);
    expect(typeof EXAMPLE_MENTAL_STATE.Happiness).toBe('number');
    expect(Number.isInteger(EXAMPLE_MENTAL_STATE.Happiness)).toBe(true);
    expect(typeof EXAMPLE_MENTAL_STATE.Sleep_Quality).toBe('number');
    expect(typeof EXAMPLE_MENTAL_STATE.Communication_with_Earth_mins).toBe('number');
  });

  it.each([
    [{ ...EXAMPLE_MENTAL_STATE, Happiness: 11 }, /Happiness/],
    [{ ...EXAMPLE_MENTAL_STATE, Stress_level: 'high' }, /Stress_level/],
    [{ ...EXAMPLE_MENTAL_STATE, Sleep_Quality: 63 }, /Sleep_Quality/],
    [Object.fromEntries(Object.entries(EXAMPLE_MENTAL_STATE).filter(([key]) => key !== 'Food')), /clés/]
  ])('refuse les valeurs invalides', (data, message) => {
    expect(() => validate_mental_state(data)).toThrow(message);
  });

  it('migre la clé historique Mood Score en Mood_Score sans perdre la valeur ni l’ordre', () => {
    const legacy = Object.fromEntries(Object.entries(EXAMPLE_MENTAL_STATE).map(([key, value]) => [key === 'Mood_Score' ? 'Mood Score' : key, value]));
    const migrated = migrateLegacyMentalStateData(legacy) as Record<string, unknown>;
    expect(Object.keys(migrated)).toEqual(MENTAL_STATE_KEYS);
    expect(migrated.Mood_Score).toBe('positive');
    expect(migrated).not.toHaveProperty('Mood Score');
    expect(validate_mental_state(migrated, { sleepQualityCalculated: true })).toBe(true);
  });

  it('prouve que le score de sommeil existant va de 0 à 100 et n’est pas compatible tel quel avec 0–62.53', () => {
    const base = { id: 's', astronautId: 'a', date: '2026-11-15', hours: 7, bedtime: '23:00', latencyBucket: '<15' as const, awakenings: 1, restfulness: 5 };
    expect(calculateSleepScore({ ...base, hours: 3, latencyBucket: '>60', awakenings: 5, restfulness: 1 }).value).toBe(3);
    expect(calculateSleepScore(base).value).toBe(100);
    expect(computePsychSleepQuality(base)).toBe(62.53);
    expect(computePsychSleepQuality({ ...base, hours: 3, latencyBucket: '>60', awakenings: 5, restfulness: 1 })).toBe(1.88);
    expect(() => validate_mental_state({ ...EXAMPLE_MENTAL_STATE, Sleep_Quality: 100 }, { sleepQualityCalculated: true })).toThrow(/62.53/);
  });

  it('démarre avec les cinq paramètres sommeil non renseignés', () => {
    expect(defaultSleepLogValues).toEqual({ hours: 0, bedtime: '', latencyBucket: '', awakenings: -1, restfulness: 0 });
  });
});
