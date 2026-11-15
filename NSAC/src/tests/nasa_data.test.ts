import { describe, it, expect } from 'vitest';
import {
  parseTimepoint,
  sortSamplesChronologically,
  normalizeLabUnit,
  processNasaCsvData
} from '../services/nasaData';
import referenceData from '../../data/reference/reference.json';

describe('NASA LSDS-8 Data Preparation & Reference Pipeline', () => {
  it('correctly parses timepoint string into phase and signed days', () => {
    expect(parseTimepoint('L-92')).toEqual({ phase: 'L', days: -92, sortKey: -92 });
    expect(parseTimepoint('L-3')).toEqual({ phase: 'L', days: -3, sortKey: -3 });
    expect(parseTimepoint('R+1')).toEqual({ phase: 'R', days: 1, sortKey: 1 });
    expect(parseTimepoint('R+194')).toEqual({ phase: 'R', days: 194, sortKey: 194 });
  });

  it('sorts samples chronologically rather than alphabetically', () => {
    // In alphabetical sort: 'R+194' comes before 'R+45'!
    const rawSamples = ['R+194', 'L-92', 'R+1', 'L-3', 'R+45', 'L-44', 'R+82'];
    const sorted = sortSamplesChronologically(rawSamples);

    expect(sorted).toEqual([
      'L-92',
      'L-44',
      'L-3',
      'R+1',
      'R+45',
      'R+82',
      'R+194'
    ]);

    // Specifically test that R+45 comes before R+194
    const idxR45 = sorted.indexOf('R+45');
    const idxR194 = sorted.indexOf('R+194');
    expect(idxR45).toBeLessThan(idxR194);
  });

  it('normalizes laboratory units from pg/mL to ng/mL for cardiovascular proteins', () => {
    const rawCrp = normalizeLabUnit('pg_per_ml', 1500000);
    expect(rawCrp.normalizedUnit).toBe('ng/mL');
    expect(rawCrp.normalizedValue).toBe(1500);

    const normalGlucose = normalizeLabUnit('milligram_per_deciliter', 85);
    expect(normalGlucose.normalizedUnit).toBe('mg/dL');
    expect(normalGlucose.normalizedValue).toBe(85);
  });

  it('embedded reference.json contains 28 samples, exactly 23 missing values and 1 glucose anomaly', () => {
    expect(referenceData.summary.totalSamples).toBe(28);
    expect(referenceData.summary.missingValuesCount).toBe(23);
    expect(referenceData.summary.anomaliesCount).toBeGreaterThanOrEqual(1);

    // Look for the flagged 36 mg/dL glucose anomaly
    const glucoseAnomaly = referenceData.records.find(
      (r: any) => r.analyte === 'glucose' && r.value === 36
    );

    expect(glucoseAnomaly).toBeDefined();
    expect(glucoseAnomaly.isPlausibilityAnomaly).toBe(true);
    expect(glucoseAnomaly.isMissing).toBe(false); // Never silently deleted!
    expect(glucoseAnomaly.anomalyNote).toContain('anomalie possible');
  });

  it('provides reference ranges for key biomarkers', () => {
    const ranges = referenceData.referenceRanges;
    expect(ranges.glucose).toBeDefined();
    expect(ranges.glucose.refMin).toBe(70);
    expect(ranges.glucose.refMax).toBe(99);

    expect(ranges.calcium).toBeDefined();
    expect(ranges.creatinine).toBeDefined();
  });
});
