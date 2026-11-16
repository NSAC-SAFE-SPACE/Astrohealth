import { create } from 'zustand';
import { db } from '../db';
import type {
  Astronaut,
  Measurement,
  SleepLog,
  BoneDensityRecord,
  PsychAssessment,
  PsychMetrics,
  ActivityEvent,
  Status,
  ScoreResult,
  Assessment,
  Metric,
  Pattern
} from '../types';
import type { StressAssessment, WellBeingAssessment } from '../types';
import { isLegacyFictionalProfile, seedFictionalCrew, shouldAutoSeedFictionalCrew } from '../services/simulator';
import { resizeImageToSquare } from '../services/profile';
import { validate_mental_state } from '../features/mental/mentalState';
import { BODY_MEASURE_FIELD_BY_KEY, validateBodyMeasureValues, type BodyMeasureKey } from '../engine/config/bodyMeasures';
import { CURRENT_USER_ID } from '../config/currentUser';

// Pure scoring functions
import { calculateCardioScore as calcCardio } from '../engine/scores/cardio';
import { calculateSleepScore as calcSleep } from '../engine/scores/sleep';
import { calculateMultiSiteBoneLoss as calcBone } from '../engine/scores/bone';
import { projectRadiation as calcRad } from '../engine/scores/radiation';
import { assessGlucose as calcGlucose } from '../engine/scores/glucose';
import { assessMeasurement as calcGeneric } from '../engine/status';
import { detectPatterns, fuseHealthStatus } from '../engine/fusion';

export interface AstroState {
  astronaut: Astronaut;
  measurements: Measurement[];
  sleepLogs: SleepLog[];
  boneRecords: BoneDensityRecord[];
  psychAssessments: PsychAssessment[];
  stressAssessments: StressAssessment[];
  wellBeingAssessments: WellBeingAssessment[];
  activityEvents: ActivityEvent[];
  isLoading: boolean;

  // Real-time computed states, scores & fusion patterns
  cardioScore: ReturnType<typeof calcCardio> | null;
  sleepScore: ScoreResult | null;
  boneLossScore: ReturnType<typeof calcBone> | null;
  radiationProjection: ReturnType<typeof calcRad> | null;
  latestAssessments: Map<Metric, Assessment>;
  patterns: Pattern[];
  dominantPattern?: Pattern;
  summaryFr: string;
  summaryEn: string;
  globalStatus: Status;
  globalScore: number;
  activeAlertsCount: number;

  // Actions
  init: () => Promise<void>;
  addMeasurement: (metric: Metric, value: number, unit: string, context?: string) => Promise<void>;
  addBodyMeasurements: (values: Partial<Record<BodyMeasureKey, number>>) => Promise<void>;
  addSleepLog: (log: Omit<SleepLog, 'id' | 'astronautId'>) => Promise<void>;
  addPsychAssessment: (mentalStateData: import('../types').MentalStateData) => Promise<void>;
  addMentalAssessment: (mentalStateData: import('../types').MentalStateData, log: Omit<SleepLog, 'id' | 'astronautId'>) => Promise<void>;
  addStressAssessment: (assessment: Omit<StressAssessment, 'id' | 'astronautId' | 'completedAt'>) => Promise<void>;
  addWellBeingAssessment: (assessment: Omit<WellBeingAssessment, 'id' | 'astronautId' | 'completedAt'>) => Promise<void>;
  updatePsychMetrics: (metrics: Partial<PsychMetrics>) => Promise<void>;
  logActivityEvent: (type: 'view' | 'measurement') => Promise<void>;
  updateAstronautProfile: (updates: Partial<Astronaut>) => Promise<void>;
  updateAstronautPhoto: (fileOrDataUrl: File | string) => Promise<string>;
  recalculateAll: () => void;
}

const EMPTY_ASTRONAUT: Astronaut = {
  id: CURRENT_USER_ID, matricule: CURRENT_USER_ID, name: 'Ariane Solenne', age: 36, sex: 'female', weightKg: 64, heightCm: 171, mission: 'station', missionName: 'Aurora-7', missionDay: 60, demo: true
};

function createLocalId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function assertCurrentAstronaut(astronaut: Astronaut): void {
  if (astronaut.id !== CURRENT_USER_ID) throw new Error(`Le profil actif doit être ${CURRENT_USER_ID}.`);
}

