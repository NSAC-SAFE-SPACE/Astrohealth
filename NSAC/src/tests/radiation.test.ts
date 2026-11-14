import { describe, it, expect } from 'vitest';
import {
  projectRadiation,
  convertMicroSvPerHourToMilliSvPerDay
} from '../engine/scores/radiation';

describe('Engine: Radiation Exposure Module', () => {
  it('correctly converts µSv/h to mSv/day', () => {
    // 25 µSv/h * 24 h = 600 µSv/day = 0.60 mSv/day
    expect(convertMicroSvPerHourToMilliSvPerDay(25)).toBe(0.6);
  });

  it('detects dose decrease anomaly without silent discard', () => {
    const history = [
      { date: '2026-11-13', cumulativeDose_mSv: 50.0 },
      { date: '2026-11-12', cumulativeDose_mSv: 48.0 }
    ];

    // Current dose entered is 40 mSv (< 50 mSv)
    const result = projectRadiation(40.0, 'spacecraft', history);
    expect(result.isDecreaseAnomaly).toBe(true);
    expect(result.decreaseAnomalyMessage).toContain('inférieure à la précédente');
    expect(result.actions.some((a) => a.includes('Attention'))).toBe(true);
  });

  it('detects solar particle events (SPE) spikes > 3x typical rate as watch', () => {
    // Deep space spacecraft typical is 1.8 mSv/day. A spike of 6.0 mSv/day is > 3.3x
    const result = projectRadiation(45.0, 'spacecraft', [], 0, 6.0);
    expect(result.isSpike).toBe(true);
    expect(result.spikeFactor).toBeCloseTo(3.3, 1);
    expect(result.status).toBe('watch');
    expect(result.spikeMessage).toContain('rejoignez la zone la plus protégée');
  });

  it('detects severe solar particle events spikes > 10x typical rate as contact_flight_surgeon', () => {
    // Surface rover typical is 0.6 mSv/day. A massive flare at 8.0 mSv/day is > 13x
    const result = projectRadiation(30.0, 'mars_rover', [], 0, 8.0);
    expect(result.isSpike).toBe(true);
    expect(result.spikeFactor).toBeGreaterThanOrEqual(10.0);
    expect(result.status).toBe('contact_flight_surgeon');
    expect(result.actions.some((a) => a.includes('storm shelter'))).toBe(true);
  });

  it('evaluates cumulative career dose against 600 mSv limit', () => {
    // 400 mSv cumulative + 100 mSv prior = 500 mSv (83.3% of 600 mSv -> action threshold >= 75%)
    const result = projectRadiation(400.0, 'spacecraft', [], 100.0, 1.8);
    expect(result.totalCareerDose_mSv).toBe(500.0);
    expect(result.percentOfCareerLimit).toBeCloseTo(83.3, 1);
    expect(result.status).toBe('action');
  });

  it('computes linear projections at 30 days and end of mission', () => {
    const history = [
      { date: '2026-11-10', cumulativeDose_mSv: 20.0 },
      { date: '2026-11-11', cumulativeDose_mSv: 21.0 },
      { date: '2026-11-12', cumulativeDose_mSv: 22.0 }
    ];

    const result = projectRadiation(23.0, 'station', history, 0, 1.0, 60);
    // 30 days nominal: 23 + 1.0 * 30 = 53.0 mSv
    expect(result.projected30d.nominal).toBe(53.0);
    expect(result.projected30d.min).toBeLessThanOrEqual(result.projected30d.nominal);
    expect(result.projected30d.max).toBeGreaterThanOrEqual(result.projected30d.nominal);

    // End of mission (60 days)
    expect(result.projectedEndOfMission?.nominal).toBe(83.0);
  });
});
