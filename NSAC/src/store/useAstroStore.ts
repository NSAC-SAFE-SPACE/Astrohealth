import { create } from 'zustand';
import { db } from '../db';
import type {
  Astronaut,
  Measurement,
  SleepLog,
  BoneDensityRecord,
  PsychAssessment,
  ActivityEvent,
  Status,
  ScoreResult,
  Assessment,
  Metric
} from '../types';
import {
  DEFAULT_ASTRONAUT,
  seedDemoData
} from '../services/simulator';

// Import pure scoring functions
import { calculateCardioScore as calcCardio } from '../engine/scores/cardio';
import { calculateSleepScore as calcSleep } from '../engine/scores/sleep';
import { calculateMultiSiteBoneLoss as calcBone } from '../engine/scores/bone';
import { projectRadiation as calcRad } from '../engine/scores/radiation';
import { assessGlucose as calcGlucose } from '../engine/scores/glucose';
import { assessMeasurement as calcGeneric } from '../engine/status';

export interface AstroState {
  astronaut: Astronaut;
  measurements: Measurement[];
  sleepLogs: SleepLog[];
  boneRecords: BoneDensityRecord[];
  psychAssessments: PsychAssessment[];
  activityEvents: ActivityEvent[];
  isLoading: boolean;
  activeScenario: 'healthy' | 'fatigue' | 'isolation' | 'bone_loss' | 'radiation_spike';
  missionDay: number;

  // Real-time computed states & scores
  cardioScore: ReturnType<typeof calcCardio> | null;
  sleepScore: ScoreResult | null;
  boneLossScore: ReturnType<typeof calcBone> | null;
  radiationProjection: ReturnType<typeof calcRad> | null;
  latestAssessments: Map<Metric, Assessment>;
  globalStatus: Status;
  globalScore: number;
  activeAlertsCount: number;

  // Actions
  init: () => Promise<void>;
  loadScenario: (scenario: 'healthy' | 'fatigue' | 'isolation' | 'bone_loss' | 'radiation_spike') => Promise<void>;
  advanceTime24h: () => Promise<void>;
  addMeasurement: (metric: Metric, value: number, unit: string, context?: string) => Promise<void>;
  addSleepLog: (log: Omit<SleepLog, 'id' | 'astronautId'>) => Promise<void>;
  addPsychAssessment: (answers: number[]) => Promise<void>;
  updateAstronautProfile: (updates: Partial<Astronaut>) => Promise<void>;
  recalculateAll: () => void;
}

