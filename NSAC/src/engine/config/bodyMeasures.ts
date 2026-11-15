import type { Metric } from '../../types';

export type BodyMeasureKey =
  | 'Bone_ZScore' | 'Muscle_Strength_Loss' | 'Heart_Rate' | 'Systolic_BP' | 'Diastolic_BP'
  | 'SpO2' | 'Radiation_Dose_Daily' | 'Radiation_Dose_Cumulative' | 'Intraocular_Pressure'
  | 'Body_Temperature' | 'Urine_Specific_Gravity' | 'CO2_Partial_Pressure' | 'Fasting_Glucose';
export type BodyMeasureStatus = 'normal' | 'watch' | 'action';
export type BoundaryRule = { operator: 'lt' | 'lte' | 'gt' | 'gte'; value: number };

export interface BodyMeasureField {
  key: BodyMeasureKey;
  metric: Metric;
  label: string;
  unit: string;
  plausibility: { min: number; max: number };
  nominalText: string;
  nominal: { min?: number; max?: number; minInclusive?: boolean; maxInclusive?: boolean };
  alerts: BoundaryRule[];
  step: string;
  legacyConversions?: Record<string, number>;
  modelConversion?: { unit: string; multiplier: number };
}

export interface BodyMeasureIndicator {
  id: string;
  section: string;
  label: string;
  device: string;
  risk: string;
  reference: string;
  referenceUrl: string;
  fields: BodyMeasureField[];
}

/**
 * Single reference for body-measure units, validity ranges, user-specified status cutoffs,
 * devices, risks and NASA context. The cutoffs themselves are from the Astrohealth brief;
 * the cited NASA documents contextualize the risks and do not independently validate these cutoffs.
 */