async function loadProfileData(astronautId: string) {
  const [measurements, sleepLogs, boneRecords, psychAssessments, activityEvents, stressAssessments, wellBeingAssessments] = await Promise.all([
    db.measurements.where('astronautId').equals(astronautId).toArray(),
    db.sleepLogs.where('astronautId').equals(astronautId).toArray(),
    db.boneDensityRecords.where('astronautId').equals(astronautId).toArray(),
    db.psychAssessments.where('astronautId').equals(astronautId).toArray(),
    db.activityEvents.where('astronautId').equals(astronautId).toArray(),
    db.stressAssessments.where('astronautId').equals(astronautId).toArray(),
    db.wellBeingAssessments.where('astronautId').equals(astronautId).toArray()
  ]);
  return { measurements, sleepLogs, boneRecords, psychAssessments, activityEvents, stressAssessments, wellBeingAssessments };
}

export const useAstroStore = create<AstroState>((set, get) => ({
  astronaut: EMPTY_ASTRONAUT,
  measurements: [],
  sleepLogs: [],
  boneRecords: [],
  psychAssessments: [],
  stressAssessments: [],
  wellBeingAssessments: [],
  activityEvents: [],
  isLoading: true,

  cardioScore: null,
  sleepScore: null,
  boneLossScore: null,
  radiationProjection: null,
  latestAssessments: new Map(),
  patterns: [],
  dominantPattern: undefined,
  summaryFr: 'Tous les paramètres sont dans les normes orbitales.',
  summaryEn: 'All parameters are within nominal orbital limits.',
  globalStatus: 'normal',
  globalScore: 92,
  activeAlertsCount: 0,

  init: async () => {
    set({ isLoading: true });
    if (import.meta.env.DEV || import.meta.env.VITE_LOAD_DEMO_DATA === 'true') {
      (window as Window & { seedAstrohealthDemo?: (options?: { reset?: boolean }) => Promise<unknown> }).seedAstrohealthDemo = seedFictionalCrew;
    }
    const demoEnabled = import.meta.env.DEV || import.meta.env.VITE_LOAD_DEMO_DATA === 'true';
    const savedProfile = await db.astronauts.get(CURRENT_USER_ID);
    const markedRows = await db.measurements.where('astronautId').equals(CURRENT_USER_ID).filter((row) => row.demo === true).toArray();
    const newestDemoTimestamp = markedRows.reduce<number | undefined>((latest, row) => latest === undefined || row.timestamp > latest ? row.timestamp : latest, undefined);
    const forceSeed = import.meta.env.VITE_DEMO_SEED_FORCE === 'true';
    const seedableProfile = !savedProfile || savedProfile.demo === true || isLegacyFictionalProfile(savedProfile);
    if (shouldAutoSeedFictionalCrew(demoEnabled && seedableProfile, Boolean(savedProfile?.demo) || isLegacyFictionalProfile(savedProfile), newestDemoTimestamp, Date.now(), forceSeed)) {
      await seedFictionalCrew();
    }
    const astronaut = await db.astronauts.get(CURRENT_USER_ID);
    if (!astronaut) {
      set({ astronaut: EMPTY_ASTRONAUT, measurements: [], sleepLogs: [], boneRecords: [], psychAssessments: [], stressAssessments: [], wellBeingAssessments: [], activityEvents: [], isLoading: false });
      return;
    }
    const profileData = await loadProfileData(astronaut.id);
    // Log current app visit
    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayEvent = profileData.activityEvents.some((e) => e.date === todayStr);
    if (!hasTodayEvent) {
      const newEv: ActivityEvent = {
        id: `act-visit-${Date.now()}`,
        astronautId: astronaut.id,
        date: todayStr,
        type: 'view'
      };
      await db.activityEvents.put(newEv);
      profileData.activityEvents.push(newEv);
    }

    set({
      astronaut,
      ...profileData,
      isLoading: false
    });

    get().recalculateAll();
  },

  addMeasurement: async (metric, value, unit, context) => {
    const { astronaut, measurements, activityEvents } = get();
    assertCurrentAstronaut(astronaut);
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    const newM: Measurement = {
      id: createLocalId('m'),
      astronautId: astronaut.id,
      metric,
      value,
      unit,
      timestamp: now,
      source: 'manual',
      context
    };

    await db.measurements.put(newM);

    // Register measurement activity event
    await db.activityEvents.put({
      id: `act-${now}`,
      astronautId: astronaut.id,
      date: todayStr,
      type: 'measurement'
    });

    set({
      measurements: [...measurements, newM],
      activityEvents: [
        ...activityEvents.filter((e) => e.date !== todayStr || e.type !== 'measurement'),
        { id: `act-${now}`, astronautId: astronaut.id, date: todayStr, type: 'measurement' }
      ]
    });

    get().recalculateAll();
  },

  addBodyMeasurements: async (values) => {
    validateBodyMeasureValues(values);
    const { astronaut, measurements, activityEvents } = get();
    assertCurrentAstronaut(astronaut);
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const newMeasurements = Object.entries(values).map(([key, value]) => {
      const field = BODY_MEASURE_FIELD_BY_KEY[key as BodyMeasureKey];
      return {
        id: createLocalId('body'), astronautId: astronaut.id, metric: field.metric,
        value: value as number, unit: field.unit, timestamp: now,
        source: 'manual' as const
      };
    });
    const event: ActivityEvent = {
      id: createLocalId('act-body'), astronautId: astronaut.id, date: todayStr, type: 'measurement'
    };
    await db.transaction('rw', db.measurements, db.activityEvents, async () => {
      await db.measurements.bulkAdd(newMeasurements);
      await db.activityEvents.put(event);
    });
    set({
      measurements: [...measurements, ...newMeasurements],
      activityEvents: [...activityEvents.filter((entry) => entry.date !== todayStr || entry.type !== 'measurement'), event]
    });
    get().recalculateAll();
  },

  addSleepLog: async (logData) => {
    const { astronaut, sleepLogs, activityEvents } = get();
    assertCurrentAstronaut(astronaut);
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const newLog: SleepLog = {
      id: `sleep-${astronaut.id}-${logData.date}`,
      astronautId: astronaut.id,
      ...logData
    };

    await db.sleepLogs.put(newLog);

    // Register measurement activity
    await db.activityEvents.put({
      id: `act-sleep-${now}`,
      astronautId: astronaut.id,
      date: todayStr,
      type: 'measurement'
    });

    const updatedSleepLogs = [...sleepLogs.filter((log) => log.date !== logData.date), newLog];
    set({
      sleepLogs: updatedSleepLogs,
      activityEvents: [
        ...activityEvents.filter((e) => e.date !== todayStr || e.type !== 'measurement'),
        { id: `act-sleep-${now}`, astronautId: astronaut.id, date: todayStr, type: 'measurement' }
      ]
    });
    get().recalculateAll();
  },

  addPsychAssessment: async (mentalStateData) => {
    const { astronaut, psychAssessments, activityEvents } = get();
    validate_mental_state(mentalStateData, { sleepQualityCalculated: true });
    assertCurrentAstronaut(astronaut);
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const score = Math.round((mentalStateData.Happiness / 10) * 100);
    const status: Status = score >= 70 ? 'normal' : score >= 50 ? 'watch' : score >= 30 ? 'action' : 'contact_flight_surgeon';

    const newAssessment: PsychAssessment = {
      id: `psych-${now}`,
      astronautId: astronaut.id,
      date: todayStr,
      answers: [],
      score,
      status,
      mentalStateData
    };

    await db.psychAssessments.put(newAssessment);

    // Register measurement activity
    await db.activityEvents.put({
      id: `act-psych-${now}`,
      astronautId: astronaut.id,
      date: todayStr,
      type: 'measurement'
    });

    set({
      psychAssessments: [...psychAssessments, newAssessment],
      activityEvents: [
        ...activityEvents.filter((e) => e.date !== todayStr || e.type !== 'measurement'),
        { id: `act-psych-${now}`, astronautId: astronaut.id, date: todayStr, type: 'measurement' }
      ]
    });
    get().recalculateAll();
  },

  addMentalAssessment: async (mentalStateData, logData) => {
    const { astronaut, sleepLogs, psychAssessments, activityEvents } = get();
    assertCurrentAstronaut(astronaut);
    validate_mental_state(mentalStateData, { sleepQualityCalculated: true });
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const newLog: SleepLog = { id: `sleep-${astronaut.id}-${logData.date}`, astronautId: astronaut.id, ...logData };
    const score = Math.round((mentalStateData.Happiness / 10) * 100);
    const status: Status = score >= 70 ? 'normal' : score >= 50 ? 'watch' : score >= 30 ? 'action' : 'contact_flight_surgeon';
    const newAssessment: PsychAssessment = {
      id: createLocalId('psych'), astronautId: astronaut.id, date: todayStr,
      answers: [], score, status, mentalStateData
    };
    const assessmentEvent: ActivityEvent = { id: `act-assessment-${now}`, astronautId: astronaut.id, date: todayStr, type: 'measurement' };
    await db.transaction('rw', db.sleepLogs, db.psychAssessments, db.activityEvents, async () => {
      await db.sleepLogs.put(newLog);
      await db.psychAssessments.put(newAssessment);
      await db.activityEvents.put(assessmentEvent);
    });
    set({
      sleepLogs: [...sleepLogs.filter((entry) => entry.date !== logData.date), newLog],
      psychAssessments: [...psychAssessments, newAssessment],
      activityEvents: [...activityEvents.filter((entry) => entry.date !== todayStr || entry.type !== 'measurement'), assessmentEvent]
    });
    get().recalculateAll();
  },

  addStressAssessment: async (assessment) => {
    const astronaut = get().astronaut;
    assertCurrentAstronaut(astronaut);
    const record: StressAssessment = { ...assessment, id: createLocalId('stress'), astronautId: astronaut.id, completedAt: new Date().toISOString() };
    await db.stressAssessments.put(record);
    set((state) => ({ stressAssessments: [...state.stressAssessments, record] }));
  },

  addWellBeingAssessment: async (assessment) => {
    const astronaut = get().astronaut;
    assertCurrentAstronaut(astronaut);
    const record: WellBeingAssessment = { ...assessment, id: createLocalId('wellbeing'), astronautId: astronaut.id, completedAt: new Date().toISOString() };
    await db.wellBeingAssessments.put(record);
    set((state) => ({ wellBeingAssessments: [...state.wellBeingAssessments, record] }));
  },

  updatePsychMetrics: async (metrics) => {
    const { psychAssessments } = get();
    if (psychAssessments.length === 0) return;
    const sorted = [...psychAssessments].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const updated: PsychAssessment = {
      ...latest,
      ...metrics
    };

    await db.psychAssessments.put(updated);
    set({
      psychAssessments: psychAssessments.map((p) => (p.id === updated.id ? updated : p))
    });
    get().recalculateAll();
  },

  logActivityEvent: async (type) => {
    const { astronaut, activityEvents } = get();
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const newEv: ActivityEvent = {
      id: `act-${type}-${now}`,
      astronautId: astronaut.id,
      date: todayStr,
      type
    };

    await db.activityEvents.put(newEv);
    set({
      activityEvents: [
        ...activityEvents.filter((e) => e.date !== todayStr || (type === 'measurement' ? e.type !== 'measurement' : false)),
        newEv
      ]
    });
  },

  updateAstronautProfile: async (updates) => {
    const { astronaut } = get();
    assertCurrentAstronaut(astronaut);
    const updated: Astronaut = { ...astronaut, ...updates };
    await db.astronauts.put(updated);
    if (updated.matricule) await db.users.put(updated);
    set({
      astronaut: updated
    });
    get().recalculateAll();
  },

  updateAstronautPhoto: async (fileOrDataUrl) => {
    const resizedDataUrl = await resizeImageToSquare(fileOrDataUrl, 256);
    await get().updateAstronautProfile({ photo: resizedDataUrl });
    return resizedDataUrl;
  },

  recalculateAll: () => {
    const { measurements, sleepLogs, boneRecords, psychAssessments, astronaut } = get();

    // 1. Cardio score
    const sysList = measurements
      .filter((m) => m.metric === 'bpSys')
      .sort((a, b) => b.timestamp - a.timestamp);
    const hrList = measurements
      .filter((m) => m.metric === 'heartRate')
      .sort((a, b) => b.timestamp - a.timestamp);

    const pairedCardio = [];
    for (let i = 0; i < Math.min(sysList.length, hrList.length, 3); i++) {
      pairedCardio.push({ sys: sysList[i].value, hr: hrList[i].value });
    }
    const cardioScore = calcCardio(pairedCardio, { age: astronaut.age, sex: astronaut.sex });

    // 2. Sleep score
    const sortedSleep = [...sleepLogs].sort((a, b) => b.date.localeCompare(a.date));
    let sleepScore: ScoreResult | null = null;
    if (sortedSleep.length > 0) {
      sleepScore = calcSleep(sortedSleep[0], sortedSleep.slice(1, 8));
    }

    // 3. Bone loss score
    const baselineBones = boneRecords.filter((b) => b.isBaseline);
    const currentBones = boneRecords.filter((b) => !b.isBaseline);
    const boneLossScore = calcBone(baselineBones, currentBones);

    // 4. Radiation score
    const radList = measurements
      .filter((m) => m.metric === 'radiationDose')
      .sort((a, b) => b.timestamp - a.timestamp);
    const latestRad = radList[0]?.value;
    const radHistory = radList.slice(0, 14).map((r) => ({
      date: new Date(r.timestamp).toISOString().split('T')[0],
      cumulativeDose_mSv: r.value
    }));
    const radiationProjection = latestRad === undefined
      ? null
      : calcRad(latestRad, astronaut.mission, radHistory, astronaut.careerRadiationDose || 0);

    // 5. Biometric assessments map
    const latestAssessments = new Map<Metric, Assessment>();
    const metricsToAssess: Metric[] = [
      'heartRate', 'bpSys', 'bpDia', 'temperature', 'spo2', 'glucose', 'fastingGlucose',
      'boneZScore', 'muscleStrengthLoss', 'radiationDose', 'radiationDoseDaily',
      'intraocularPressure', 'urineSpecificGravity', 'co2PartialPressure'
    ];

    metricsToAssess.forEach((metric) => {
      const records = measurements
        .filter((m) => m.metric === metric)
        .sort((a, b) => b.timestamp - a.timestamp);
      if (records.length > 0) {
        const latest = records[0];
        // 14-day rolling window for baseline
        const past14 = records.slice(0, 14).map((r) => r.value);
        let baseline;
        if (past14.length >= 2) {
          const mean = past14.reduce((a, b) => a + b, 0) / past14.length;
          const variance = past14.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (past14.length - 1);
          baseline = { mean, std: Math.sqrt(variance) };
        }

        if (metric === 'glucose') {
          latestAssessments.set(
            'glucose',
            calcGlucose(latest.value, (latest.context as any) || 'fasting', baseline, astronaut.bloodGlucoseUnit)
          );
        } else {
          latestAssessments.set(metric, calcGeneric(latest.metric, latest.value, baseline));
        }
      }
    });

    // 6. Fusion & multi-metric patterns
    const latestHr = hrList[0]?.value;
    const latestSys = sysList[0]?.value;
    const latestDia = measurements.find((m) => m.metric === 'bpDia')?.value;
    const latestTemp = measurements.find((m) => m.metric === 'temperature')?.value;
    const latestSleepHours = sortedSleep[0]?.hours;
    const newestFastingGlucose = measurements.filter((m) => m.metric === 'fastingGlucose').sort((a, b) => b.timestamp - a.timestamp)[0];
    const glucoseModelScale = BODY_MEASURE_FIELD_BY_KEY.Fasting_Glucose.modelConversion?.multiplier ?? 1;
    const latestGlucose = newestFastingGlucose
      ? newestFastingGlucose.value * glucoseModelScale
      : measurements.filter((m) => m.metric === 'glucose').sort((a, b) => b.timestamp - a.timestamp)[0]?.value;
    const latestMood = psychAssessments[psychAssessments.length - 1]?.mentalStateData
      ? Math.round((psychAssessments[psychAssessments.length - 1].mentalStateData!.Happiness / 10) * 100)
      : psychAssessments[psychAssessments.length - 1]?.score;

    const missionStartDate = astronaut.missionStartDate ?? boneRecords
      .filter((record) => record.isBaseline)
      .map((record) => record.date)
      .sort()[0];

    const detectedPatterns = detectPatterns({
      heartRate: latestHr,
      bpSys: latestSys,
      bpDia: latestDia,
      temperature: latestTemp,
      sleepHours: latestSleepHours,
      glucose: latestGlucose,
      mood: latestMood,
      exerciseMin: 50,
      boneLossPercent: boneLossScore?.value,
      missionStartDate
    });

    const allIndividualStatuses: Status[] = [];
    if (sleepScore?.status) allIndividualStatuses.push(sleepScore.status);
    if (boneLossScore?.status) allIndividualStatuses.push(boneLossScore.status);
    latestAssessments.forEach((ass) => allIndividualStatuses.push(ass.status));

    const fusion = fuseHealthStatus(allIndividualStatuses, detectedPatterns);

    let rawScore = 100;
    if (cardioScore) rawScore -= (100 - cardioScore.value) * 0.35;
    if (sleepScore) rawScore -= (100 - sleepScore.value) * 0.35;
    if (boneLossScore && boneLossScore.value > 2) rawScore -= Math.min(30, boneLossScore.value * 3);
    if (radiationProjection && radiationProjection.status !== 'normal') rawScore -= 15;
    if (fusion.patterns.length > 0) rawScore -= fusion.patterns.length * 8;

    const globalScore = Math.max(20, Math.min(100, Math.round(rawScore)));
    const alertsCount = allIndividualStatuses.filter((s) => s === 'action' || s === 'contact_flight_surgeon').length;

    set({
      cardioScore,
      sleepScore,
      boneLossScore,
      radiationProjection,
      latestAssessments,
      patterns: fusion.patterns,
      dominantPattern: fusion.dominantPattern,
      summaryFr: fusion.summaryFr,
      summaryEn: fusion.summaryEn,
      globalStatus: fusion.overallStatus,
      globalScore,
      activeAlertsCount: alertsCount
    });
  }
}));
