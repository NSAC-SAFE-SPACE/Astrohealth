import { describe, it, expect } from 'vitest';
import { assessMeasurement, escalateStatus } from '../engine/status';

describe('Engine: Generic Status & Baseline Escalation', () => {
  it('correctly assesses normal biometric range', () => {
    const res = assessMeasurement('heartRate', 72);
    expect(res.status).toBe('normal');
    expect(res.actions.length).toBeGreaterThan(0);
  });

  it('triggers watch when exceeding normal range', () => {
    const res = assessMeasurement('heartRate', 105);
    expect(res.status).toBe('watch');
  });

  it('triggers action when reaching action threshold', () => {
    const res = assessMeasurement('heartRate', 125);
    expect(res.status).toBe('action');
  });

  it('triggers contact_flight_surgeon for fever >= 38.0°C', () => {
    const res = assessMeasurement('temperature', 38.2);
    expect(res.status).toBe('contact_flight_surgeon');
  });

  it.each([
    ['temperature', 37.3, 'watch'],
    ['temperature', 37.6, 'action'],
    ['temperature', 38, 'contact_flight_surgeon'],
    ['sleepHours', 6.5, 'watch'],
    ['sleepHours', 5, 'action'],
    ['sleepHours', 4, 'contact_flight_surgeon'],
    ['spo2', 96, 'normal'],
    ['spo2', 93, 'watch'],
    ['spo2', 90, 'action'],
    ['spo2', 87, 'contact_flight_surgeon']
  ] as const)('classifies %s=%s as %s', (metric, value, expectedStatus) => {
    expect(assessMeasurement(metric, value).status).toBe(expectedStatus);
  });

  it('escalates status when baseline divergence exceeds |z| > 2', () => {
    // Normal absolute value (78 bpm), but astronaut baseline is 60 bpm with std 5 bpm (z = +3.6)
    const res = assessMeasurement('heartRate', 78, { mean: 60, std: 5 });
    expect(res.status).toBe('watch'); // Escalated from normal to watch
    expect(res.baselineDeviation).toBeCloseTo(3.6, 1);
    expect(res.drivers.length).toBeGreaterThan(0);
  });

  it('escalates severity when multiple indicators are degraded', () => {
    // Value would normally be watch, but with 2+ concurrent degraded indicators, escalates to action
    const res = assessMeasurement('heartRate', 105, undefined, 2);
    expect(res.status).toBe('action');
  });

  it('correctly handles escalateStatus boundaries', () => {
    expect(escalateStatus('normal', 1)).toBe('watch');
    expect(escalateStatus('watch', 1)).toBe('action');
    expect(escalateStatus('action', 1)).toBe('contact_flight_surgeon');
    expect(escalateStatus('contact_flight_surgeon', 1)).toBe('contact_flight_surgeon');
  });
});
