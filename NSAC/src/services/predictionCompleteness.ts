import type { Measurement, MentalStateData, PsychAssessment, SleepLog } from '../types';
import { BODY_MEASURE_FIELD_BY_KEY, BODY_MEASURE_FIELDS, validateBodyMeasureValues, type BodyMeasureKey } from '../engine/config/bodyMeasures';
import { MENTAL_STATE_KEYS, validate_mental_state } from '../features/mental/mentalState';
import { computePsychSleepQuality } from '../engine/scores/sleep';

export const MAX_MEASURE_AGE_HOURS: number | null = 24;
export type MissingPredictionField = { key: string; label: string; stale?: boolean };

const BODY_API_FIELDS: { key: BodyMeasureKey; apiKey: string }[] = [
  { key: 'Bone_ZScore', apiKey: 'Z_Score' }, { key: 'Muscle_Strength_Loss', apiKey: 'muscle_strength_loss' },
  { key: 'Heart_Rate', apiKey: 'heart_rate' }, { key: 'Systolic_BP', apiKey: 'systolic_pressure' },
  { key: 'Diastolic_BP', apiKey: 'diastolic_pressure' }, { key: 'SpO2', apiKey: 'spo2' },
  { key: 'Radiation_Dose_Daily', apiKey: 'daily_radiation_dose' }, { key: 'Radiation_Dose_Cumulative', apiKey: 'cumulative_radiation_dose' },
  { key: 'Intraocular_Pressure', apiKey: 'intraocular_pressure' }, { key: 'Body_Temperature', apiKey: 'body_temperature' },
  { key: 'Urine_Specific_Gravity', apiKey: 'urine_density' }, { key: 'CO2_Partial_Pressure', apiKey: 'cabin_co2' },
  { key: 'Fasting_Glucose', apiKey: 'blood_glucose' }
];

const BODY_LABELS = new Map(BODY_MEASURE_FIELDS.map((field) => [field.key, field.label]));
const apiToField = new Map(BODY_API_FIELDS.map(({ key, apiKey }) => [apiKey, key]));

function isFresh(timestamp: number, now: number, maxAgeHours = MAX_MEASURE_AGE_HOURS): boolean {
  return Number.isFinite(timestamp) && timestamp <= now && (maxAgeHours === null || now - timestamp <= maxAgeHours * 60 * 60 * 1000);
}

export function isBodyComplete(payload: unknown): payload is Record<string, number> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== BODY_API_FIELDS.length || BODY_API_FIELDS.some(({ apiKey }) => !Object.prototype.hasOwnProperty.call(record, apiKey))) return false;
  if (BODY_API_FIELDS.some(({ apiKey }) => typeof record[apiKey] !== 'number' || !Number.isFinite(record[apiKey]))) return false;
  const values = Object.fromEntries(BODY_API_FIELDS.map(({ key, apiKey }) => [key, record[apiKey]])) as Partial<Record<BodyMeasureKey, number>>;
  try { validateBodyMeasureValues(values); return true; } catch { return false; }
}

export function getMissingBodyFields(payload: unknown): MissingPredictionField[] {
  const record = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
  return BODY_API_FIELDS.flatMap(({ key, apiKey }) => {
    const value = record[apiKey];
    const valid = typeof value === 'number' && Number.isFinite(value) && (() => {
      try { validateBodyMeasureValues({ [key]: value }); return true; } catch { return false; }
    })();
    return valid ? [] : [{ key: apiKey, label: BODY_LABELS.get(key) ?? key }];
  });
}

export function getBodyKeyFromApiField(apiKey: string): BodyMeasureKey | undefined { return apiToField.get(apiKey); }

export function buildBodyPrediction(measurements: readonly Measurement[], astronautId: string, now = Date.now(), maxAgeHours = MAX_MEASURE_AGE_HOURS) {
  const payload: Record<string, number> = {};
  const missing: MissingPredictionField[] = [];
  for (const { key, apiKey } of BODY_API_FIELDS) {
    const field = BODY_MEASURE_FIELD_BY_KEY[key];
    const latest = measurements.filter((item) => item.astronautId === astronautId && item.metric === field.metric)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    const validValue = latest && typeof latest.value === 'number' && Number.isFinite(latest.value) && latest.value >= field.plausibility.min && latest.value <= field.plausibility.max;
    if (!latest || !validValue || !isFresh(latest.timestamp, now, maxAgeHours)) {
      missing.push({ key: apiKey, label: field.label, stale: Boolean(latest && validValue && !isFresh(latest.timestamp, now, maxAgeHours)) });
      continue;
    }
    payload[apiKey] = latest.value;
  }
  return { payload, missing, complete: missing.length === 0 && isBodyComplete(payload) };
}

export type MentalPredictionPayload = {
  Stress_Level: string;
  Happiness: number;
  Mood_Score: string;
  Sleep_Quality: number;
  'Workload Perception': string;
  Time_Perception: string;
  Food: string;
  Communication_with_Earth_mins: number;
};

