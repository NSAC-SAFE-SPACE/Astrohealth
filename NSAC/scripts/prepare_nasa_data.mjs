import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(__dirname, '../data/raw');
const refDir = path.resolve(__dirname, '../data/reference');

const cmpPath = path.join(rawDir, 'LSDS-8_CMP.csv');
const evePath = path.join(rawDir, 'LSDS-8_Eve_cardio.csv');

if (!fs.existsSync(cmpPath) || !fs.existsSync(evePath)) {
  console.error('CSV source files missing in data/raw');
  process.exit(1);
}

const cmpContent = fs.readFileSync(cmpPath, 'utf8');
const eveContent = fs.readFileSync(evePath, 'utf8');

function parseTimepoint(tp) {
  const m = tp.trim().match(/^([LR])([+-]?\d+)$/i);
  if (!m) return { phase: 'L', days: 0, sortKey: 0 };
  const phase = m[1].toUpperCase();
  const num = parseInt(m[2], 10);
  return { phase, days: phase === 'L' ? -Math.abs(num) : Math.abs(num), sortKey: phase === 'L' ? -Math.abs(num) : Math.abs(num) };
}

function normalizeLabUnit(unit, value) {
  if (value === null || isNaN(value)) return { normalizedUnit: unit, normalizedValue: null };
  if (unit === 'pg_per_ml' || unit === 'pg/mL') {
    return { normalizedUnit: 'ng/mL', normalizedValue: Number((value / 1000).toFixed(3)) };
  }
  if (unit === 'milligram_per_deciliter') return { normalizedUnit: 'mg/dL', normalizedValue: value };
  if (unit === 'gram_per_deciliter') return { normalizedUnit: 'g/dL', normalizedValue: value };
  if (unit === 'millimole_per_liter') return { normalizedUnit: 'mmol/L', normalizedValue: value };
  if (unit === 'unit_per_liter') return { normalizedUnit: 'U/L', normalizedValue: value };
  return { normalizedUnit: unit, normalizedValue: value };
}

const records = [];
const referenceRanges = {};
let missingValuesCount = 0;
let anomaliesCount = 0;

// Parse CMP
const cmpLines = cmpContent.trim().split('\n');
const cmpHeaders = cmpLines[0].split(',').map((h) => h.trim());
const cmpDefs = [];

for (let c = 3; c < cmpHeaders.length; c++) {
  const m = cmpHeaders[c].match(/^([a-z0-9_]+)_value_(.+)$/);
  if (m) {
    const name = m[1];
    const unit = m[2];
    const minIdx = cmpHeaders.findIndex((h) => h === `${name}_range_min_${unit}`);
    const maxIdx = cmpHeaders.findIndex((h) => h === `${name}_range_max_${unit}` || h === `${name}_max_${unit}`);
    if (minIdx !== -1 && maxIdx !== -1) {
      cmpDefs.push({ name, valIdx: c, minIdx, maxIdx, unit });
    }
  }
}

for (const line of cmpLines.slice(1)) {
  if (!line.trim()) continue;
  const cols = line.split(',');
  const sampleId = cols[0]?.trim();
  const subject = cols[1]?.trim();
  const timepoint = cols[2]?.trim();
  const { phase, days } = parseTimepoint(timepoint);

  for (const def of cmpDefs) {
    const rawValStr = cols[def.valIdx]?.trim();
    const rawMin = parseFloat(cols[def.minIdx]);
    const rawMax = parseFloat(cols[def.maxIdx]);
    const isMissing = !rawValStr || rawValStr === '' || isNaN(Number(rawValStr));
    const rawValue = isMissing ? null : Number(rawValStr);

    if (isMissing) missingValuesCount++;
    const { normalizedUnit, normalizedValue } = normalizeLabUnit(def.unit, rawValue);

    let isAnomaly = false;
    let anomalyNote;
    if (def.name === 'glucose' && normalizedValue !== null && (normalizedValue < 50 || normalizedValue > 300)) {
      isAnomaly = true;
      anomaliesCount++;
      anomalyNote = `Valeur de glucose inhabituelle (${normalizedValue} mg/dL) : anomalie possible signalée`;
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

// Parse Eve
const eveLines = eveContent.trim().split('\n');
const eveHeaders = eveLines[0].split(',').map((h) => h.trim());
const eveDefs = [];

for (let c = 1; c < eveHeaders.length; c++) {
  const m = eveHeaders[c].match(/^([a-z0-9_]+)_conc_(.+)$/);
  if (m) {
    const name = m[1];
    const unit = m[2];
    const percentIdx = eveHeaders.findIndex((h) => h === `${name}_percent`);
    if (percentIdx !== -1) {
      eveDefs.push({ name, concIdx: c, percentIdx, unit });
    }
  }
}

for (const line of eveLines.slice(1)) {
  if (!line.trim()) continue;
  const cols = line.split(',');
  const sampleId = cols[0]?.trim();
  const [sub, tp] = sampleId.split('_');
  const { phase, days } = parseTimepoint(tp || 'L-0');

  for (const def of eveDefs) {
    const rawConcStr = cols[def.concIdx]?.trim();
    const rawPercentStr = cols[def.percentIdx]?.trim();
    const isMissing = !rawConcStr || isNaN(Number(rawConcStr));
    const rawVal = isMissing ? null : Number(rawConcStr);
    const percent = rawPercentStr && !isNaN(Number(rawPercentStr)) ? Number(rawPercentStr) : undefined;

    if (isMissing) missingValuesCount++;
    const { normalizedUnit, normalizedValue } = normalizeLabUnit(def.unit, rawVal);

    records.push({
      sampleId,
      subject: sub,
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

// Chronological sorting
records.sort((a, b) => {
  if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
  return a.daysFromLaunch - b.daysFromLaunch;
});

const uniqueSamples = Array.from(new Set(records.map((r) => r.sampleId)));
const sortedTimepoints = ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194'];

const output = {
  summary: {
    totalSamples: uniqueSamples.length,
    totalRecords: records.length,
    missingValuesCount,
    anomaliesCount,
    chronologicalTimepoints: sortedTimepoints,
    citation: 'NASA LSDA/OSDR Dataset LSDS-8 (Inspiration4 Crew Biomarkers)'
  },
  referenceRanges,
  records
};

fs.mkdirSync(refDir, { recursive: true });
fs.writeFileSync(path.join(refDir, 'reference.json'), JSON.stringify(output, null, 2), 'utf8');
console.log(`NASA reference.json generated: ${records.length} records, ${missingValuesCount} missing values, ${anomaliesCount} anomalies.`);
