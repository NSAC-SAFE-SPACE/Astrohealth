import { db } from '../db';
import type { ActivityEvent, Astronaut, Measurement, PsychAssessment, SleepLog } from '../types';
import { BODY_MEASURE_FIELDS, validateBodyMeasureValues, type BodyMeasureKey } from '../engine/config/bodyMeasures';
import { calculatePsychScore, evaluatePsychStatus } from '../engine/scores/psych';
import { computePsychSleepQuality } from '../engine/scores/sleep';
import { createMentalStateData, validate_mental_state } from '../features/mental/mentalState';
import { CURRENT_USER_ID } from '../config/currentUser';
import { DEFAULT_AVATAR_SILHOUETTE, ENVIRONMENT_COMM_DELAYS } from './profile';

const KNOWN_LEGACY_SEED_IDS = Array.from({ length: 10 }, (_, index) => `AST-${String(index + 1).padStart(4, '0')}`);
const LEGACY_DEMO_NAMES = new Set(['Maëlys Virelande', 'Idriss Solmaren', 'Noura Cendrelune', 'Sacha Orvélis', 'Elian Brumeciel', 'Yuna Valombre', 'Téo Mirastel', 'Liora Destenac', 'Kamil Asterive', 'Ilyana Rovelune']);
const DAY_MS = 24 * 60 * 60 * 1000;
export const DEMO_HISTORY_DAYS = 60;
export const DEMO_REFRESH_AGE_HOURS = 24;

export function isLegacyFictionalProfile(profile: Astronaut | undefined): boolean {
  return Boolean(profile && KNOWN_LEGACY_SEED_IDS.includes(profile.id) && LEGACY_DEMO_NAMES.has(profile.name));
}

export function shouldAutoSeedFictionalCrew(enabled: boolean, profileExists: boolean, newestDemoTimestamp: number | undefined, now = Date.now(), force = false): boolean {
  if (!enabled) return false;
  if (force) return true;
  if (!profileExists || newestDemoTimestamp === undefined) return true;
  return now - newestDemoTimestamp >= DEMO_REFRESH_AGE_HOURS * 60 * 60 * 1000;
}

function seededNoise(day: number, channel: number): number {
  const raw = Math.sin((day + 1) * 78.233 + (channel + 17) * 17.719 + 2026) * 43758.5453;
  return (raw - Math.floor(raw)) * 2 - 1;
}

function isoDate(epoch: number): string { return new Date(epoch).toISOString().slice(0, 10); }

function deleteByIds<T extends { id: string }>(table: { bulkDelete(keys: string[]): Promise<unknown> }, rows: T[], predicate: (row: T) => boolean) {
  const ids = rows.filter(predicate).map((row) => row.id);
  return ids.length ? table.bulkDelete(ids) : Promise.resolve();
}

