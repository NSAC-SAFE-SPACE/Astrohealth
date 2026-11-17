import type { MentalStateData } from '../../types';
import type { StressLevel } from './assessments/stress';

export const MENTAL_STATE_KEYS = [
  'Stress_level', 'Happiness', 'Mood_Score', 'Sleep_Quality',
  'Workload Perception', 'Time_Perception', 'Food', 'Communication_with_Earth_mins'
] as const;
export const MENTAL_STATE_FIELDS = [
  { key: 'Stress_level', options: ['High', 'Medium', 'Low'] },
  { key: 'Happiness', min: 0, max: 10, integer: true },
  { key: 'Mood_Score', options: ['positive', 'neutral', 'negative'] },
  { key: 'Workload Perception', options: ['impossible', 'possible', 'easy'] },
  { key: 'Time_Perception', options: ['Slow', 'Normal', 'Fast'] },
  { key: 'Food', options: ['Bad', 'Good', 'Neutral'] },
  { key: 'Communication_with_Earth_mins', min: 0, unit: 'hours' }
] as const;

export const EXAMPLE_MENTAL_STATE: MentalStateData = {
  Stress_level: 'Medium', Happiness: 7, Mood_Score: 'positive', Sleep_Quality: 45.2,
  'Workload Perception': 'possible', Time_Perception: 'Normal', Food: 'Good',
  Communication_with_Earth_mins: 1.5
};

export function createMentalStateData(
  answers: Omit<MentalStateData, 'Sleep_Quality'>,
  sleepQuality: number
): MentalStateData {
  const data = Object.fromEntries(MENTAL_STATE_KEYS.map((key) => [key, key === 'Sleep_Quality' ? sleepQuality : answers[key as keyof typeof answers]])) as unknown as MentalStateData;
  validate_mental_state(data, { sleepQualityCalculated: true });
  return data;
}

/** Maps questionnaire outcomes to the legacy model fields without adding questionnaire-only fields. */
export function createMentalStateFromQuestionnaires(
  stressLevel: StressLevel,
  preciseWellBeingScore: number,
  otherAnswers: Omit<MentalStateData, 'Stress_level' | 'Happiness' | 'Sleep_Quality'>,
  sleepQuality: number
): MentalStateData {
  if (!Number.isFinite(preciseWellBeingScore) || preciseWellBeingScore < 0 || preciseWellBeingScore > 10) {
    throw new Error('Le score de bien-être doit être compris entre 0 et 10.');
  }
  // The model contract requires an integer. Keep the precise questionnaire score in its
  // own history record and use conventional nearest-integer rounding for this model field.
  const stressValue = stressLevel === 'LOW' ? 'Low' : stressLevel === 'MEDIUM' ? 'Medium' : 'High';
  return createMentalStateData({ ...otherAnswers, Stress_level: stressValue, Happiness: Math.round(preciseWellBeingScore) }, sleepQuality);
}

export function validate_mental_state(data: unknown, options: { sleepQualityCalculated?: boolean } = {}): data is MentalStateData {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('L’état mental doit être un dictionnaire.');
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== MENTAL_STATE_KEYS.length || keys.some((key, index) => key !== MENTAL_STATE_KEYS[index])) {
    throw new Error('Les clés de l’état mental sont absentes, supplémentaires ou dans le mauvais ordre.');
  }
  const categories: Record<string, string[]> = {
    Stress_level: ['High', 'Medium', 'Low'], Mood_Score: ['positive', 'neutral', 'negative'],
    'Workload Perception': ['impossible', 'possible', 'easy'], Time_Perception: ['Slow', 'Normal', 'Fast'],
    Food: ['Bad', 'Good', 'Neutral']
  };
  for (const [key, values] of Object.entries(categories)) {
    if (typeof record[key] !== 'string' || !values.includes(record[key] as string)) throw new Error(`${key}: valeur catégorielle invalide.`);
  }
  if (!Number.isInteger(record.Happiness) || (record.Happiness as number) < 0 || (record.Happiness as number) > 10) throw new Error('Happiness doit être un entier de 0 à 10.');
  for (const key of ['Sleep_Quality', 'Communication_with_Earth_mins']) {
    if (typeof record[key] !== 'number' || !Number.isFinite(record[key]) || (record[key] as number) < 0) throw new Error(`${key} doit être un nombre réel positif ou nul.`);
  }
  if ((record.Sleep_Quality as number) > 62.53) throw new Error('Sleep_Quality doit être compris entre 0 et 62.53.');
  if (!options.sleepQualityCalculated) throw new Error('Sleep_Quality doit provenir du score calculé à partir du journal de sommeil.');
  return true;
}

export function migrateLegacyMentalStateData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
  const record = data as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'Mood Score')) return data;
  const hasCurrentKey = Object.prototype.hasOwnProperty.call(record, 'Mood_Score');
  return Object.fromEntries(Object.entries(record)
    .filter(([key]) => !(hasCurrentKey && key === 'Mood Score'))
    .map(([key, value]) => [key === 'Mood Score' ? 'Mood_Score' : key, value]));
}

export const get_mental_state_data = (history: readonly { mentalStateData?: MentalStateData }[]): MentalStateData | null => {
  return [...history].reverse().find((item) => item.mentalStateData)?.mentalStateData ?? null;
};
export const get_mental_state_history = (history: readonly { date: string; mentalStateData?: MentalStateData }[]) =>
  history.filter((item) => item.mentalStateData).map((item) => ({ ...item.mentalStateData!, timestamp: item.date }));
