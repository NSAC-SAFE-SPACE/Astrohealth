export interface ProcessedNasaLabRecord {
  sampleId: string;
  subject: string;
  phase: 'L' | 'R';
  daysFromLaunch: number; // e.g. -92, -44, -3, +1, +45, +82, +194
  analyte: string;
  value: number | null;
  unit: string;
  refMin?: number;
  refMax?: number;
  percentOfBaseline?: number;
  isMissing: boolean;
  isPlausibilityAnomaly: boolean;
  anomalyNote?: string;
}

export interface NasaPreparationSummary {
  totalSamples: number;
  totalRecords: number;
  subjectsCount: number;
  missingValuesCount: number;
  anomaliesCount: number;
  chronologicalOrder: string[];
}

export interface PreparedNasaData {
  summary: NasaPreparationSummary;
  records: ProcessedNasaLabRecord[];
  analyteReferenceRanges: Record<string, { refMin: number; refMax: number; unit: string }>;
}

/**
 * Parses timepoint string (e.g. "L-92", "R+1", "R+194") into phase ('L' | 'R') and signed days.
 */
export function parseTimepoint(timepointStr: string): { phase: 'L' | 'R'; days: number; sortKey: number } {
  const clean = timepointStr.trim();
  const phaseMatch = clean.match(/^([LR])([+-]?\d+)$/i);

  if (phaseMatch) {
    const phase = phaseMatch[1].toUpperCase() as 'L' | 'R';
    const num = parseInt(phaseMatch[2], 10);
    // Sort key: L-92 -> -92, L-44 -> -44, L-3 -> -3, R+1 -> 1, R+45 -> 45, R+194 -> 194
    const sortKey = phase === 'L' ? -Math.abs(num) : Math.abs(num);
    return { phase, days: sortKey, sortKey };
  }

  return { phase: 'L', days: 0, sortKey: 0 };
}

/**
 * Chronologically sorts sample records.
 * Solves alphabetical order bug (e.g., 'R+194' comes before 'R+45' alphabetically).
 */
export function sortSamplesChronologically(samples: string[]): string[] {
  return [...samples].sort((a, b) => {
    const tpA = a.includes('_') ? a.split('_')[1] : a;
    const tpB = b.includes('_') ? b.split('_')[1] : b;
    return parseTimepoint(tpA).sortKey - parseTimepoint(tpB).sortKey;
  });
}

/**
 * Normalizes biomedical unit strings and converts values where needed.
 */
export function normalizeLabUnit(unit: string, value: number | null): { normalizedUnit: string; normalizedValue: number | null } {
  if (value === null || isNaN(value)) {
    return { normalizedUnit: unit, normalizedValue: null };
  }

  // Convert pg/mL to ng/mL for cardiovascular proteins
  if (unit === 'pg_per_ml' || unit === 'pg/mL') {
    return {
      normalizedUnit: 'ng/mL',
      normalizedValue: Number((value / 1000).toFixed(3))
    };
  }

  if (unit === 'milligram_per_deciliter') return { normalizedUnit: 'mg/dL', normalizedValue: value };
  if (unit === 'gram_per_deciliter') return { normalizedUnit: 'g/dL', normalizedValue: value };
  if (unit === 'millimole_per_liter') return { normalizedUnit: 'mmol/L', normalizedValue: value };
  if (unit === 'unit_per_liter') return { normalizedUnit: 'U/L', normalizedValue: value };

  return { normalizedUnit: unit, normalizedValue: value };
}

/**
 * Processes raw CSV contents of CMP and Eve panels into structured long format.
 */