/** Replace only generated rows; manually entered measurements and tests stay untouched. */
export async function seedFictionalCrew(options: { now?: Date; reset?: boolean } = {}): Promise<{ astronauts: number; measurements: number; sleepLogs: number; assessments: number; activityEvents: number; startDate: string; endDate: string }> {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const todayEpoch = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startDate = isoDate(todayEpoch - (DEMO_HISTORY_DAYS - 1) * DAY_MS);
  const endDate = isoDate(todayEpoch);
  const knownDemoIds = new Set(KNOWN_LEGACY_SEED_IDS);
  const oldProfiles = await db.astronauts.toArray();
  const oldUsers = await db.users.toArray();
  const rawCurrent = oldProfiles.find((profile) => profile.id === CURRENT_USER_ID);
  const rawCurrentUser = oldUsers.find((user) => (user.matricule ?? user.id) === CURRENT_USER_ID);
  const currentIsLegacySeed = Boolean((rawCurrent && LEGACY_DEMO_NAMES.has(rawCurrent.name)) || (rawCurrentUser && LEGACY_DEMO_NAMES.has(rawCurrentUser.name)));
  if ((rawCurrent && rawCurrent.demo !== true && !currentIsLegacySeed) || (rawCurrentUser && rawCurrentUser.demo !== true && !currentIsLegacySeed)) throw new Error(`Le profil ${CURRENT_USER_ID} n’est pas une donnée générée ; le seed s’arrête sans le modifier.`);
  const current = rawCurrent?.demo === true ? rawCurrent : undefined;
  const legacyProfileIds = new Set(oldProfiles.filter((profile) => knownDemoIds.has(profile.id) && (profile.demo === true || LEGACY_DEMO_NAMES.has(profile.name))).map((profile) => profile.id));
  if (currentIsLegacySeed) legacyProfileIds.add(CURRENT_USER_ID);
  const legacyUserIds = new Set(oldUsers.filter((user) => knownDemoIds.has(user.matricule ?? user.id) && (user.demo === true || LEGACY_DEMO_NAMES.has(user.name))).map((user) => user.matricule ?? user.id));

  const [oldMeasurements, oldSleeps, oldAssessments, oldEvents] = await Promise.all([
    db.measurements.toArray(), db.sleepLogs.toArray(), db.psychAssessments.toArray(), db.activityEvents.toArray()
  ]);
  const unitByMetric = new Map(BODY_MEASURE_FIELDS.map((field) => [field.metric, field.unit]));
  const measurements: Measurement[] = [];
  const sleepLogs: SleepLog[] = [];
  const psychAssessments: PsychAssessment[] = [];
  const activityEvents: ActivityEvent[] = [];
  const previousNights: SleepLog[] = [];
  let cumulativeDose = 0;

  const missionStartDate = current?.missionStartDate ?? startDate;
  const missionStartEpoch = Date.parse(`${missionStartDate}T00:00:00Z`);
  const profile: Astronaut = {
    ...(current ?? {} as Astronaut),
    id: CURRENT_USER_ID, matricule: CURRENT_USER_ID,
    name: current?.name ?? 'Ariane Solenne', age: current?.age ?? 36, sex: current?.sex ?? 'female',
    heightCm: current?.heightCm ?? 171, weightKg: current?.weightKg ?? 64,
    mission: current?.mission ?? 'station', missionName: 'Aurora-7',
    missionStartDate, missionDay: Math.max(1, Math.floor((todayEpoch - missionStartEpoch) / DAY_MS) + 1),
    photo: current?.photo ?? DEFAULT_AVATAR_SILHOUETTE,
    careerRadiationDose: current?.careerRadiationDose ?? 52,
    baselineBoneDensity: current?.baselineBoneDensity ?? { total_hip: 1.02, lumbar_spine: 1.12, femoral_neck: 0.96 },
    bloodGlucoseUnit: current?.bloodGlucoseUnit ?? 'mg/dL',
    commDelayMinutes: current?.commDelayMinutes ?? ENVIRONMENT_COMM_DELAYS.station.nominalMin,
    demo: true,
    createdAt: current?.createdAt ?? new Date(missionStartEpoch).toISOString()
  };

  for (let day = 0; day < DEMO_HISTORY_DAYS; day++) {
    const dateEpoch = todayEpoch - (DEMO_HISTORY_DAYS - 1 - day) * DAY_MS;
    const date = isoDate(dateEpoch);
    const nightHours = [31, 32, 46].includes(day) ? 5.4 + (day % 2) * 0.4 : 7.1 + ((day * 7) % 9) * 0.12;
    const bedtimeMinutes = 22 * 60 + 25 + ((day * 17) % 75);
    const bedtime = `${String(Math.floor(bedtimeMinutes / 60)).padStart(2, '0')}:${String(bedtimeMinutes % 60).padStart(2, '0')}`;
    const poorSleep = nightHours < 6;
    const sleep: SleepLog = {
      id: `demo-sleep-${CURRENT_USER_ID}-j${String(day).padStart(2, '0')}`,
      astronautId: CURRENT_USER_ID, date, demo: true,
      hours: Number(nightHours.toFixed(1)), bedtime,
      latencyBucket: poorSleep ? '30-60' : (day % 4 === 0 ? '15-30' : '<15'),
      awakenings: poorSleep ? 3 : day % 11 === 0 ? 2 : day % 3,
      restfulness: poorSleep ? 2 : 3 + (day % 3)
    };
    sleep.calculatedQuality = computePsychSleepQuality(sleep, previousNights.slice(-7));
    sleepLogs.push(sleep);
    previousNights.push(sleep);

    const dailyDose = Number((0.3 + (seededNoise(day, 1) + 1) * 0.3).toFixed(2));
    cumulativeDose = Number((cumulativeDose + dailyDose).toFixed(2));
    const dehydrated = day === 39;
    const body: Partial<Record<BodyMeasureKey, number>> = {
      Bone_ZScore: Number((0.12 - day * 0.0038 + seededNoise(day, 2) * 0.035).toFixed(2)),
      Muscle_Strength_Loss: Number((Math.max(0, day * 0.045 + seededNoise(day, 3) * 0.5)).toFixed(1)),
      Heart_Rate: Number(([23, 49].includes(day) ? 109 + seededNoise(day, 4) * 2 : poorSleep || dehydrated ? 98 + seededNoise(day, 4) * 3 : 71 + seededNoise(day, 4) * 7).toFixed(0)),
      Systolic_BP: Number((poorSleep ? 132 : 116 + seededNoise(day, 5) * 6).toFixed(0)),
      Diastolic_BP: Number((poorSleep ? 86 : 74 + seededNoise(day, 6) * 5).toFixed(0)),
      SpO2: Number((97.5 + seededNoise(day, 7) * 1.2).toFixed(1)),
      Radiation_Dose_Daily: dailyDose,
      Radiation_Dose_Cumulative: cumulativeDose,
      Intraocular_Pressure: Number((15.5 + day * 0.004 + seededNoise(day, 8) * 1.2).toFixed(1)),
      Body_Temperature: Number((poorSleep || dehydrated ? 37.3 : 36.7 + seededNoise(day, 9) * 0.22).toFixed(1)),
      Urine_Specific_Gravity: Number(((day === 39 ? 1.031 : 1.014 + seededNoise(day, 10) * 0.004)).toFixed(3)),
      CO2_Partial_Pressure: Number((2.4 + seededNoise(day, 11) * 0.35).toFixed(1)),
      Fasting_Glucose: Number((0.88 + seededNoise(day, 12) * 0.08).toFixed(2))
    };
    if (day !== DEMO_HISTORY_DAYS - 1) {
      if (day % 12 === 4) delete body.CO2_Partial_Pressure;
      if (day % 15 === 8) delete body.Intraocular_Pressure;
    }
    validateBodyMeasureValues(body);
    const todayHour = Math.min(now.getUTCHours(), 8);
    BODY_MEASURE_FIELDS.forEach((field, channel) => {
      const value = body[field.key];
      if (value === undefined) return;
      const timestamp = day === DEMO_HISTORY_DAYS - 1 ? Math.min(nowMs, dateEpoch + todayHour * 60 * 60 * 1000) - channel * 1000 : dateEpoch + (6 + (channel % 4)) * 60 * 60 * 1000;
      measurements.push({
        id: `demo-measure-${CURRENT_USER_ID}-j${String(day).padStart(2, '0')}-${field.metric}`,
        astronautId: CURRENT_USER_ID, metric: field.metric, value, unit: unitByMetric.get(field.metric)!, timestamp, source: 'simulated', demo: true
      });
    });
    const cognitiveValues = [
      { metric: 'reactionTime' as const, value: Number((poorSleep ? 332 : 245 + seededNoise(day, 13) * 22).toFixed(0)), unit: 'ms', skip: day !== DEMO_HISTORY_DAYS - 1 && day % 12 === 4 },
      { metric: 'orientationAccuracy' as const, value: Number((poorSleep ? 82 : 95 + seededNoise(day, 14) * 3).toFixed(0)), unit: '%', skip: day !== DEMO_HISTORY_DAYS - 1 && day % 10 === 7 }
    ];
    cognitiveValues.forEach(({ metric, value, unit, skip }, index) => {
      if (skip) return;
      const timestamp = day === DEMO_HISTORY_DAYS - 1 ? Math.min(nowMs, dateEpoch + todayHour * 60 * 60 * 1000) - (BODY_MEASURE_FIELDS.length + index) * 1000 : dateEpoch + 12 * 60 * 60 * 1000 + index * 1000;
      measurements.push({ id: `demo-measure-${CURRENT_USER_ID}-j${String(day).padStart(2, '0')}-${metric}`, astronautId: CURRENT_USER_ID, metric, value, unit, timestamp, source: 'simulated', demo: true });
    });

    activityEvents.push({ id: `demo-activity-${CURRENT_USER_ID}-j${String(day).padStart(2, '0')}`, astronautId: CURRENT_USER_ID, date, type: 'measurement', demo: true });

    if (day % 3 === 0 || day === DEMO_HISTORY_DAYS - 1) {
      const previousNight = day > 0 ? sleepLogs[day - 1] : sleep;
      const strained = previousNight.hours < 6 || dehydrated;
      const communicationHours = day >= 35 && day <= 37 ? 0.1 : 1.5 + (day % 4) * 0.35;
      const answers = strained ? [2, 2, 2, 2, 2] : [4, 4, 4, 4, 4];
      const score = calculatePsychScore(answers);
      const mental = createMentalStateData({
        Stress_level: strained ? 'High' : day % 5 === 0 ? 'Medium' : 'Low',
        Happiness: strained ? 4 : communicationHours < 0.2 ? 6 : 8 + (day % 3),
        Mood_Score: strained ? 'negative' : communicationHours < 0.2 ? 'neutral' : 'positive',
        'Workload Perception': strained ? 'impossible' : 'possible',
        Time_Perception: strained ? 'Fast' : 'Normal', Food: day % 7 === 0 ? 'Neutral' : 'Good',
        Communication_with_Earth_mins: communicationHours
        }, sleep.calculatedQuality!);
      validate_mental_state(mental, { sleepQualityCalculated: true });
      psychAssessments.push({ id: `demo-psych-${CURRENT_USER_ID}-j${String(day).padStart(2, '0')}`, astronautId: CURRENT_USER_ID, date, answers, score, status: evaluatePsychStatus(score).status, mentalStateData: mental, demo: true });
    }
  }

  const legacyMeasurements = oldMeasurements.filter((row) => knownDemoIds.has(row.astronautId));
  const legacySleeps = oldSleeps.filter((row) => knownDemoIds.has(row.astronautId));
  const legacyAssessments = oldAssessments.filter((row) => knownDemoIds.has(row.astronautId));
  const legacyEvents = oldEvents.filter((row) => knownDemoIds.has(row.astronautId));
  await db.transaction('rw', [db.users, db.astronauts, db.measurements, db.sleepLogs, db.psychAssessments, db.activityEvents], async () => {
    // Legacy fictional accounts were generated by the previous known AST-0001…AST-0010 seed.
    await db.users.bulkDelete([...legacyUserIds]);
    await db.astronauts.bulkDelete([...legacyProfileIds]);
    await deleteByIds(db.measurements, legacyMeasurements, (row) => row.demo === true || (legacyProfileIds.has(row.astronautId) && (row.source === 'simulated' || row.id.startsWith('m-AST-'))));
    await deleteByIds(db.sleepLogs, legacySleeps, (row) => row.demo === true || (legacyProfileIds.has(row.astronautId) && row.id.startsWith('sleep-AST-') && row.calculatedQuality !== undefined));
    await deleteByIds(db.psychAssessments, legacyAssessments, (row) => row.demo === true || (legacyProfileIds.has(row.astronautId) && row.id.startsWith('psych-AST-')));
    await deleteByIds(db.activityEvents, legacyEvents, (row) => row.demo === true || (legacyProfileIds.has(row.astronautId) && row.id.startsWith('act-AST-')));

    // Refresh this demo profile only. Manual records are outside these marker queries.
    await db.measurements.where('astronautId').equals(CURRENT_USER_ID).filter((row) => row.demo === true).delete();
    await db.sleepLogs.where('astronautId').equals(CURRENT_USER_ID).filter((row) => row.demo === true).delete();
    await db.psychAssessments.where('astronautId').equals(CURRENT_USER_ID).filter((row) => row.demo === true).delete();
    await db.activityEvents.where('astronautId').equals(CURRENT_USER_ID).filter((row) => row.demo === true).delete();
    await db.astronauts.put(profile);
    await db.users.put(profile);
    await db.measurements.bulkPut(measurements);
    await db.sleepLogs.bulkPut(sleepLogs);
    await db.psychAssessments.bulkPut(psychAssessments);
    await db.activityEvents.bulkPut(activityEvents);
  });

  return { astronauts: 1, measurements: measurements.length, sleepLogs: sleepLogs.length, assessments: psychAssessments.length, activityEvents: activityEvents.length, startDate, endDate };
}

export const seedLambdaData = seedFictionalCrew;
