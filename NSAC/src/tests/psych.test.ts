import { describe, it, expect } from 'vitest';
import {
  calculatePsychScore,
  evaluatePsychStatus,
  WHO5_QUESTIONS,
  WHO5_CHOICES
} from '../engine/scores/psych';

describe('Engine: Psych Well-being (OMS-5 adapted) Module', () => {
  it('has 5 questions and 6 standard frequency choices', () => {
    expect(WHO5_QUESTIONS.length).toBe(5);
    expect(WHO5_CHOICES.length).toBe(6);
  });

  it('calculates score correctly as sum * 4', () => {
    // All 5s -> 25 * 4 = 100
    expect(calculatePsychScore([5, 5, 5, 5, 5])).toBe(100);
    // All 0s -> 0 * 4 = 0
    expect(calculatePsychScore([0, 0, 0, 0, 0])).toBe(0);
    // Mixed -> (4+3+2+1+0) = 10 * 4 = 40
    expect(calculatePsychScore([4, 3, 2, 1, 0])).toBe(40);
  });

  it('strictly validates critical boundary edge cases: 28 vs 29', () => {
    // 28 and below -> contact_flight_surgeon
    const eval28 = evaluatePsychStatus(28);
    expect(eval28.status).toBe('contact_flight_surgeon');
    expect(eval28.actions.some((a) => a.includes('Prendre contact immédiatement'))).toBe(true);

    // 29 -> action
    const eval29 = evaluatePsychStatus(29);
    expect(eval29.status).toBe('action');
  });

  it('strictly validates critical boundary edge cases: 49 vs 50', () => {
    // 49 -> action
    const eval49 = evaluatePsychStatus(49);
    expect(eval49.status).toBe('action');

    // 50 -> watch
    const eval50 = evaluatePsychStatus(50);
    expect(eval50.status).toBe('watch');
  });

  it('strictly validates critical boundary edge cases: 67 vs 68', () => {
    // 67 -> watch
    const eval67 = evaluatePsychStatus(67);
    expect(eval67.status).toBe('watch');

    // 68 -> normal
    const eval68 = evaluatePsychStatus(68);
    expect(eval68.status).toBe('normal');
  });
});
