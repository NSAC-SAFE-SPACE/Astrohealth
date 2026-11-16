import { describe, expect, it } from 'vitest';
import { calculateStressAssessment, classifyStressScore, STRESS_QUESTION_IDS, type StressAnswers } from '../features/mental/assessments/stress';
import { calculateWellBeingAssessment, classifyWellBeingScore, WELLBEING_QUESTION_IDS, type WellBeingAnswers } from '../features/mental/assessments/wellbeing';
import { buildMentalPredictionFromAssessments } from '../services/predictionCompleteness';

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
  it('maps the distinct questionnaire outputs into the existing API fields', () => {
    const now = new Date().toISOString();
    const result = buildMentalPredictionFromAssessments([], [], [{
      id: 'stress-1', astronautId: 'crew-1', completedAt: now,
      answers: Object.fromEntries(STRESS_QUESTION_IDS.map((id) => [id, 2])) as StressAnswers,
      totalScore: 20, stressLevel: 'MEDIUM', questionnaireVersion: 'astrohealth-stress-v1'
    }], [{
      id: 'wellbeing-1', astronautId: 'crew-1', completedAt: now,
      answers: { q1: 4, q2: 4, q3: 4, q4: 4, q5: 4 }, rawScore: 20,
      wellBeingScore: 8, classification: 'HIGH', questionnaireVersion: 'astrohealth-wellbeing-v1'
    }], 'crew-1', Date.now());
    expect(result.payload).toMatchObject({ Stress_Level: 'Medium', Happiness: 8 });
    expect(result.missing.map((item) => item.key)).not.toContain('Stress_Level');
    expect(result.missing.map((item) => item.key)).not.toContain('Happiness');
    expect(result.complete).toBe(false); // Other AI context and sleep inputs are still required.
  });
});
