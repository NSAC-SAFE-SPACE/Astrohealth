import { describe, it, expect } from 'vitest';
import {
  calculateSiteBoneLoss,
  calculateMultiSiteBoneLoss
} from '../engine/scores/bone';
import type { BoneDensityRecord } from '../types';

describe('Engine: Bone Loss Module', () => {
  it('computes bone loss percentage and monthly velocity', () => {
    const baseline: BoneDensityRecord = {
      id: 'base-1',
      astronautId: 'astro-1',
      date: '2026-01-01',
      site: 'total_hip',
      valueGcm2: 1.0,
      method: 'dxa',
      isBaseline: true
    };

    const current: BoneDensityRecord = {
      id: 'curr-1',
      astronautId: 'astro-1',
      date: '2026-04-01', // ~3 months later (~90 days)
      site: 'total_hip',
      valueGcm2: 0.96, // 4.0% loss
      method: 'dxa',
      isBaseline: false
    };

    const res = calculateSiteBoneLoss(baseline, current);
    expect(res.lossPercent).toBe(4.0);
    expect(res.monthsElapsed).toBeCloseTo(3.0, 1);
    expect(res.ratePerMonth).toBeCloseTo(1.33, 1);
    expect(res.status).toBe('watch'); // >2% to 5% is watch
    expect(res.isNoise).toBe(false);
  });

  it('rejects comparison across mismatched anatomical sites', () => {
    const baseline: BoneDensityRecord = {
      id: 'b-1',
      astronautId: 'astro-1',
      date: '2026-01-01',
      site: 'lumbar_spine',
      valueGcm2: 1.2,
      method: 'dxa',
      isBaseline: true
    };

    const current: BoneDensityRecord = {
      id: 'c-1',
      astronautId: 'astro-1',
      date: '2026-03-01',
      site: 'heel', // Different site!
      valueGcm2: 0.5,
      method: 'dxa',
      isBaseline: false
    };

    expect(() => calculateSiteBoneLoss(baseline, current)).toThrow('Incompatibilité anatomique');
  });

  it('rejects comparison across mismatched imaging methods', () => {
    const baseline: BoneDensityRecord = {
      id: 'b-1',
      astronautId: 'astro-1',
      date: '2026-01-01',
      site: 'total_hip',
      valueGcm2: 1.0,
      method: 'dxa',
      isBaseline: true
    };

    const current: BoneDensityRecord = {
      id: 'c-1',
      astronautId: 'astro-1',
      date: '2026-03-01',
      site: 'total_hip',
      valueGcm2: 0.98,
      method: 'ultrasound', // Different method!
      isBaseline: false
    };

    expect(() => calculateSiteBoneLoss(baseline, current)).toThrow('Incompatibilité méthodologique');
  });

  it('recognizes measurement noise when loss is within +/- 2%', () => {
    const baseline: BoneDensityRecord = {
      id: 'b-1',
      astronautId: 'astro-1',
      date: '2026-01-01',
      site: 'femoral_neck',
      valueGcm2: 0.95,
      method: 'dxa',
      isBaseline: true
    };

    const current: BoneDensityRecord = {
      id: 'c-1',
      astronautId: 'astro-1',
      date: '2026-02-01',
      site: 'femoral_neck',
      valueGcm2: 0.94, // ~1.05% loss <= 2% noise margin
      method: 'dxa',
      isBaseline: false
    };

    const res = calculateSiteBoneLoss(baseline, current);
    expect(res.isNoise).toBe(true);
    expect(res.status).toBe('normal');
    expect(res.explanation).toContain("dans la marge d'incertitude");
  });

  it('triggers contact_flight_surgeon when monthly velocity > 1.5%/month or loss > 8%', () => {
    const baseline: BoneDensityRecord = {
      id: 'b-1',
      astronautId: 'astro-1',
      date: '2026-01-01',
      site: 'total_hip',
      valueGcm2: 1.0,
      method: 'dxa',
      isBaseline: true
    };

    // 2 months in, 4% loss -> 2.0%/month (> 1.5%/month critical rate)
    const currentFastDecline: BoneDensityRecord = {
      id: 'c-1',
      astronautId: 'astro-1',
      date: '2026-03-02',
      site: 'total_hip',
      valueGcm2: 0.96,
      method: 'dxa',
      isBaseline: false
    };

    const res = calculateSiteBoneLoss(baseline, currentFastDecline);
    expect(res.status).toBe('contact_flight_surgeon');
    expect(res.ratePerMonth).toBeGreaterThan(1.5);
  });

  it('evaluates multi-site assessments and aggregates components', () => {
    const baselines: BoneDensityRecord[] = [
      { id: 'b1', astronautId: 'a1', date: '2026-01-01', site: 'lumbar_spine', valueGcm2: 1.1, method: 'dxa', isBaseline: true },
      { id: 'b2', astronautId: 'a1', date: '2026-01-01', site: 'total_hip', valueGcm2: 1.0, method: 'dxa', isBaseline: true }
    ];

    const currents: BoneDensityRecord[] = [
      { id: 'c1', astronautId: 'a1', date: '2026-04-01', site: 'lumbar_spine', valueGcm2: 1.07, method: 'dxa', isBaseline: false },
      { id: 'c2', astronautId: 'a1', date: '2026-04-01', site: 'total_hip', valueGcm2: 0.97, method: 'dxa', isBaseline: false }
    ];

    const multi = calculateMultiSiteBoneLoss(baselines, currents);
    expect(multi.confidence).toBe('complete');
    expect(multi.components.length).toBe(2);
    expect(multi.meanLossPercent).toBeGreaterThan(2.0);
  });
});
