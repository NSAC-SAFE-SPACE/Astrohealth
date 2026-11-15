import { describe, expect, it } from 'vitest';
import { summarizeOrientationResponses, summarizeReactionTimes } from '../services/cognitiveTests';

describe('cognitive test summaries', () => {
  it('uses the median reaction time and counts lapses at 500 ms or slower', () => {
    expect(summarizeReactionTimes([410, 520, 300, 490, 700])).toEqual({
      medianMs: 490,
      lapses: 2,
      trialCount: 5
    });
  });

  it('averages the middle two reaction times for an even trial count', () => {
    expect(summarizeReactionTimes([400, 200, 300, 500]).medianMs).toBe(350);
  });

  it('summarizes orientation accuracy separately from response speed', () => {
    expect(summarizeOrientationResponses([true, false, true, true], [800, 900, 600, 700])).toEqual({
      accuracy: 75,
      correctCount: 3,
      meanResponseMs: 750,
      trialCount: 4
    });
  });
});
