import { describe, it, expect } from 'vitest';
import {
  calculateCardioScore,
  calculatePenSys,
  calculatePenHR,
  calculateTerrainFactor
} from '../engine/scores/cardio';

describe('Engine: Cardiovascular Index Module', () => {
  it('strictly respects monotonicity: rising blood pressure never increases score', () => {
    let prevPen = -1;
    for (let sys = 110; sys <= 180; sys += 5) {
      const pen = calculatePenSys(sys);
      expect(pen).toBeGreaterThanOrEqual(prevPen);
      prevPen = pen;
    }
  });

  it('strictly respects monotonicity: rising resting HR never increases score', () => {
    let prevPen = -1;
    for (let hr = 60; hr <= 140; hr += 5) {
      const { penalty } = calculatePenHR(hr, 'male');
      expect(penalty).toBeGreaterThanOrEqual(prevPen);
      prevPen = penalty;
    }
  });

  it('applies female HR offset (-3 bpm) correctly', () => {
    const male = calculatePenHR(70, 'male');
    const female = calculatePenHR(70, 'female'); // evaluated at 67 bpm
    expect(female.correctedHr).toBe(67);
    expect(female.penalty).toBeLessThanOrEqual(male.penalty);
  });

  it('calculates terrain factor across age and sex thresholds', () => {
    // Young male (<40)
    expect(calculateTerrainFactor(32, 'male')).toBe(1.0);
    // 46 yo male: age 40-54 factor 1.10 + 0.05 sex bonus (male >= 45) = 1.15
    expect(calculateTerrainFactor(46, 'male')).toBe(1.15);
    // 56 yo female: age 55-69 factor 1.25 + 0.05 sex bonus (female >= 55) = 1.30
    expect(calculateTerrainFactor(56, 'female')).toBe(1.3);
  });

  it('smoothes isolated spikes by averaging up to 3 recent readings', () => {
    // Isolated acute spike amidst calm baseline
    const measurements = [
      { sys: 150, hr: 95 }, // isolated spike
      { sys: 115, hr: 65 },
      { sys: 112, hr: 62 }
    ];

    const result = calculateCardioScore(measurements, { age: 38, sex: 'male' });
    // Average sys is (150+115+112)/3 = 125.7 mmHg
    expect(result.meanSys).toBeCloseTo(125.7, 1);
    // The smoothed score is 84 (normal), avoiding the false alarm of the isolated spike alone
    expect(result.value).toBe(84);
    expect(result.status).toBe('normal');
    expect(result.confidence).toBe('complete');

    // In contrast, evaluating the single spike alone yields an action status
    const singleSpikeResult = calculateCardioScore([{ sys: 150, hr: 95 }], { age: 38, sex: 'male' });
    expect(singleSpikeResult.status).toBe('action');
  });

  it('escalates to contact_flight_surgeon for extreme systolic pressure (>= 180 mmHg)', () => {
    const measurements = [
      { sys: 182, hr: 80 },
      { sys: 180, hr: 82 },
      { sys: 184, hr: 85 }
    ];

    const result = calculateCardioScore(measurements, { age: 40, sex: 'male' });
    expect(result.status).toBe('contact_flight_surgeon');
  });

  it('escalates to contact_flight_surgeon for extreme resting tachycardia (> 130 bpm)', () => {
    const measurements = [
      { sys: 120, hr: 135 },
      { sys: 122, hr: 132 },
      { sys: 125, hr: 134 }
    ];

    const result = calculateCardioScore(measurements, { age: 35, sex: 'female' });
    expect(result.status).toBe('contact_flight_surgeon');
  });
});