export const useAstroStore = create<AstroState>((set, get) => ({
  astronaut: DEFAULT_ASTRONAUT,
  measurements: [],
  sleepLogs: [],
  boneRecords: [],
  psychAssessments: [],
  activityEvents: [],
  isLoading: true,
  activeScenario: 'healthy',
  missionDay: 142,

  cardioScore: null,
  sleepScore: null,
  boneLossScore: null,
  radiationProjection: null,
  latestAssessments: new Map(),
  globalStatus: 'normal',
  globalScore: 92,
  activeAlertsCount: 0,

  init: async () => {
    set({ isLoading: true });
    let astro = await db.astronauts.toCollection().first();
    const count = await db.measurements.count();

    if (!astro || count === 0) {
      await seedDemoData('healthy');
      astro = await db.astronauts.toCollection().first();
    }

    const measurements = await db.measurements.orderBy('timestamp').toArray();
    const sleepLogs = await db.sleepLogs.toArray();
    const boneRecords = await db.boneDensityRecords.toArray();
    const psychAssessments = await db.psychAssessments.toArray();
    const activityEvents = await db.activityEvents.toArray();

    // Log current app visit
    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayEvent = activityEvents.some((e) => e.date === todayStr);
    if (!hasTodayEvent) {
      const newEv: ActivityEvent = {
        id: `act-visit-${Date.now()}`,
        astronautId: astro?.id || DEFAULT_ASTRONAUT.id,
        date: todayStr,
        type: 'view'
      };
      await db.activityEvents.put(newEv);
      activityEvents.push(newEv);
    }

    set({
      astronaut: astro || DEFAULT_ASTRONAUT,
      measurements,
      sleepLogs,
      boneRecords,
      psychAssessments,
      activityEvents,
      isLoading: false
    });

    get().recalculateAll();
  },

  loadScenario: async (scenario) => {
    set({ isLoading: true, activeScenario: scenario });
    await seedDemoData(scenario);
    await get().init();
  },

  advanceTime24h: async () => {
    const { missionDay, astronaut } = get();
    const todayStr = new Date().toISOString().split('T')[0];
    // Add activity event for the new day
    await db.activityEvents.put({
      id: `act-adv-${Date.now()}`,
      astronautId: astronaut.id,
      date: todayStr,
      type: 'login'
    });
    set({ missionDay: missionDay + 1 });
    await get().init();
  },

  addMeasurement: async (metric, value, unit, context) => {
    const { astronaut, measurements, activityEvents } = get();
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    const newM: Measurement = {
      id: `m-${now}`,
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

  addSleepLog: async (logData) => {
    const { astronaut, sleepLogs } = get();
    const newLog: SleepLog = {
      id: `sleep-${Date.now()}`,
      astronautId: astronaut.id,
      ...logData
    };

    await db.sleepLogs.put(newLog);
    set({ sleepLogs: [...sleepLogs, newLog] });
    get().recalculateAll();
  },

  addPsychAssessment: async (answers) => {
    const { astronaut, psychAssessments } = get();
    const sum = answers.reduce((a, b) => a + b, 0);
    const score = sum * 4;
    const status: Status =
      score >= 68 ? 'normal' : score >= 50 ? 'watch' : score >= 29 ? 'action' : 'contact_flight_surgeon';

    const newAssessment: PsychAssessment = {
      id: `psych-${Date.now()}`,
      astronautId: astronaut.id,
      date: new Date().toISOString().split('T')[0],
      answers,
      score,
      status
    };

    await db.psychAssessments.put(newAssessment);
    set({ psychAssessments: [...psychAssessments, newAssessment] });
    get().recalculateAll();
  },

  updateAstronautProfile: async (updates) => {
    const { astronaut } = get();
    const updated = { ...astronaut, ...updates };
    await db.astronauts.put(updated);
    set({ astronaut: updated });
    get().recalculateAll();
  },

  recalculateAll: () => {
    const { measurements, sleepLogs, boneRecords, astronaut } = get();

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
    const latestRad = radList[0]?.value || 35.0;
    const radHistory = radList.slice(0, 14).map((r) => ({
      date: new Date(r.timestamp).toISOString().split('T')[0],
      cumulativeDose_mSv: r.value
    }));
    const radiationProjection = calcRad(
      latestRad,
      astronaut.mission,
      radHistory,
      astronaut.careerRadiationDose || 0
    );

    // 5. Biometric assessments map
    const latestAssessments = new Map<Metric, Assessment>();
    const metricsToAssess: Metric[] = ['heartRate', 'bpSys', 'temperature', 'spo2', 'glucose'];

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
          latestAssessments.set('heartRate', calcGeneric(latest.metric, latest.value, baseline));
        }
      }
    });

    // 6. Global score & status
    const allStatuses: Status[] = [];
    if (cardioScore?.status) allStatuses.push(cardioScore.status);
    if (sleepScore?.status) allStatuses.push(sleepScore.status);
    if (boneLossScore?.status) allStatuses.push(boneLossScore.status);
    if (radiationProjection?.status) allStatuses.push(radiationProjection.status);

    const hierarchy: Status[] = ['normal', 'watch', 'action', 'contact_flight_surgeon'];
    const worstStatus = allStatuses.reduce<Status>((acc, s) => {
      return hierarchy.indexOf(s) > hierarchy.indexOf(acc) ? s : acc;
    }, 'normal');

    let rawScore = 100;
    if (cardioScore) rawScore -= (100 - cardioScore.value) * 0.35;
    if (sleepScore) rawScore -= (100 - sleepScore.value) * 0.35;
    if (boneLossScore && boneLossScore.value > 2) rawScore -= Math.min(30, boneLossScore.value * 3);
    if (radiationProjection && radiationProjection.status !== 'normal') rawScore -= 15;

    const globalScore = Math.max(20, Math.min(100, Math.round(rawScore)));
    const alertsCount = allStatuses.filter((s) => s === 'action' || s === 'contact_flight_surgeon').length;

    set({
      cardioScore,
      sleepScore,
      boneLossScore,
      radiationProjection,
      latestAssessments,
      globalStatus: worstStatus,
      globalScore,
      activeAlertsCount: alertsCount
    });
  }
}));
