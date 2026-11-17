import { describe, expect, it } from 'vitest';
import { calculateStressAssessment, classifyStressScore, STRESS_QUESTION_IDS, type StressAnswers } from '../features/mental/assessments/stress';
import { calculateWellBeingAssessment, classifyWellBeingScore, WELLBEING_QUESTION_IDS, type WellBeingAnswers } from '../features/mental/assessments/wellbeing';
import { adaptMentalPayload } from '../services/predictionCompleteness';
import { buildMentalPrediction } from '../services/predictionCompleteness';
import { computePsychSleepQuality } from '../engine/scores/sleep';
import { createMentalStateFromQuestionnaires, EXAMPLE_MENTAL_STATE, MENTAL_STATE_FIELDS, MENTAL_STATE_KEYS } from '../features/mental/mentalState';

describe('AstroHealth stress assessment scoring', () => {
  it('reverse scores the two positive questions and reports the expected minimum', () => {
    const answers = Object.fromEntries(STRESS_QUESTION_IDS.map((id) => [id, 0])) as StressAnswers;
    expect(calculateStressAssessment(answers)).toEqual({ totalScore: 8, stressLevel: 'LOW' });
  });
  it('scores the maximum and handles category boundaries', () => {
    const answers = Object.fromEntries(STRESS_QUESTION_IDS.map((id, index) => [id, index < 8 ? 4 : 0])) as StressAnswers;
    expect(calculateStressAssessment(answers)).toEqual({ totalScore: 40, stressLevel: 'HIGH' });
    expect(classifyStressScore(13)).toBe('LOW'); expect(classifyStressScore(14)).toBe('MEDIUM');
    expect(classifyStressScore(26)).toBe('MEDIUM'); expect(classifyStressScore(27)).toBe('HIGH');
    const intermediate = Object.fromEntries(STRESS_QUESTION_IDS.map((id, index) => [id, index < 5 ? 2 : 1])) as StressAnswers;
    expect(calculateStressAssessment(intermediate).stressLevel).toBe('MEDIUM');
  });
  it('rejects missing answers and verifies reversed Q9/Q10 scoring', () => {
    expect(() => calculateStressAssessment({ q1: 1 })).toThrow();
    const answers = Object.fromEntries(STRESS_QUESTION_IDS.map((id) => [id, 0])) as StressAnswers;
    answers.q9 = 4; answers.q10 = 4;
    expect(calculateStressAssessment(answers).totalScore).toBe(0);
  });
});

describe('AstroHealth well-being assessment scoring', () => {
  it('calculates minimum, maximum, and intermediate values', () => {
    expect(calculateWellBeingAssessment(Object.fromEntries(WELLBEING_QUESTION_IDS.map((id) => [id, 0])) as WellBeingAnswers)).toEqual({ rawScore: 0, wellBeingScore: 0, classification: 'LOW' });
    expect(calculateWellBeingAssessment(Object.fromEntries(WELLBEING_QUESTION_IDS.map((id) => [id, 5])) as WellBeingAnswers)).toEqual({ rawScore: 25, wellBeingScore: 10, classification: 'HIGH' });
    expect(calculateWellBeingAssessment({ q1: 3, q2: 3, q3: 3, q4: 3, q5: 3 })).toEqual({ rawScore: 15, wellBeingScore: 6, classification: 'MEDIUM' });
  });
  it('uses unrounded category boundaries and rejects missing answers', () => {
    expect(classifyWellBeingScore(3.9)).toBe('LOW'); expect(classifyWellBeingScore(4)).toBe('MEDIUM');
    expect(classifyWellBeingScore(6.9)).toBe('MEDIUM'); expect(classifyWellBeingScore(7)).toBe('HIGH');
    expect(() => calculateWellBeingAssessment({ q1: 5 })).toThrow();
  });
});