export const BODY_MEASURE_CONFIG = {
  validated: false,
  thresholdsSource: 'Seuils fournis dans le cahier des charges Astrohealth; seuils opérationnels à valider médicalement.',
  sections: [
    { id: 'bone-muscle', label: 'Os et muscles' },
    { id: 'cardiovascular', label: 'Cardiovasculaire' },
    { id: 'radiation', label: 'Radiation' },
    { id: 'eyes', label: 'Yeux' },
    { id: 'metabolism', label: 'Métabolisme et hydratation' },
    { id: 'cabin', label: 'Environnement cabine' }
  ],
  indicators: [
    {
      id: 'bone', section: 'bone-muscle', label: 'Z-Score DMO', device: 'Échographe osseux QUS / DEXA',
      risk: 'Fragilité osseuse et risque de fracture.', reference: 'NASA HRP — Risk of Bone Fracture due to Spaceflight-induced Changes to Bone (HRP-F07-ERFT.R2, 2024)',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/Bone%20Fracture%20Evidence%20Report_07-18-2024.pdf',
      fields: [{ key: 'Bone_ZScore', metric: 'boneZScore', label: 'Z-Score DMO', unit: 'SD', plausibility: { min: -6, max: 6 }, nominalText: 'Valeur normale : ≥ -1.0 SD', nominal: { min: -1, minInclusive: true }, alerts: [{ operator: 'lte', value: -2 }], step: 'any' }]
    },
    {
      id: 'muscle', section: 'bone-muscle', label: 'Perte de force musculaire', device: 'Dynamomètre de préhension',
      risk: 'Déconditionnement et diminution de la capacité fonctionnelle.', reference: 'NASA HRP-047072 — Risk of Impaired Performance Due to Reduced Muscle Mass, Strength, and Endurance',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/Evidence%20report%20aerobic%20and%20muscle_FINAL%204-3-2024.pdf',
      fields: [{ key: 'Muscle_Strength_Loss', metric: 'muscleStrengthLoss', label: 'Perte de force musculaire', unit: '%', plausibility: { min: 0, max: 100 }, nominalText: 'Valeur normale : < 10 %', nominal: { max: 10, maxInclusive: false }, alerts: [{ operator: 'gt', value: 20 }], step: 'any' }]
    },
    {
      id: 'heart-rate', section: 'cardiovascular', label: 'Fréquence cardiaque', device: 'Bio-Monitor CSA (Smart Shirt)',
      risk: 'Adaptations cardiovasculaires en microgravité.', reference: 'NASA HRP — Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf',
      fields: [{ key: 'Heart_Rate', metric: 'heartRate', label: 'Fréquence cardiaque', unit: 'bpm', plausibility: { min: 20, max: 250 }, nominalText: 'Valeur normale : 55 à 90 bpm', nominal: { min: 55, max: 90 }, alerts: [{ operator: 'lt', value: 50 }, { operator: 'gt', value: 105 }], step: 'any' }]
    },
    {
      id: 'blood-pressure', section: 'cardiovascular', label: 'Pression artérielle', device: 'Tensiomètre de bord',
      risk: 'Adaptations cardiovasculaires et risque de malaise.', reference: 'NASA HRP — Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf',
      fields: [
        { key: 'Systolic_BP', metric: 'bpSys', label: 'Pression systolique', unit: 'mmHg', plausibility: { min: 50, max: 260 }, nominalText: 'Valeur normale : 95 à 125 mmHg', nominal: { min: 95, max: 125 }, alerts: [{ operator: 'lt', value: 90 }, { operator: 'gte', value: 140 }], step: 'any' },
        { key: 'Diastolic_BP', metric: 'bpDia', label: 'Pression diastolique', unit: 'mmHg', plausibility: { min: 30, max: 160 }, nominalText: 'Valeur normale : 60 à 80 mmHg', nominal: { min: 60, max: 80 }, alerts: [{ operator: 'lt', value: 60 }, { operator: 'gte', value: 90 }], step: 'any' }
      ]
    },
    {
      id: 'spo2', section: 'cardiovascular', label: 'Saturation SpO₂', device: 'Oxymètre de pouls Bio-Monitor',
      risk: 'Hypoxie.', reference: 'NASA HRP — Risk of Reduced Crew Health and Performance Due to Hypoxia',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/',
      fields: [{ key: 'SpO2', metric: 'spo2', label: 'Saturation SpO₂', unit: '%', plausibility: { min: 50, max: 100 }, nominalText: 'Valeur normale : ≥ 96 %', nominal: { min: 96 }, alerts: [{ operator: 'lt', value: 92 }], step: 'any' }]
    },
    {
      id: 'radiation-daily', section: 'radiation', label: 'Dose de radiation du jour', device: 'Spectromètre neutronique CANS',
      risk: 'Exposition radiologique accrue, notamment risque de cancers radio-induits et cataracte précoce.', reference: 'NASA HRP — Risk of Radiation Carcinogenesis',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/HRP-ER-CANCER-SR-20260811.pdf',
      fields: [{ key: 'Radiation_Dose_Daily', metric: 'radiationDoseDaily', label: 'Dose de radiation du jour', unit: 'mSv/j', plausibility: { min: 0, max: 50 }, nominalText: 'Valeur normale : < 1.0 mSv/j', nominal: { max: 1, maxInclusive: false }, alerts: [{ operator: 'gt', value: 5 }], step: 'any' }]
    },
    {
      id: 'radiation-cumulative', section: 'radiation', label: 'Dose de radiation cumulée', device: 'Dosimètre Rad-Silk',
      risk: 'Exposition radiologique cumulée, notamment risque de cancers radio-induits et cataracte précoce.', reference: 'NASA HRP — Risk of Radiation Carcinogenesis',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/HRP-ER-CANCER-SR-20260811.pdf',
      fields: [{ key: 'Radiation_Dose_Cumulative', metric: 'radiationDose', label: 'Dose de radiation cumulée', unit: 'mSv', plausibility: { min: 0, max: 2000 }, nominalText: 'Valeur normale : < 100 mSv', nominal: { max: 100, maxInclusive: false }, alerts: [{ operator: 'gt', value: 250 }], step: 'any' }]
    },
    {
      id: 'eye-pressure', section: 'eyes', label: 'Pression intraoculaire PIO', device: 'Tonomètre portable iCare',
      risk: 'Syndrome neuro-oculaire associé aux vols spatiaux (SANS).', reference: 'NASA HRP — Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/reports/SANS%20EB%202022%20FINAL_8-15-22.pdf',
      fields: [{ key: 'Intraocular_Pressure', metric: 'intraocularPressure', label: 'Pression intraoculaire PIO', unit: 'mmHg', plausibility: { min: 3, max: 60 }, nominalText: 'Valeur normale : 11 à 20 mmHg', nominal: { min: 11, max: 20 }, alerts: [{ operator: 'gt', value: 24 }], step: 'any' }]
    },
    {
      id: 'temperature', section: 'metabolism', label: 'Température corporelle', device: 'Bio-Monitor',
      risk: 'Dérèglement thermique (« Space Fever ») ou hypothermie.', reference: 'NASA HRP — Medical Risks; NASA-STD-3001 Volume 2',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/',
      fields: [{ key: 'Body_Temperature', metric: 'temperature', label: 'Température corporelle', unit: '°C', plausibility: { min: 30, max: 44 }, nominalText: 'Valeur normale : 36.5 à 37.5 °C', nominal: { min: 36.5, max: 37.5 }, alerts: [{ operator: 'lt', value: 36 }, { operator: 'gt', value: 38.2 }], step: 'any' }]
    },
    {
      id: 'urine-specific-gravity', section: 'metabolism', label: 'Densité urinaire (USG)', device: 'Réfractomètre urinaire',
      risk: 'Déshydratation et risque de calculs rénaux.', reference: 'NASA HRP — Risk of Renal Stone Formation; OCHMO Urinary Health',
      referenceUrl: 'https://www.nasa.gov/ochmo-mtb-003-urinary-health-2/',
      fields: [{ key: 'Urine_Specific_Gravity', metric: 'urineSpecificGravity', label: 'Densité urinaire (USG)', unit: '-', plausibility: { min: 1, max: 1.06 }, nominalText: 'Valeur normale : 1.005 à 1.020', nominal: { min: 1.005, max: 1.02 }, alerts: [{ operator: 'gt', value: 1.028 }], step: '0.001' }]
    },
    {
      id: 'glucose', section: 'metabolism', label: 'Glycémie à jeun', device: 'Glucomètre capillaire / CGM',
      risk: 'Dysglycémie et résistance à l’insuline.', reference: 'NASA HRP — Risk of Performance Decrement Due to Inadequate Food and Nutrition',
      referenceUrl: 'https://humanresearchroadmap.nasa.gov/evidence/',
      fields: [{ key: 'Fasting_Glucose', metric: 'fastingGlucose', label: 'Glycémie à jeun', unit: 'g/L', plausibility: { min: 0.2, max: 6 }, nominalText: 'Valeur normale : 0.70 à 1.10 g/L', nominal: { min: 0.7, max: 1.1 }, alerts: [{ operator: 'lt', value: 0.7 }, { operator: 'gt', value: 1.4 }], step: 'any', legacyConversions: { 'mg/dL': 0.01, 'mmol/L': 0.18, 'g/L': 1 }, modelConversion: { unit: 'mg/dL', multiplier: 100 } }]
    },
    {
      id: 'co2', section: 'cabin', label: 'Pression partielle CO₂', device: 'Capteurs cabine ECLSS',
      risk: 'Céphalée spatiale, diminution des performances et hypercapnie toxique.', reference: 'NASA-STD-3001 Volume 2 §6004 — Nominal Vehicle/Habitat Carbon Dioxide Levels',
      referenceUrl: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-002-eclss.pdf',
      fields: [{ key: 'CO2_Partial_Pressure', metric: 'co2PartialPressure', label: 'Pression partielle CO₂', unit: 'mmHg', plausibility: { min: 0, max: 20 }, nominalText: 'Valeur normale : < 3.0 mmHg', nominal: { max: 3, maxInclusive: false }, alerts: [{ operator: 'gt', value: 4.5 }], step: 'any' }]
    }
  ] satisfies BodyMeasureIndicator[]
} as const;

