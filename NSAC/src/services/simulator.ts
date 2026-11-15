import { db } from '../db';
import type {
  Astronaut,
  Measurement,
  SleepLog,
  PsychAssessment,
  ActivityEvent,
} from '../types';
import { DEFAULT_AVATAR_SILHOUETTE, ENVIRONMENT_COMM_DELAYS } from './profile';
import { BODY_MEASURE_FIELDS, validateBodyMeasureValues, type BodyMeasureKey } from '../engine/config/bodyMeasures';
import { calculatePsychScore, evaluatePsychStatus } from '../engine/scores/psych';
import { computePsychSleepQuality, computeSleepQuality } from '../engine/scores/sleep';
import { createMentalStateData } from '../features/mental/mentalState';

export const DEMO_ACCOUNT_IDS = Array.from({ length: 10 }, (_, index) => `AST-${String(index + 1).padStart(4, '0')}`);

export function shouldAutoSeedFictionalCrew(enabled: boolean, existingDemoAccountCount: number, force = false): boolean {
  return enabled && (force || existingDemoAccountCount === 0);
}

/** Remove only records owned by the ten known fictional crew accounts. */
export async function resetFictionalCrew(): Promise<void> {
  await db.transaction('rw', [
    db.users, db.astronauts, db.measurements, db.sleepLogs, db.psychAssessments,
    db.activityEvents, db.boneDensityRecords, db.labResults, db.reports
  ], async () => {
    await db.users.where('matricule').anyOf(DEMO_ACCOUNT_IDS).delete();
    await db.astronauts.bulkDelete(DEMO_ACCOUNT_IDS);
    for (const table of [
      db.measurements, db.sleepLogs, db.psychAssessments, db.activityEvents,
      db.boneDensityRecords, db.labResults, db.reports
    ]) {
      await table.where('astronautId').anyOf(DEMO_ACCOUNT_IDS).delete();
    }
  });
}

