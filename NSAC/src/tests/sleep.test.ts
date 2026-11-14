import { describe, it, expect } from 'vitest';
import {
  calculateSleepScore,
  bedtimeToMinutesFromNoon,
  calculateBedtimeStdMinutes
} from '../engine/scores/sleep';
import type { SleepLog } from '../types';

describe('Engine: Sleep Quality Score Module', () => {
  it('correctly normalizes bedtimes spanning across midnight', () => {
    // 23:00 -> 11h from noon = 660 min
    const t23 = bedtimeToMinutesFromNoon('23:00');
    // 01:00 -> 13h from noon = 780 min
    const t01 = bedtimeToMinutesFromNoon('01:00');
    expect(t01 - t23).toBe(120); // 2 hours apart
  });

  it('calculates bedtime standard deviation', () => {
    const std = calculateBedtimeStdMinutes(['23:00', '23:30', '23:15']);
    expect(std).toBeGreaterThan(0);
    expect(std).toBeLessThan(30);
  });

  it('computes complete sleep score with all 4 dimensions when 3+ nights available', () => {
    const current: SleepLog = {
      id: 'log-1',
      astronautId: 'astro-1',
      date: '2026-11-14',
      hours: 8, // optimal 100
      bedtime: '23:00',
      latencyBucket: '<15', // optimal 100
      awakenings: 0, // optimal 100
      restfulness: 5 // optimal 100
    };

    const history: SleepLog[] = [
      {
        id: 'log-2',
        astronautId: 'astro-1',
        date: '2026-11-13',
        hours: 7.5,
        bedtime: '23:10',
        latencyBucket: '<15',
        awakenings: 1,
        restfulness: 4
      },
      {
        id: 'log-3',
        astronautId: 'astro-1',
        date: '2026-11-12',
        hours: 8,
        bedtime: '23:05',
        latencyBucket: '15-30',
        awakenings: 0,
        restfulness: 5
      }
    ];

    const result = calculateSleepScore(current, history);
    expect(result.confidence).toBe('complete');
    expect(result.missingInputs.length).toBe(0);
    expect(result.value).toBeGreaterThanOrEqual(95);
    expect(result.status).toBe('normal');
    expect(result.components.length).toBe(4);
  });

  it('renormalizes weights when fewer than 3 nights are recorded', () => {
    const singleNight: SleepLog = {
      id: 'log-single',
      astronautId: 'astro-1',
      date: '2026-11-14',
      hours: 8,
      bedtime: '23:00',
      latencyBucket: '15-30',
      awakenings: 1,
      restfulness: 4
    };

    const result = calculateSleepScore(singleNight, []);
    expect(result.confidence).toBe('partielle');
    expect(result.missingInputs).toContain('bedtime_regularity_7d');
    expect(result.components.length).toBe(3); // regularity excluded

    // Sum of normalized weights should equal 1.0
    const totalWeights = result.components.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeights).toBeCloseTo(1.0, 1);
  });

  it('triggers contact_flight_surgeon for severe sleep debt (<4h for 3 consecutive nights)', () => {
    const current: SleepLog = {
      id: 'log-bad-1',
      astronautId: 'astro-1',
      date: '2026-11-14',
      hours: 3.5,
      bedtime: '01:00',
      latencyBucket: '>60',
      awakenings: 4,
      restfulness: 1
    };

    const history: SleepLog[] = [
      {
        id: 'log-bad-2',
        astronautId: 'astro-1',
        date: '2026-11-13',
        hours: 3.0,
        bedtime: '02:00',
        latencyBucket: '>60',
        awakenings: 3,
        restfulness: 1
      },
      {
        id: 'log-bad-3',
        astronautId: 'astro-1',
        date: '2026-11-12',
        hours: 3.8,
        bedtime: '01:30',
        latencyBucket: '30-60',
        awakenings: 3,
        restfulness: 2
      }
    ];

    const result = calculateSleepScore(current, history);
    expect(result.status).toBe('contact_flight_surgeon');
    expect(result.explanation).toContain('moins de 4 heures de sommeil sur 3 nuits');
  });
});
