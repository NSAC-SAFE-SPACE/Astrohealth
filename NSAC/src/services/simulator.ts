import { db } from '../db';
import type {
  Astronaut,
  Measurement,
  SleepLog,
  BoneDensityRecord,
  PsychAssessment,
  ActivityEvent,
  MissionEnvironment
} from '../types';
import { DEFAULT_AVATAR_SILHOUETTE, ENVIRONMENT_COMM_DELAYS } from './profile';

export type DemoScenario = 'healthy' | 'fatigue' | 'isolation' | 'bone_loss' | 'radiation_spike';

export const DEFAULT_ASTRONAUT: Astronaut = {
  id: 'astro-01',
  name: 'Thomas',
  age: 44,
  sex: 'male',
  weightKg: 78,
  mission: 'station',
  photo: DEFAULT_AVATAR_SILHOUETTE,
  careerRadiationDose: 145, // mSv from prior shuttle / ISS flights
  bloodGlucoseUnit: 'mg/dL',
  commDelayMinutes: 0,
  baselineBoneDensity: {
    total_hip: 1.05,
    lumbar_spine: 1.18,
    femoral_neck: 0.98,
    heel: 0.62
  }
};

/**
 * Generates realistic longitudinal telemetry across 140 days for demonstration.
 * NOTE: The simulator strictly adheres to the physiological coupling hypotheses of the engine:
 * its purpose is to evaluate internal consistency and user interface responsiveness,
 * not to claim clinical ground-truth.
 */