export function processNasaCsvData(cmpCsvContent: string, eveCsvContent?: string): PreparedNasaData {
  const records: ProcessedNasaLabRecord[] = [];
  const referenceRanges: Record<string, { refMin: number; refMax: number; unit: string }> = {};
  let missingValuesCount = 0;
  let anomaliesCount = 0;

  // Process CMP CSV
  const cmpLines = cmpCsvContent.trim().split('\n');
  if (cmpLines.length > 1) {
    const headers = cmpLines[0].split(',').map((h) => h.trim());
    const dataLines = cmpLines.slice(1);

    // Group columns by analyte
    const analyteDefs: {
      name: string;
      valIdx: number;
      minIdx: number;
      maxIdx: number;
      unit: string;
    }[] = [];

    for (let c = 3; c < headers.length; c++) {
      const header = headers[c];
      const valMatch = header.match(/^([a-z0-9_]+)_value_(.+)$/);
      if (valMatch) {
        const analyteName = valMatch[1];
        const unit = valMatch[2];
        const minIdx = headers.findIndex(
          (h) => h === `${analyteName}_range_min_${unit}`
        );
        // Specification note: ALT and AST use "_max_" instead of "_range_max_"
        const maxIdx = headers.findIndex(
          (h) => h === `${analyteName}_range_max_${unit}` || h === `${analyteName}_max_${unit}`
        );

        if (minIdx !== -1 && maxIdx !== -1) {
          analyteDefs.push({
            name: analyteName,
            valIdx: c,
            minIdx,
            maxIdx,
            unit
          });
        }
      }
    }

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = line.split(',');
      const sampleId = cols[0]?.trim();
      const subject = cols[1]?.trim();
      const timepoint = cols[2]?.trim();
      const { phase, days } = parseTimepoint(timepoint);

      for (const def of analyteDefs) {
        const rawValStr = cols[def.valIdx]?.trim();
        const rawMin = parseFloat(cols[def.minIdx]);
        const rawMax = parseFloat(cols[def.maxIdx]);

        const isMissing = !rawValStr || rawValStr === '' || isNaN(Number(rawValStr));
        const rawValue = isMissing ? null : Number(rawValStr);

        if (isMissing) {
          missingValuesCount++;
        }

        const { normalizedUnit, normalizedValue } = normalizeLabUnit(def.unit, rawValue);

        // Check for glucose outlier (36 mg/dL)
        let isAnomaly = false;
        let anomalyNote: string | undefined;

        if (def.name === 'glucose' && normalizedValue !== null) {
          if (normalizedValue < 50 || normalizedValue > 300) {
            isAnomaly = true;
            anomaliesCount++;
            anomalyNote = `Valeur de glucose inhabituelle (${normalizedValue} mg/dL) : anomalie possible à vérifier sans suppression`;
          }
        }

        records.push({
          sampleId,
          subject,
          phase,
          daysFromLaunch: days,
          analyte: def.name,
          value: normalizedValue,
          unit: normalizedUnit,
          refMin: isNaN(rawMin) ? undefined : rawMin,
          refMax: isNaN(rawMax) ? undefined : rawMax,
          isMissing,
          isPlausibilityAnomaly: isAnomaly,
          anomalyNote
        });

        if (!referenceRanges[def.name] && !isNaN(rawMin) && !isNaN(rawMax)) {
          referenceRanges[def.name] = { refMin: rawMin, refMax: rawMax, unit: normalizedUnit };
        }
      }
    }
  }

  // Process Eve Panel CSV if present
  if (eveCsvContent) {
    const eveLines = eveCsvContent.trim().split('\n');
    if (eveLines.length > 1) {
      const headers = eveLines[0].split(',').map((h) => h.trim());
      const dataLines = eveLines.slice(1);

      const proteinDefs: {
        name: string;
        concIdx: number;
        percentIdx: number;
        unit: string;
      }[] = [];

      for (let c = 1; c < headers.length; c++) {
        const header = headers[c];
        const concMatch = header.match(/^([a-z0-9_]+)_conc_(.+)$/);
        if (concMatch) {
          const proteinName = concMatch[1];
          const unit = concMatch[2];
          const percentIdx = headers.findIndex((h) => h === `${proteinName}_percent`);
          if (percentIdx !== -1) {
            proteinDefs.push({
              name: proteinName,
              concIdx: c,
              percentIdx,
              unit
            });
          }
        }
      }

      for (const line of dataLines) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        const sampleId = cols[0]?.trim();
        const parts = sampleId.split('_');
        const subject = parts[0] || 'Unknown';
        const timepoint = parts[1] || 'L-0';
        const { phase, days } = parseTimepoint(timepoint);

        for (const def of proteinDefs) {
          const rawConcStr = cols[def.concIdx]?.trim();
          const rawPercentStr = cols[def.percentIdx]?.trim();

          const isMissing = !rawConcStr || isNaN(Number(rawConcStr));
          const rawVal = isMissing ? null : Number(rawConcStr);
          const percent = rawPercentStr && !isNaN(Number(rawPercentStr)) ? Number(rawPercentStr) : undefined;

          if (isMissing) {
            missingValuesCount++;
          }

          const { normalizedUnit, normalizedValue } = normalizeLabUnit(def.unit, rawVal);

          records.push({
            sampleId,
            subject,
            phase,
            daysFromLaunch: days,
            analyte: def.name,
            value: normalizedValue,
            unit: normalizedUnit,
            percentOfBaseline: percent,
            isMissing,
            isPlausibilityAnomaly: false
          });
        }
      }
    }
  }

  // Sort records strictly chronologically by subject and daysFromLaunch
  records.sort((a, b) => {
    if (a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject);
    }
    return a.daysFromLaunch - b.daysFromLaunch;
  });

  const uniqueSamples = Array.from(new Set(records.map((r) => r.sampleId)));
  const chronologicalSamples = sortSamplesChronologically(uniqueSamples);
  const uniqueSubjects = Array.from(new Set(records.map((r) => r.subject)));

  return {
    summary: {
      totalSamples: uniqueSamples.length,
      totalRecords: records.length,
      subjectsCount: uniqueSubjects.length,
      missingValuesCount,
      anomaliesCount,
      chronologicalOrder: chronologicalSamples
    },
    records,
    analyteReferenceRanges: referenceRanges
  };
}
