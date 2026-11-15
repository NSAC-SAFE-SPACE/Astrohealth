import type { BodyMeasureKey } from './bodyMeasures';

export type BodyZoneId = 'head_eyes' | 'thorax' | 'abdomen' | 'pelvis_spine' | 'arms_hands' | 'whole_body';
export type BodyHitVolume =
  | { shape: 'sphere'; center: [number, number, number]; radius: number }
  | { shape: 'box'; center: [number, number, number]; size: [number, number, number] }
  | { shape: 'capsule'; from: [number, number, number]; to: [number, number, number]; radius: number };

export const BODY_MODEL_METADATA = {
  file: '/models/human.glb',
  sizeBytes: 666820,
  heightMeters: 1.751404,
  triangles: 28864,
  vertices: 15387,
  orientation: 'Y vers le haut, face vers +Z',
  note: 'Zones suggérées par bodyZones.suggested.json; positions à vérifier en mode debug.'
} as const;

/**
 * Volumes d'interaction exprimés dans le repère glTF en mètres (modèle fourni : origine au sol).
 * Les valeurs proviennent du fichier bodyZones.suggested.json et sont estimatives, à valider en scène.
 */
export const BODY_ZONE_CONFIG: Array<{
  id: BodyZoneId;
  label: string;
  indicatorIds: string[];
  volumes: BodyHitVolume[];
  access: 'model' | 'button';
}> = [
  { id: 'head_eyes', label: 'Tête et yeux', indicatorIds: ['eye-pressure'], volumes: [{ shape: 'sphere', center: [0, 1.63, 0.02], radius: 0.13 }], access: 'model' },
  { id: 'thorax', label: 'Thorax · cœur et poumons', indicatorIds: ['heart-rate', 'blood-pressure', 'spo2'], volumes: [{ shape: 'box', center: [0, 1.27, 0], size: [0.36, 0.26, 0.26] }], access: 'model' },
  { id: 'abdomen', label: 'Abdomen', indicatorIds: ['glucose', 'urine-specific-gravity'], volumes: [{ shape: 'box', center: [0, 1.04, 0], size: [0.32, 0.2, 0.24] }], access: 'model' },
  { id: 'pelvis_spine', label: 'Bassin et colonne', indicatorIds: ['bone'], volumes: [
    { shape: 'box', center: [0, 0.88, 0], size: [0.34, 0.16, 0.24] },
    { shape: 'box', center: [0, 1.14, -0.07], size: [0.14, 0.22, 0.12] }
  ], access: 'model' },
  { id: 'arms_hands', label: 'Bras et mains', indicatorIds: ['muscle'], volumes: [
    { shape: 'capsule', from: [0.22, 1.38, 0], to: [0.44, 1.18, 0], radius: 0.06 },
    { shape: 'capsule', from: [0.44, 1.18, 0], to: [0.6, 1.05, 0], radius: 0.05 },
    { shape: 'capsule', from: [-0.22, 1.38, 0], to: [-0.44, 1.18, 0], radius: 0.06 },
    { shape: 'capsule', from: [-0.44, 1.18, 0], to: [-0.6, 1.05, 0], radius: 0.05 }
  ], access: 'model' },
  { id: 'whole_body', label: 'Corps entier · mesures non localisées', indicatorIds: ['temperature', 'radiation-daily', 'radiation-cumulative', 'co2'], volumes: [], access: 'button' }
];

export const BODY_ZONE_FIELD_KEYS: Record<BodyZoneId, BodyMeasureKey[]> = {
  head_eyes: ['Intraocular_Pressure'],
  thorax: ['Heart_Rate', 'Systolic_BP', 'Diastolic_BP', 'SpO2'],
  abdomen: ['Fasting_Glucose', 'Urine_Specific_Gravity'],
  pelvis_spine: ['Bone_ZScore'],
  arms_hands: ['Muscle_Strength_Loss'],
  whole_body: ['Body_Temperature', 'Radiation_Dose_Daily', 'Radiation_Dose_Cumulative', 'CO2_Partial_Pressure']
};
