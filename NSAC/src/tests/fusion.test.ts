import { describe, it, expect } from 'vitest';
import { detectPatterns, fuseHealthStatus } from '../engine';

describe('Engine Fusion & Multi-Metric Patterns', () => {
  it('returns no patterns when all metrics are nominal', () => {
    const patterns = detectPatterns({
      heartRate: 68,
      temperature: 36.8,
      sleepHours: 7.5,
      bpSys: 118,
      mood: 75,
      glucose: 85,
      exerciseMin: 60,
      boneLossPercent: 0.5,
      missionDays: 10
    });

    expect(patterns.length).toBe(0);
    const fused = fuseHealthStatus(['normal', 'normal', 'normal'], patterns);
    expect(fused.overallStatus).toBe('normal');
  });

  it('detects fatigue / early infection pattern when HR is high, temp is high and sleep is low', () => {
    const patterns = detectPatterns({
      heartRate: 98,
      temperature: 37.8,
      sleepHours: 4.8
    });

    const infectionPattern = patterns.find((p) => p.id === 'fatigue_infection');
    expect(infectionPattern).toBeDefined();
    expect(infectionPattern?.severity).toBe('action');
    expect(infectionPattern?.involvedMetrics).toEqual(['heartRate', 'temperature', 'sleepHours']);
  });

  it('escalates fatigue / infection pattern to contact_flight_surgeon when fever >= 38.0°C', () => {
    const patterns = detectPatterns({
      heartRate: 110,
      temperature: 38.4,
      sleepHours: 4.0
    });

    const infectionPattern = patterns.find((p) => p.id === 'fatigue_infection');
    expect(infectionPattern?.severity).toBe('contact_flight_surgeon');

    const fused = fuseHealthStatus(['watch', 'normal'], patterns);
    expect(fused.overallStatus).toBe('contact_flight_surgeon');
  });

  it('detects chronic stress pattern (high BP + high HR + low mood)', () => {
    const patterns = detectPatterns({
      bpSys: 142,
      bpDia: 92,
      heartRate: 92,
      mood: 40 // WHO-5 in action range
    });

    const stressPattern = patterns.find((p) => p.id === 'chronic_stress');
    expect(stressPattern).toBeDefined();
    expect(stressPattern?.severity).toBe('watch');
    expect(stressPattern?.involvedMetrics).toContain('bpSys');
    expect(stressPattern?.involvedMetrics).toContain('heartRate');
    expect(stressPattern?.involvedMetrics).toContain('mood');
  });

  it('detects metabolic imbalance pattern (high glucose + low exercise)', () => {
    const patterns = detectPatterns({
      glucose: 130,
      exerciseMin: 15
    });

    const metabPattern = patterns.find((p) => p.id === 'metabolic_imbalance');
    expect(metabPattern).toBeDefined();
    expect(metabPattern?.involvedMetrics).toEqual(['glucose', 'exerciseMin']);
  });

  it('detects accelerated bone loss pattern when resistance exercise is insufficient in prolonged mission', () => {
    const patterns = detectPatterns({
      exerciseMin: 10,
      missionDays: 60,
      boneLossPercent: 3.2
    });

    const bonePattern = patterns.find((p) => p.id === 'accelerated_bone_loss');
    expect(bonePattern).toBeDefined();
    expect(bonePattern?.involvedMetrics).toEqual(['boneProxy', 'exerciseMin']);
  });

  it('fuseHealthStatus escalates overall status when 2 or more watch statuses co-occur', () => {
    // 2 watch statuses trigger multi-indicator degradation escalation to action
    const fused = fuseHealthStatus(['watch', 'watch', 'normal'], []);
    expect(fused.overallStatus).toBe('action');
  });
});