/** Seed a stable, entirely fictional multi-crew dataset without clearing existing app data. */
export async function seedFictionalCrew(options: { reset?: boolean } = {}): Promise<{ astronauts: number; measurements: number; sleepLogs: number; assessments: number; activityEvents: number }> {
  if (options.reset) await resetFictionalCrew();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const crew = [
    { id: 'AST-0001', name: 'Maëlys Virelande', age: 34, sex: 'female' as const, heightCm: 168, weightKg: 61, mission: 'station' as const, launch: '2026-10-01', days: 45, mode: 'steady' },
    { id: 'AST-0002', name: 'Idriss Solmaren', age: 42, sex: 'male' as const, heightCm: 181, weightKg: 79, mission: 'station' as const, launch: '2026-10-01', days: 36, mode: 'fatigue' },
    { id: 'AST-0003', name: 'Noura Cendrelune', age: 31, sex: 'female' as const, heightCm: 172, weightKg: 64, mission: 'spacecraft' as const, launch: '2026-10-18', days: 30, mode: 'steady' },
    { id: 'AST-0004', name: 'Sacha Orvélis', age: 47, sex: 'male' as const, heightCm: 176, weightKg: 83, mission: 'spacecraft' as const, launch: '2026-10-18', days: 21, mode: 'isolation' },
    { id: 'AST-0005', name: 'Elian Brumeciel', age: 38, sex: 'male' as const, heightCm: 188, weightKg: 86, mission: 'lunar_base' as const, launch: '2026-10-28', days: 14, mode: 'steady' },
    { id: 'AST-0006', name: 'Yuna Valombre', age: 29, sex: 'female' as const, heightCm: 164, weightKg: 56, mission: 'lunar_base' as const, launch: '2026-10-28', days: 9, mode: 'adaptation' },
    { id: 'AST-0007', name: 'Téo Mirastel', age: 52, sex: 'male' as const, heightCm: 174, weightKg: 75, mission: 'mars_rover' as const, launch: '2026-11-04', days: 6, mode: 'steady' },
    { id: 'AST-0008', name: 'Liora Destenac', age: 36, sex: 'female' as const, heightCm: 179, weightKg: 68, mission: 'mars_rover' as const, launch: '2026-11-04', days: 3, mode: 'steady' },
    { id: 'AST-0009', name: 'Kamil Asterive', age: 40, sex: 'male' as const, heightCm: 183, weightKg: 81, mission: 'spacecraft' as const, launch: '2026-11-12', days: 1, mode: 'steady' },
    { id: 'AST-0010', name: 'Ilyana Rovelune', age: 33, sex: 'female' as const, heightCm: 170, weightKg: 59, mission: 'station' as const, launch: '2026-11-15', days: 5, mode: 'steady', incomplete: true }
  ];

  const tables = { astronauts: [] as Astronaut[], measurements: [] as Measurement[], sleepLogs: [] as SleepLog[], psychAssessments: [] as PsychAssessment[], activityEvents: [] as ActivityEvent[] };
  const unitByMetric = new Map(BODY_MEASURE_FIELDS.map((field) => [field.metric, field.unit]));
  const valueFor = (metric: string, day: number, seed: number, mode: string, dailyDose: number, cumulative: number): number => {
    const n = Math.sin((seed + 3) * 19.17 + day * 7.31) * 10000;
    const noise = n - Math.floor(n);
    const wobble = (noise - 0.5);
    const stress = mode === 'fatigue' && day >= 30 ? 1 : mode === 'isolation' && day >= 12 ? 1 : 0;
    const adaptation = mode === 'adaptation' && day >= 4 ? -1 : 0;
    const values: Record<string, number> = {
      boneZScore: Math.max(-1.5, 0.25 - day * 0.012 + wobble * 0.1),
      muscleStrengthLoss: Math.min(18, Math.max(0, day * 0.11 + wobble * 1.2)),
      heartRate: 67 + stress * 8 + adaptation * 2 + wobble * 7,
      bpSys: 116 + stress * 7 + wobble * 7,
      bpDia: 74 + stress * 4 + wobble * 5,
      spo2: 97.5 + wobble * 1.8,
      radiationDoseDaily: dailyDose,
      radiationDose: cumulative,
      intraocularPressure: 15.5 + day * 0.012 + wobble * 1.6,
      temperature: 36.7 + stress * 0.15 + wobble * 0.3,
      urineSpecificGravity: 1.014 + (mode === 'fatigue' ? 0.004 : 0) + wobble * 0.006,
      co2PartialPressure: 2.4 + (mode === 'isolation' ? 0.35 : 0) + wobble * 0.55,
      fastingGlucose: 0.88 + stress * 0.1 + wobble * 0.12
    };
    const value = values[metric] ?? 0;
    return metric === 'urineSpecificGravity' ? Number(value.toFixed(3)) : Number(value.toFixed(1));
  };

  for (let crewIndex = 0; crewIndex < crew.length; crewIndex++) {
    const person = crew[crewIndex];
    const missionStart = new Date(`${person.launch}T00:00:00Z`).getTime();
    const missionDay = Math.max(1, Math.floor((today.getTime() - missionStart) / 86400000) + 1);
    const profile: Astronaut = {
      id: person.id, matricule: person.id, name: person.name, age: person.age, sex: person.sex,
      heightCm: person.heightCm, weightKg: person.weightKg, mission: person.mission,
      photo: DEFAULT_AVATAR_SILHOUETTE, careerRadiationDose: 48 + crewIndex * 13,
      baselineBoneDensity: { total_hip: 1.01 + crewIndex * 0.006, lumbar_spine: 1.14 + crewIndex * 0.005, femoral_neck: 0.94 + crewIndex * 0.004 },
      bloodGlucoseUnit: 'mg/dL', commDelayMinutes: ENVIRONMENT_COMM_DELAYS[person.mission].nominalMin,
      missionDay, createdAt: new Date(today.getTime() - (person.days - 1) * 86400000).toISOString(),
      profileComplete: !person.incomplete
    };
    tables.astronauts.push(profile);

    let cumulative = 8 + crewIndex * 2;
    const daysToGenerate = person.days;
    for (let age = daysToGenerate - 1; age >= 0; age--) {
      // Crew member 9 is the requested one-measure account registered today.
      if (person.id === 'AST-0009') {
        const date = today.toISOString().slice(0, 10);
        tables.measurements.push({ id: `${person.id}-only-reading`, astronautId: person.id, metric: 'heartRate', value: 68, unit: 'bpm', timestamp: today.getTime() + 8 * 3600000, source: 'simulated' });
        tables.activityEvents.push({ id: `${person.id}-only-event`, astronautId: person.id, date, type: 'measurement' });
        break;
      }
      const dateObj = new Date(today.getTime() - age * 86400000);
      const date = dateObj.toISOString().slice(0, 10);
      const dayIndex = daysToGenerate - age;
      // A few realistic gaps. The last day is retained except for the one-reading account above.
      const skipped = age !== 0 && (dayIndex + crewIndex * 2) % 13 === 0;
      if (skipped) continue;
      const mode = person.mode;
      const dailyDose = Number(({ station: 0.6, spacecraft: 1.8, lunar_base: 1.4, mars_rover: 0.6 }[person.mission] * (0.86 + ((crewIndex + dayIndex) % 5) * 0.07)).toFixed(2));
      cumulative = Number((cumulative + dailyDose).toFixed(2));

      const bedtimeMinute = 22 * 60 + 25 + ((dayIndex * 17 + crewIndex * 11) % 95);
      const bedtime = `${String(Math.floor(bedtimeMinute / 60) % 24).padStart(2, '0')}:${String(bedtimeMinute % 60).padStart(2, '0')}`;
      const poorSleep = (mode === 'fatigue' && age < 9) || (mode === 'isolation' && age < 6);
      const sleep: SleepLog = {
        id: `sleep-${person.id}-${date}`, astronautId: person.id, date,
        hours: Number((poorSleep ? 5.4 + ((crewIndex + dayIndex) % 4) * 0.35 : 7.1 + ((crewIndex + dayIndex) % 5) * 0.32).toFixed(1)),
        bedtime, latencyBucket: poorSleep ? (dayIndex % 2 ? '30-60' : '15-30') : (dayIndex % 4 === 0 ? '15-30' : '<15'),
        awakenings: poorSleep ? 2 + (dayIndex % 2) : dayIndex % 5 === 0 ? 2 : dayIndex % 2,
        restfulness: poorSleep ? 2 : 3 + ((dayIndex + crewIndex) % 3)
      };
      const previousNights = tables.sleepLogs.filter((log) => log.astronautId === person.id && log.date >= new Date(dateObj.getTime() - 6 * 86400000).toISOString().slice(0, 10));
      sleep.calculatedQuality = computeSleepQuality(sleep, previousNights);
      tables.sleepLogs.push(sleep);

      const physical: Partial<Record<BodyMeasureKey, number>> = {};
      // Leave one or two channels absent on selected days; systolic and diastolic stay paired.
      const missingGroup = (dayIndex + crewIndex) % 4;
      for (const field of BODY_MEASURE_FIELDS) {
        const group = field.metric === 'bpSys' || field.metric === 'bpDia' ? 1 : field.metric === 'radiationDoseDaily' || field.metric === 'radiationDose' ? 2 : field.metric === 'co2PartialPressure' ? 3 : 0;
        if ((missingGroup === 1 && group === 3) || (missingGroup === 2 && group === 2) || (missingGroup === 3 && field.metric === 'intraocularPressure')) continue;
        physical[field.key] = valueFor(field.metric, dayIndex, crewIndex, mode, dailyDose, cumulative);
      }
      validateBodyMeasureValues(physical);
      for (const field of BODY_MEASURE_FIELDS) {
        const value = physical[field.key];
        if (value === undefined) continue;
        const hour = field.metric === 'fastingGlucose' ? 6 : field.metric === 'radiationDose' ? 20 : field.metric === 'temperature' ? 9 : 8;
        tables.measurements.push({ id: `m-${person.id}-${date}-${field.metric}`, astronautId: person.id, metric: field.metric, value, unit: unitByMetric.get(field.metric)!, timestamp: dateObj.getTime() + hour * 3600000, source: 'simulated' });
      }

      tables.activityEvents.push({ id: `act-${person.id}-${date}`, astronautId: person.id, date, type: 'measurement' });

      // A brief self-assessment every third day; sleep quality always comes from the score engine.
      if (dayIndex % 3 === 1 || age === 0) {
        const strained = poorSleep || (mode === 'isolation' && age < 9);
        const happiness = strained ? 4 + ((crewIndex + dayIndex) % 3) : 7 + ((crewIndex + dayIndex) % 4);
        const psychAnswers = strained ? [2, 2, 3, 2, 3] : [3, 4, 4, 4, 4];
        const psychScore = calculatePsychScore(psychAnswers);
        const status = evaluatePsychStatus(psychScore).status;
        const mental = createMentalStateData({
          Stress_level: strained ? 'High' : 'Low', Happiness: happiness,
          Mood_Score: strained ? 'negative' : 'positive',
          'Workload Perception': strained ? 'impossible' : 'possible',
          Time_Perception: strained ? 'Fast' : 'Normal', Food: dayIndex % 5 === 0 ? 'Neutral' : 'Good',
          Communication_with_Earth_mins: person.mission === 'station' ? 0.02 : person.mission === 'spacecraft' ? 5 + crewIndex : 1.5
        }, computePsychSleepQuality(sleep, previousNights));
        tables.psychAssessments.push({ id: `psych-${person.id}-${date}`, astronautId: person.id, date, answers: psychAnswers, score: psychScore, status, mentalStateData: mental });
      }
    }
  }

  await db.transaction('rw', [db.users, db.astronauts, db.measurements, db.sleepLogs, db.psychAssessments, db.activityEvents], async () => {
    for (const profile of tables.astronauts) {
      await db.users.put(profile);
      await db.astronauts.put(profile);
    }
    await db.measurements.bulkPut(tables.measurements);
    await db.sleepLogs.bulkPut(tables.sleepLogs);
    await db.psychAssessments.bulkPut(tables.psychAssessments);
    await db.activityEvents.bulkPut(tables.activityEvents);
  });

  return {
    astronauts: tables.astronauts.length, measurements: tables.measurements.length,
    sleepLogs: tables.sleepLogs.length, assessments: tables.psychAssessments.length,
    activityEvents: tables.activityEvents.length
  };
}