export const BODY_MEASURE_KEYS: BodyMeasureKey[] = BODY_MEASURE_CONFIG.indicators.reduce<BodyMeasureKey[]>((keys, indicator) => keys.concat(indicator.fields.map((field) => field.key)), []);
export const BODY_MEASURE_FIELDS: BodyMeasureField[] = BODY_MEASURE_CONFIG.indicators.reduce<BodyMeasureField[]>((fields, indicator) => fields.concat(indicator.fields), []);
export const BODY_MEASURE_FIELD_BY_KEY = Object.fromEntries(BODY_MEASURE_FIELDS.map((field) => [field.key, field])) as Record<BodyMeasureKey, BodyMeasureField>;

function matchesRule(value: number, rule: BoundaryRule): boolean {
  if (rule.operator === 'lt') return value < rule.value;
  if (rule.operator === 'lte') return value <= rule.value;
  if (rule.operator === 'gt') return value > rule.value;
  return value >= rule.value;
}

export function getBodyMeasureStatus(field: BodyMeasureField, value: number): BodyMeasureStatus {
  if (field.alerts.some((rule) => matchesRule(value, rule))) return 'action';
  const { min, max, minInclusive = true, maxInclusive = true } = field.nominal;
  const aboveMin = min === undefined || (minInclusive ? value >= min : value > min);
  const belowMax = max === undefined || (maxInclusive ? value <= max : value < max);
  return aboveMin && belowMax ? 'normal' : 'watch';
}

export function getBodyIndicatorStatus(indicator: BodyMeasureIndicator, values: Partial<Record<BodyMeasureKey, number | null>>): BodyMeasureStatus | null {
  const statuses = indicator.fields.flatMap((field) => {
    const value = values[field.key];
    return value === undefined || value === null ? [] : [getBodyMeasureStatus(field, value)];
  });
  if (statuses.length !== indicator.fields.length) return null;
  if (statuses.includes('action')) return 'action';
  if (statuses.includes('watch')) return 'watch';
  return 'normal';
}

export function validateBodyMeasureValues(values: Partial<Record<BodyMeasureKey, number>>): void {
  const keys = Object.keys(values);
  if (keys.length === 0) throw new Error('Renseignez au moins une mesure.');
  for (const key of keys) {
    const field = BODY_MEASURE_FIELD_BY_KEY[key as BodyMeasureKey];
    const value = values[key as BodyMeasureKey];
    if (!field || typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} doit être un nombre réel valide.`);
    if (value < field.plausibility.min || value > field.plausibility.max) {
      throw new Error(`${field.label} : valeur plausible comprise entre ${field.plausibility.min} et ${field.plausibility.max} ${field.unit}.`);
    }
  }
  const hasSystolic = values.Systolic_BP !== undefined;
  const hasDiastolic = values.Diastolic_BP !== undefined;
  if (hasSystolic !== hasDiastolic) throw new Error('Renseignez les pressions systolique et diastolique ensemble.');
  if (hasSystolic && hasDiastolic && values.Systolic_BP! <= values.Diastolic_BP!) {
    throw new Error('La pression systolique doit être supérieure à la pression diastolique.');
  }
}
