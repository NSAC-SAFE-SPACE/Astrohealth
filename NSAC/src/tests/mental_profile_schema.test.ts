import { describe, expect, it } from 'vitest';
import { EXAMPLE_MENTAL_STATE, validate_mental_state } from '../features/mental/mentalState';

describe('contrats de profil et auto-évaluation', () => {
  it('accepte et garde les huit propriétés brutes, typées et ordonnées', () => {
    expect(validate_mental_state(EXAMPLE_MENTAL_STATE, { sleepQualityCalculated: true })).toBe(true);
    expect(Object.keys(EXAMPLE_MENTAL_STATE)).toEqual(['Stress_level', 'Happiness', 'Mood_Score', 'Sleep_Quality', 'Workload Perception', 'Time_Perception', 'Food', 'Communication_with_Earth_mins']);
  });
  it('refuse les anciennes catégories minuscules, les plages erronées et les données manquantes', () => {
    expect(() => validate_mental_state({ ...EXAMPLE_MENTAL_STATE, Happiness: 11 })).toThrow();
    expect(() => validate_mental_state({ ...EXAMPLE_MENTAL_STATE, Stress_level: 'high' })).toThrow();
    expect(() => validate_mental_state({ ...EXAMPLE_MENTAL_STATE, Sleep_Quality: 63 })).toThrow();
    const { Food: _food, ...missing } = EXAMPLE_MENTAL_STATE;
    expect(() => validate_mental_state(missing)).toThrow();
  });
  it('tolère un ancien enregistrement sans champs bruts en laissant l’accès au nouveau format vide', () => {
    const legacy = { date: '2025-01-01', answers: [3, 4, 2] };
    expect((legacy as { mentalStateData?: unknown }).mentalStateData).toBeUndefined();
  });
});