describe('mental prediction adapter', () => {
  it('retains every original model field and its existing scale', () => {
    expect(MENTAL_STATE_KEYS).toEqual(['Stress_level', 'Happiness', 'Mood_Score', 'Sleep_Quality', 'Workload Perception', 'Time_Perception', 'Food', 'Communication_with_Earth_mins']);
    expect(MENTAL_STATE_FIELDS.find((field) => field.key === 'Stress_level')).toMatchObject({ options: ['High', 'Medium', 'Low'] });
    expect(MENTAL_STATE_FIELDS.find((field) => field.key === 'Happiness')).toMatchObject({ min: 0, max: 10, integer: true });
    expect(MENTAL_STATE_FIELDS.find((field) => field.key === 'Communication_with_Earth_mins')).toMatchObject({ min: 0, unit: 'hours' });
  });

  it('maps both questionnaire results into the exact eight-field model contract', () => {
    const { Stress_level: _stress, Happiness: _happiness, Sleep_Quality: _sleep, ...otherAnswers } = EXAMPLE_MENTAL_STATE;
    const preciseQuestionnaireScore = 6.8;
    const mentalState = createMentalStateFromQuestionnaires('MEDIUM', preciseQuestionnaireScore, otherAnswers, 45.2);
    const payload = adaptMentalPayload(mentalState);
    expect(mentalState).toEqual({
      Stress_level: 'Medium', Happiness: 7, Mood_Score: 'positive', Sleep_Quality: 45.2,
      'Workload Perception': 'possible', Time_Perception: 'Normal', Food: 'Good', Communication_with_Earth_mins: 1.5
    });
    expect(Object.keys(payload)).toEqual(['Stress_Level', 'Happiness', 'Mood_Score', 'Sleep_Quality', 'Workload Perception', 'Time_Perception', 'Food', 'Communication_with_Earth_mins']);
    expect(payload).toMatchObject({ Stress_Level: 'Medium', Happiness: 7, Communication_with_Earth_mins: 90 });
    expect(payload).not.toHaveProperty('rawScore');
    expect(payload).not.toHaveProperty('WellBeingScore');
    expect(preciseQuestionnaireScore).toBe(6.8);
  });

  it('arrondit Happiness au plus proche et refuse un score hors plage', () => {
    const { Stress_level: _stress, Happiness: _happiness, Sleep_Quality: _sleep, ...otherAnswers } = EXAMPLE_MENTAL_STATE;
    expect(createMentalStateFromQuestionnaires('HIGH', 6.4, otherAnswers, 40).Happiness).toBe(6);
    expect(createMentalStateFromQuestionnaires('LOW', 6.8, otherAnswers, 40).Happiness).toBe(7);
    expect(() => createMentalStateFromQuestionnaires('LOW', 10.1, otherAnswers, 40)).toThrow(/0 et 10/);
  });

  it('chooses the latest complete collection when multiple evaluations share one date', () => {
    const date = '2026-11-16';
    const now = Date.parse(`${date}T18:00:00.000Z`);
    const sleep = { id: 'sleep-current', astronautId: 'AST-TEST', date, hours: 7, bedtime: '22:00', latencyBucket: '<15' as const, awakenings: 1, restfulness: 4 };
    const quality = computePsychSleepQuality(sleep);
    const oldState = { ...EXAMPLE_MENTAL_STATE, Sleep_Quality: quality, Happiness: 2 };
    const newState = { ...EXAMPLE_MENTAL_STATE, Sleep_Quality: quality, Happiness: 8, Stress_level: 'High' as const };
    const result = buildMentalPrediction([
      { id: 'old', astronautId: 'AST-TEST', date, completedAt: `${date}T15:00:00.000Z`, answers: [], score: 20, status: 'action', mentalStateData: oldState },
      { id: 'new', astronautId: 'AST-TEST', date, completedAt: `${date}T17:00:00.000Z`, answers: [], score: 80, status: 'normal', mentalStateData: newState }
    ], [sleep], 'AST-TEST', now);
    expect(result.complete).toBe(true);
    expect(result.assessment?.id).toBe('new');
    expect(result.payload).toMatchObject({ Stress_Level: 'High', Happiness: 8 });
  });
});