export function adaptMentalPayload(data: MentalStateData): MentalPredictionPayload {
  return {
    Stress_Level: data.Stress_level, Happiness: data.Happiness, Mood_Score: data.Mood_Score,
    Sleep_Quality: data.Sleep_Quality, 'Workload Perception': data['Workload Perception'],
    Time_Perception: data.Time_Perception, Food: data.Food,
    // UI values are in hours; API field name specifies minutes.
    Communication_with_Earth_mins: data.Communication_with_Earth_mins * 60
  };
}

export function isMentalComplete(payload: unknown): payload is MentalPredictionPayload {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 8 || MENTAL_STATE_KEYS.some((key) => key === 'Stress_level'
    ? typeof record.Stress_Level !== 'string'
    : key === 'Communication_with_Earth_mins'
      ? typeof record.Communication_with_Earth_mins !== 'number' || !Number.isFinite(record.Communication_with_Earth_mins)
      : typeof record[key] !== 'string' && typeof record[key] !== 'number')) return false;
  if (!Number.isInteger(record.Happiness) || (record.Happiness as number) < 0 || (record.Happiness as number) > 10) return false;
  if (typeof record.Sleep_Quality !== 'number' || record.Sleep_Quality < 0 || record.Sleep_Quality > 62.53) return false;
  if (typeof record.Communication_with_Earth_mins !== 'number' || record.Communication_with_Earth_mins < 0) return false;
  const source: MentalStateData = {
    Stress_level: record.Stress_Level as MentalStateData['Stress_level'], Happiness: record.Happiness as number,
    Mood_Score: record.Mood_Score as MentalStateData['Mood_Score'], Sleep_Quality: record.Sleep_Quality,
    'Workload Perception': record['Workload Perception'] as MentalStateData['Workload Perception'],
    Time_Perception: record.Time_Perception as MentalStateData['Time_Perception'], Food: record.Food as MentalStateData['Food'],
    Communication_with_Earth_mins: (record.Communication_with_Earth_mins as number) / 60
  };
  try { validate_mental_state(source, { sleepQualityCalculated: true }); return true; } catch { return false; }
}

export function getMissingMentalFields(payload: unknown): MissingPredictionField[] {
  const record = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
  const required: [string, string, (value: unknown) => boolean][] = [
    ['Stress_Level', 'Niveau de stress', (value) => ['High', 'Medium', 'Low'].includes(value as string)],
    ['Happiness', 'Bonheur', (value) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 10],
    ['Mood_Score', 'Humeur', (value) => ['positive', 'neutral', 'negative'].includes(value as string)],
    ['Sleep_Quality', 'Qualité du sommeil', (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 62.53],
    ['Workload Perception', 'Charge de travail', (value) => ['impossible', 'possible', 'easy'].includes(value as string)],
    ['Time_Perception', 'Perception du temps', (value) => ['Slow', 'Normal', 'Fast'].includes(value as string)],
    ['Food', 'Alimentation', (value) => ['Bad', 'Good', 'Neutral'].includes(value as string)],
    ['Communication_with_Earth_mins', 'Communication avec la Terre', (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0]
  ];
  const missing = required.flatMap(([key, label, valid]) => {
    const value = record[key];
    return value === null || value === undefined || value === '' || !valid(value)
      ? [{ key, label }] : [];
  });
  if (isMentalComplete(payload)) return [];
  return Object.keys(record).length === required.length ? missing : [...missing, { key: 'payload', label: 'Format de l’auto-évaluation invalide' }];
}

export function buildMentalPrediction(assessments: readonly PsychAssessment[], sleepLogs: readonly SleepLog[], astronautId: string, now = Date.now(), maxAgeHours = MAX_MEASURE_AGE_HOURS) {
  const latest = assessments.filter((item) => item.astronautId === astronautId && item.mentalStateData)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestSleep = latest && sleepLogs.find((log) => log.astronautId === astronautId && log.date === latest.date);
  const timestamp = latest ? Date.parse(`${latest.date}T12:00:00Z`) : NaN;
  const calculatedQuality = latestSleep ? computePsychSleepQuality(latestSleep, sleepLogs.filter((log) => log.astronautId === astronautId && log.date !== latestSleep.date).slice(-7)) : null;
  const sleepMatchesAssessment = Boolean(latest?.mentalStateData && calculatedQuality !== null && Math.abs(latest.mentalStateData.Sleep_Quality - calculatedQuality) <= 0.01);
  if (!latest?.mentalStateData || !latestSleep || !sleepMatchesAssessment || !Number.isFinite(timestamp) || !isFresh(timestamp, now, maxAgeHours)) {
    const data = latest?.mentalStateData ? adaptMentalPayload(latest.mentalStateData) : {};
    const missing = getMissingMentalFields(data);
    if (!sleepMatchesAssessment && !missing.some((item) => item.key === 'Sleep_Quality')) missing.push({ key: 'Sleep_Quality', label: 'Qualité du sommeil (test de sommeil requis)' });
    if (Number.isFinite(timestamp) && !isFresh(timestamp, now, maxAgeHours)) missing.push({ key: 'assessment', label: 'Auto-évaluation à actualiser', stale: true });
    return { payload: data, missing, complete: false, assessment: latest };
  }
  const payload = adaptMentalPayload(latest.mentalStateData);
  const missing = getMissingMentalFields(payload);
  return { payload, missing, complete: missing.length === 0 && isMentalComplete(payload), assessment: latest };
}
