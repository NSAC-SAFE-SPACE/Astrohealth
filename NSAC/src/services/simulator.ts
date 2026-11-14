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

export const DEFAULT_ASTRONAUT: Astronaut = {
  id: 'astro-01',
  name: 'Thomas',
  age: 44,
  sex: 'male',
  weightKg: 78,
  mission: 'station',
  careerRadiationDose: 145, // mSv from prior shuttle / ISS flights
  bloodGlucoseUnit: 'mg/dL',
  commDelayMinutes: 5,
  baselineBoneDensity: {
    total_hip: 1.05,
    lumbar_spine: 1.18,
    femoral_neck: 0.98,
    heel: 0.62
  }
};

export async function seedDemoData(scenario: 'healthy' | 'fatigue' | 'isolation' | 'bone_loss' | 'radiation_spike' = 'healthy') {
  await db.measurements.clear();
  await db.sleepLogs.clear();
  await db.boneDensityRecords.clear();
  await db.psychAssessments.clear();
  await db.activityEvents.clear();
  await db.astronauts.clear();

  const astro = { ...DEFAULT_ASTRONAUT };
  await db.astronauts.put(astro);

  const now = new Date();
  const measurements: Measurement[] = [];
  const sleepLogs: SleepLog[] = [];
  const activityEvents: ActivityEvent[] = [];
  const psychAssessments: PsychAssessment[] = [];

  // Generate 140 days of history
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

    // Baseline vitals with subtle noise
    let hr = 68 + Math.sin(d / 10) * 4 + (Math.random() - 0.5) * 5;
    let sys = 118 + Math.cos(d / 12) * 4 + (Math.random() - 0.5) * 4;
    let dia = 76 + (Math.random() - 0.5) * 3;
    let temp = 36.6 + (Math.random() - 0.5) * 0.3;
    let glucoseFasting = 84 + (Math.random() - 0.5) * 8;
    let sleepHours = 7.5 + (Math.random() - 0.5) * 1.2;
    let sleepAwakenings = Math.random() > 0.7 ? 1 : 0;
    let restfulness = 4;
    let doseCumulated = 25 + (140 - d) * 0.62;

    // Apply specific scenario modulations on recent days (d < 14)
    if (d < 14) {
      if (scenario === 'fatigue') {
        sleepHours = d < 4 ? 3.8 : 4.8;
        sleepAwakenings = 3;
        restfulness = 2;
        hr += 10;
        sys += 8;
      } else if (scenario === 'isolation') {
        restfulness = 2;
      } else if (scenario === 'bone_loss') {
        // Handled in bone records below
      } else if (scenario === 'radiation_spike' && d < 2) {
        // Solar flare simulation
        doseCumulated += 15;
      }
    }

    // Measurements every day or two
    measurements.push({
      id: `m-hr-${d}`,
      astronautId: astro.id,
      metric: 'heartRate',
      value: Math.round(hr),
      unit: 'bpm',
      timestamp: timestamp + 8 * 3600 * 1000,
      source: 'simulated'
    });

    measurements.push({
      id: `m-sys-${d}`,
      astronautId: astro.id,
      metric: 'bpSys',
      value: Math.round(sys),
      unit: 'mmHg',
      timestamp: timestamp + 8 * 3600 * 1000,
      source: 'simulated'
    });

    measurements.push({
      id: `m-dia-${d}`,
      astronautId: astro.id,
      metric: 'bpDia',
      value: Math.round(dia),
      unit: 'mmHg',
      timestamp: timestamp + 8 * 3600 * 1000,
      source: 'simulated'
    });

    measurements.push({
      id: `m-temp-${d}`,
      astronautId: astro.id,
      metric: 'temperature',
      value: Math.round(temp * 10) / 10,
      unit: '°C',
      timestamp: timestamp + 9 * 3600 * 1000,
      source: 'simulated'
    });

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

    measurements.push({
      id: `m-rad-${d}`,
      astronautId: astro.id,
      metric: 'radiationDose',
      value: Math.round(doseCumulated * 10) / 10,
      unit: 'mSv',
      timestamp: timestamp + 20 * 3600 * 1000,
      source: 'simulated'
    });

    // Sleep log
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

    // Weekly psychological WHO-5 assessment
    if (d % 7 === 0) {
      let answers = [4, 4, 4, 4, 4];
      if (scenario === 'isolation' && d < 21) {
        answers = [1, 1, 2, 1, 1]; // low score < 28
      } else if (scenario === 'fatigue' && d < 14) {
        answers = [2, 3, 2, 1, 3];
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

  // Bone density baseline (pre-mission day 0) + current measurement at day 120
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
      date: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
      site: 'total_hip',
      valueGcm2: scenario === 'bone_loss' ? 0.94 : 1.02, // severe loss vs mild loss
      method: 'dxa',
      isBaseline: false
    },
    {
      id: 'bone-curr-spine',
      astronautId: astro.id,
      date: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
      site: 'lumbar_spine',
      valueGcm2: scenario === 'bone_loss' ? 1.06 : 1.15,
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
