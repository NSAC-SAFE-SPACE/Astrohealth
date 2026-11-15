export type Metric =
  | 'heartRate'
  | 'bpSys'
  | 'bpDia'
  | 'glucose'
  | 'temperature'
  | 'spo2'
  | 'sleepHours'
  | 'sleepQuality'
  | 'mood'
  | 'stress'
  | 'workload'
  | 'timePerception'
  | 'communication'
  | 'weight'
  | 'exerciseMin'
  | 'boneProxy'
  | 'boneDensity'
  | 'boneZScore'
  | 'muscleStrengthLoss'
  | 'radiationDose'
  | 'radiationRate'
  | 'radiationDoseDaily'
  | 'intraocularPressure'
  | 'urineSpecificGravity'
  | 'co2PartialPressure'
  | 'fastingGlucose'
  | 'reactionTime'
  | 'orientationAccuracy';

export type Status = 'normal' | 'watch' | 'action' | 'contact_flight_surgeon';

export type MissionEnvironment = 'spacecraft' | 'station' | 'lunar_base' | 'mars_rover';

export type GlucoseContext = 'fasting' | 'post_meal' | 'random';

export type LatencyBucket = '<15' | '15-30' | '30-60' | '>60';

export type BoneSite = 'lumbar_spine' | 'total_hip' | 'femoral_neck' | 'heel';
export type BoneMethod = 'dxa' | 'ultrasound' | 'other';

export interface ScoreComponent {
  key: string;
  value: number;
  weight: number;
  explanation: string;
}

export interface ScoreResult {
  value: number; // 0-100 (or % for bone loss)
  components: ScoreComponent[];
  confidence: 'complete' | 'partielle';
  missingInputs: string[];
  status?: Status;
  explanation?: string;
}

export interface Measurement {
  id: string;
  astronautId: string;
  metric: Metric;
  value: number;
  unit: string;
  timestamp: number; // Epoch ms
  source: 'manual' | 'simulated';
  context?: GlucoseContext | string;
  isPlausibilityAnomaly?: boolean;
  demo?: boolean;
}

export interface Assessment {
  metric: Metric | string;
  status: Status;
  value: number;
  baselineDeviation?: number;
  explanation: string;
  actions: string[];
  drivers: string[];
  score?: ScoreResult;
  isPlausibilityAnomaly?: boolean;
  baseline?: {
    mean: number;
    std: number;
    zScore?: number;
  };
}

export interface SleepLog {
  id: string;
  astronautId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  bedtime: string; // HH:mm
  latencyBucket: LatencyBucket;
  awakenings: number;
  restfulness: number; // 1 to 5
  calculatedQuality?: number;
  demo?: boolean;
}

export interface BoneDensityRecord {
  id: string;
  astronautId: string;
  date: string; // YYYY-MM-DD
  site: BoneSite;
  valueGcm2: number;
  method: BoneMethod;
  isBaseline: boolean;
}

export interface PsychMetrics {
  stressLevel: number; // 0-100 (lower is better, <35 nominal)
  moodScore: number; // 0-100 (higher is better, >=70 nominal)
  workloadPerception: number; // 0-100 (NASA-TLX equivalent, <=40 nominal)
  timePerception: number; // 0-100 (50 is nominal/equilibré, <35 slow/monotony, >65 rushed)
  communicationWithOthers: number; // 0-100 (higher is better, >=75 nominal)
}

export interface PsychAssessment {
  id: string;
  astronautId: string;
  date: string; // ISO string or YYYY-MM-DD
  answers: number[];
  score: number;
  status: Status;
  // 5 Key Spaceflight Behavioral Dimensions
  stressLevel?: number;
  moodScore?: number;
  workloadPerception?: number;
  timePerception?: number;
  communicationWithOthers?: number;
  mentalStateData?: MentalStateData;
  demo?: boolean;
}

export interface MentalStateData {
  Stress_level: 'High' | 'Medium' | 'Low';
  Happiness: number;
  Mood_Score: 'positive' | 'neutral' | 'negative';
  Sleep_Quality: number;
  'Workload Perception': 'impossible' | 'possible' | 'easy';
  Time_Perception: 'Slow' | 'Normal' | 'Fast';
  Food: 'Bad' | 'Good' | 'Neutral';
  Communication_with_Earth_mins: number;
}

export interface ActivityEvent {
  id: string;
  astronautId: string;
  date: string; // YYYY-MM-DD
  type: 'view' | 'measurement';
  demo?: boolean;
}

export interface Pattern {
  id: string;
  severity: Status;
  explanation: string;
  involvedMetrics: Metric[];
}

export interface LabResult {
  id: string;
  astronautId: string;
  analyte: string;
  value: number;
  unit: string;
  refMin: number;
  refMax: number;
  date: string;
}

export interface Astronaut {
  id: string;
  matricule?: string;
  name: string;
  age: number;
  sex: 'male' | 'female';
  weightKg: number;
  heightCm?: number;
  mission: MissionEnvironment;
  missionName?: string;
  missionStartDate?: string;
  photo?: string; // Data URL resized to 256px
  careerRadiationDose?: number; // mSv prior to current mission
  baselineBoneDensity?: Partial<Record<BoneSite, number>>;
  bloodGlucoseUnit?: 'mg/dL' | 'mmol/L';
  commDelayMinutes?: number;
  missionDay?: number;
  createdAt?: string;
  demo?: boolean;
}

export interface ThresholdConfigItem {
  value: any;
  source: string;
  validated: boolean;
  label: string;
}

export type ForecastHorizon = '24h' | '7d' | '30d';

export interface ForecastDriver {
  name: string;
  metric?: Metric | string;
  impactValue: number;
  unit?: string;
  explanation: string;
  explanationEn?: string;
}

export interface ForecastResult {
  metric: Metric | string;
  horizon: ForecastHorizon;
  value: number;
  low: number;
  high: number;
  drivers: ForecastDriver[];
  confidence?: number;
}

export interface Forecaster {
  metric: Metric | string;
  update(measurement: Measurement | { value: number; timestamp: number }, context?: any): void;
  predict(horizon: ForecastHorizon, parents?: Record<string, any>): ForecastResult;
  reset?(): void;
}

export interface CouplingLink {
  from: Metric | string;
  to: Metric | string;
  sign: '+' | '-';
  strength: number; // 0 to 1
  lagDays: number; // >= 1
  rationale: string;
  rationaleEn?: string;
}

export interface BacktestResult {
  metric: Metric | string;
  sampleCount: number;
  mae: number;
  rmse: number;
  coverageRate: number; // % of true observations within [low, high]
  horizon: ForecastHorizon;
}
