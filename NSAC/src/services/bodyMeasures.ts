import { db } from '../db';
import { BODY_MEASURE_FIELD_BY_KEY, type BodyMeasureKey } from '../engine/config/bodyMeasures';
import type { Measurement } from '../types';

export type BodyMeasuresData = Record<BodyMeasureKey, number | null>;

const BODY_MEASURE_METRICS: Record<BodyMeasureKey, string> = {
  Bone_ZScore: 'boneZScore',
  Muscle_Strength_Loss: 'muscleStrengthLoss',
  Heart_Rate: 'heartRate',
  Systolic_BP: 'bpSys',
  Diastolic_BP: 'bpDia',
  SpO2: 'spo2',
  Radiation_Dose_Daily: 'radiationDoseDaily',
  Radiation_Dose_Cumulative: 'radiationDose',
  Intraocular_Pressure: 'intraocularPressure',
  Body_Temperature: 'temperature',
  Urine_Specific_Gravity: 'urineSpecificGravity',
  CO2_Partial_Pressure: 'co2PartialPressure',
  Fasting_Glucose: 'fastingGlucose'
};

function latest(records: Measurement[], metric: string): Measurement | undefined {
  return records.filter((record) => record.metric === metric).sort((a, b) => b.timestamp - a.timestamp)[0];
}

/** Latest user-scoped body readings, with null for indicators that have never been recorded. */
export function mapBodyMeasureRecords(records: Measurement[]): BodyMeasuresData {
  const result = {} as BodyMeasuresData;

  for (const key of Object.keys(BODY_MEASURE_METRICS) as BodyMeasureKey[]) {
    const metric = BODY_MEASURE_METRICS[key];
    let record = latest(records, metric);
    if (key === 'Fasting_Glucose') {
      const legacy = records.filter((item) => item.metric === 'glucose' && (item.context ?? 'fasting') === 'fasting')
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (legacy && (!record || legacy.timestamp > record.timestamp)) record = legacy;
      if (record) {
        const field = BODY_MEASURE_FIELD_BY_KEY.Fasting_Glucose;
        const conversion = field.legacyConversions?.[record.unit] ?? (record.metric === 'fastingGlucose' ? 1 : undefined);
        result[key] = conversion === undefined ? null : record.value * conversion;
        continue;
      }
    }
    result[key] = record?.value ?? null;
  }
  return result;
}

/** Latest user-scoped body readings, with null for indicators that have never been recorded. */
export async function get_body_measures(matricule: string): Promise<BodyMeasuresData> {
  const normalizedMatricule = String(matricule).trim();
  const user = await db.users.get(normalizedMatricule);
  const profile = await db.astronauts.get(user?.id ?? normalizedMatricule);
  const astronautId = profile?.id ?? user?.id ?? normalizedMatricule;
  const records = await db.measurements.where('astronautId').equals(astronautId).toArray();
  return mapBodyMeasureRecords(records);
}