export async function seedDemoData(scenario: DemoScenario = 'healthy') {
  await db.measurements.clear();
  await db.sleepLogs.clear();
  await db.boneDensityRecords.clear();
  await db.psychAssessments.clear();
  await db.activityEvents.clear();
  await db.astronauts.clear();

  const astro: Astronaut = {
    ...DEFAULT_ASTRONAUT,
    commDelayMinutes: ENVIRONMENT_COMM_DELAYS[DEFAULT_ASTRONAUT.mission].nominalMin
  };
  await db.astronauts.put(astro);

  const now = new Date();
  const measurements: Measurement[] = [];
  const sleepLogs: SleepLog[] = [];
  const activityEvents: ActivityEvent[] = [];
  const psychAssessments: PsychAssessment[] = [];

  // Generate 140 days of history (20 weeks x 7 days)
  for (let d = 139; d >= 0; d--) {
    const dateObj = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timestamp = dateObj.getTime();

    // Activity tracking: 85% days have measurement (state 2), 10% login (state 1), 5% none (state 0)
    const rand = Math.random();
    if (rand > 0.15 || d < 7) {
      activityEvents.push({
        id: `act-m-${d}`,
        astronautId: astro.id,
        date: dateStr,
        type: 'measurement'
      });
    } else if (rand > 0.05) {
      activityEvents.push({
        id: `act-v-${d}`,
        astronautId: astro.id,
        date: dateStr,
        type: 'view'
      });
    }

    // Baseline physiological signals with subtle noise and oscillatory trends
    let hr = 68 + Math.sin(d / 10) * 3 + (Math.random() - 0.5) * 4;
    let sys = 118 + Math.cos(d / 12) * 3 + (Math.random() - 0.5) * 4;
    let dia = 76 + (Math.random() - 0.5) * 3;
    let temp = 36.65 + (Math.random() - 0.5) * 0.25;
    let glucoseFasting = 84 + (Math.random() - 0.5) * 6;
    let sleepHours = 7.4 + (Math.random() - 0.5) * 1.0;
    let sleepAwakenings = Math.random() > 0.75 ? 1 : 0;
    let restfulness = 4;
    let doseCumulated = 25 + (140 - d) * 0.62;

    // Apply scenario-specific drifts in recent window (last 14 days, d < 14)
    if (d < 14) {
      if (scenario === 'fatigue') {
        // Chronic sleep deprivation: 4h sleep, night awakenings, elevated morning sympathetic tone
        sleepHours = d < 4 ? 3.8 : 4.6;
        sleepAwakenings = 3;
        restfulness = 2;
        hr += 11;
        sys += 9;
        dia += 5;
        temp += 0.3; // mild inflammatory elevation
        glucoseFasting += 14; // sleep-deprived insulin resistance
      } else if (scenario === 'isolation') {
        // Confinement & psychological strain: drops sleep quality, elevates stress markers
        restfulness = 2;
        hr += 8;
        sys += 7;
      } else if (scenario === 'radiation_spike' && d < 2) {
        // Solar energetic particle event
        doseCumulated += 18;
      }
    }

    // Heart rate measurement
    measurements.push({
      id: `m-hr-${d}`,
      astronautId: astro.id,
      metric: 'heartRate',
      value: Math.round(hr),
      unit: 'bpm',
      timestamp: timestamp + 8 * 3600 * 1000,
      source: 'simulated'
    });

    // Systolic blood pressure
    measurements.push({
      id: `m-sys-${d}`,
      astronautId: astro.id,
      metric: 'bpSys',
      value: Math.round(sys),
      unit: 'mmHg',
      timestamp: timestamp + 8 * 3600 * 1000,
      source: 'simulated'
    });

    // Diastolic blood pressure
    measurements.push({
      id: `m-dia-${d}`,
      astronautId: astro.id,
      metric: 'bpDia',
      value: Math.round(dia),
      unit: 'mmHg',
      timestamp: timestamp + 8 * 3600 * 1000,
      source: 'simulated'
    });

    // Body temperature
    measurements.push({
      id: `m-temp-${d}`,
      astronautId: astro.id,
      metric: 'temperature',
      value: Math.round(temp * 10) / 10,
      unit: '°C',
      timestamp: timestamp + 9 * 3600 * 1000,
      source: 'simulated'
    });

    // Fasting glucose
    measurements.push({
      id: `m-glu-${d}`,
      astronautId: astro.id,
      metric: 'glucose',
      value: Math.round(glucoseFasting),
      unit: 'mg/dL',
      timestamp: timestamp + 7 * 3600 * 1000,
      source: 'simulated',
      context: 'fasting'
    });

    // Cumulative radiation dose
    measurements.push({
      id: `m-rad-${d}`,
      astronautId: astro.id,
      metric: 'radiationDose',
      value: Math.round(doseCumulated * 10) / 10,
      unit: 'mSv',
      timestamp: timestamp + 20 * 3600 * 1000,
      source: 'simulated'
    });

    // Nightly sleep log
    sleepLogs.push({
      id: `sleep-${d}`,
      astronautId: astro.id,
      date: dateStr,
      hours: Math.round(sleepHours * 10) / 10,
      bedtime: '23:15',
      latencyBucket: sleepHours < 5 ? '30-60' : '<15',
      awakenings: sleepAwakenings,
      restfulness
    });

    // Weekly psychological WHO-5 assessment (every 7 days)
    if (d % 7 === 0) {
      let answers = [4, 4, 4, 4, 4];
      if (scenario === 'isolation' && d < 21) {
        answers = [1, 1, 2, 1, 1]; // Low score 24 (contact_flight_surgeon)
      } else if (scenario === 'fatigue' && d < 14) {
        answers = [2, 3, 2, 1, 3]; // Action level
      }
      const score = answers.reduce((s, a) => s + a, 0) * 4;
      psychAssessments.push({
        id: `psych-${d}`,
        astronautId: astro.id,
        date: dateStr,
        answers,
        score,
        status: score >= 68 ? 'normal' : score >= 50 ? 'watch' : score >= 29 ? 'action' : 'contact_flight_surgeon'
      });
    }
  }

  // Bone density baseline (pre-mission day 0) + current measurement at day 130
  const boneRecords: BoneDensityRecord[] = [
    {
      id: 'bone-base-hip',
      astronautId: astro.id,
      date: new Date(now.getTime() - 140 * 86400000).toISOString().split('T')[0],
      site: 'total_hip',
      valueGcm2: 1.05,
      method: 'dxa',
      isBaseline: true
    },
    {
      id: 'bone-base-spine',
      astronautId: astro.id,
      date: new Date(now.getTime() - 140 * 86400000).toISOString().split('T')[0],
      site: 'lumbar_spine',
      valueGcm2: 1.18,
      method: 'dxa',
      isBaseline: true
    },
    {
      id: 'bone-curr-hip',
      astronautId: astro.id,
      date: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
      site: 'total_hip',
      valueGcm2: scenario === 'bone_loss' ? 0.96 : 1.03, // Accelerated loss vs mitigated
      method: 'dxa',
      isBaseline: false
    },
    {
      id: 'bone-curr-spine',
      astronautId: astro.id,
      date: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
      site: 'lumbar_spine',
      valueGcm2: scenario === 'bone_loss' ? 1.08 : 1.16,
      method: 'dxa',
      isBaseline: false
    }
  ];

  await db.measurements.bulkPut(measurements);
  await db.sleepLogs.bulkPut(sleepLogs);
  await db.activityEvents.bulkPut(activityEvents);
  await db.psychAssessments.bulkPut(psychAssessments);
  await db.boneDensityRecords.bulkPut(boneRecords);
}

/**
 * Simulates advancing time by 24 hours (1 mission day).
 * Appends new measurements, registers today's activity, and maintains trajectory continuity.
 */
export async function advanceTime24h(
  currentMissionDay: number,
  scenario: DemoScenario = 'healthy'
): Promise<{ nextMissionDay: number; newDateStr: string }> {
  const nextMissionDay = currentMissionDay + 1;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.getTime();

  // 1. Record measurement activity for the new day
  const actId = `act-adv-${nextMissionDay}-${Date.now()}`;
  await db.activityEvents.put({
    id: actId,
    astronautId: 'astro-01',
    date: dateStr,
    type: 'measurement'
  });

  // 2. Generate new day's readings according to the scenario
  let hr = 70 + (Math.random() - 0.5) * 4;
  let sys = 118 + (Math.random() - 0.5) * 4;
  let dia = 76 + (Math.random() - 0.5) * 3;
  let temp = 36.7 + (Math.random() - 0.5) * 0.2;
  let glucose = 85 + (Math.random() - 0.5) * 6;
  let sleepHours = 7.5;

  if (scenario === 'fatigue') {
    sleepHours = 4.2;
    hr += 10;
    sys += 8;
    dia += 4;
    temp += 0.3;
    glucose += 12;
  } else if (scenario === 'isolation') {
    hr += 7;
    sys += 6;
  }

  const newMeasurements: Measurement[] = [
    {
      id: `adv-hr-${nextMissionDay}`,
      astronautId: 'astro-01',
      metric: 'heartRate',
      value: Math.round(hr),
      unit: 'bpm',
      timestamp: timestamp + 8 * 3600000,
      source: 'simulated'
    },
    {
      id: `adv-sys-${nextMissionDay}`,
      astronautId: 'astro-01',
      metric: 'bpSys',
      value: Math.round(sys),
      unit: 'mmHg',
      timestamp: timestamp + 8 * 3600000,
      source: 'simulated'
    },
    {
      id: `adv-dia-${nextMissionDay}`,
      astronautId: 'astro-01',
      metric: 'bpDia',
      value: Math.round(dia),
      unit: 'mmHg',
      timestamp: timestamp + 8 * 3600000,
      source: 'simulated'
    },
    {
      id: `adv-temp-${nextMissionDay}`,
      astronautId: 'astro-01',
      metric: 'temperature',
      value: Math.round(temp * 10) / 10,
      unit: '°C',
      timestamp: timestamp + 9 * 3600000,
      source: 'simulated'
    },
    {
      id: `adv-glu-${nextMissionDay}`,
      astronautId: 'astro-01',
      metric: 'glucose',
      value: Math.round(glucose),
      unit: 'mg/dL',
      timestamp: timestamp + 7 * 3600000,
      source: 'simulated',
      context: 'fasting'
    }
  ];

  await db.measurements.bulkPut(newMeasurements);

  await db.sleepLogs.put({
    id: `adv-sleep-${nextMissionDay}`,
    astronautId: 'astro-01',
    date: dateStr,
    hours: Math.round(sleepHours * 10) / 10,
    bedtime: '23:30',
    latencyBucket: sleepHours < 5 ? '30-60' : '<15',
    awakenings: sleepHours < 5 ? 2 : 0,
    restfulness: sleepHours < 5 ? 2 : 4
  });

  return { nextMissionDay, newDateStr: dateStr };
}
