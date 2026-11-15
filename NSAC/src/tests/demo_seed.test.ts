import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeDb, records } = vi.hoisted(() => {
  const records: Record<string, Map<string, any>> = {};
  const makeTable = (name: string, primaryKey = 'id') => {
    const rows = new Map<string, any>();
    records[name] = rows;
    const table: any = {
      put: vi.fn(async (row: any) => { rows.set(row[primaryKey], row); }),
      bulkPut: vi.fn(async (values: any[]) => { values.forEach((row) => rows.set(row[primaryKey], row)); }),
      bulkDelete: vi.fn(async (keys: string[]) => { keys.forEach((key) => rows.delete(key)); }),
      toArray: vi.fn(async () => [...rows.values()]),
      get: vi.fn(async (key: string) => rows.get(key)),
      where: vi.fn((field: string) => ({
        anyOf: (keys: string[]) => ({ delete: async () => { for (const [key, row] of rows) if (keys.includes(row[field])) rows.delete(key); } }),
        equals: (value: unknown) => {
          const query: any = {
            filter: (predicate: (row: any) => boolean) => ({
              toArray: async () => [...rows.values()].filter((row) => row[field] === value && predicate(row)),
              delete: async () => { for (const [key, row] of rows) if (row[field] === value && predicate(row)) rows.delete(key); }
            }),
            toArray: async () => [...rows.values()].filter((row) => row[field] === value),
            delete: async () => { for (const [key, row] of rows) if (row[field] === value) rows.delete(key); }
          };
          return query;
        }
      }))
    };
    return table;
  };
  const fakeDb: any = {
    users: makeTable('users', 'matricule'), astronauts: makeTable('astronauts'), measurements: makeTable('measurements'),
    sleepLogs: makeTable('sleepLogs'), psychAssessments: makeTable('psychAssessments'), activityEvents: makeTable('activityEvents'),
    boneDensityRecords: makeTable('boneDensityRecords'), labResults: makeTable('labResults'), reports: makeTable('reports'),
    transaction: async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => callback()
  };
  return { fakeDb, records };
});

vi.mock('../db', () => ({ db: fakeDb }));

import { BODY_MEASURE_FIELDS } from '../engine/config/bodyMeasures';
import { getBodyMeasureStatus } from '../engine/config/bodyMeasures';
import { computePsychSleepQuality } from '../engine/scores/sleep';
import { validate_mental_state } from '../features/mental/mentalState';
import { CURRENT_USER_ID } from '../config/currentUser';
import { DEMO_HISTORY_DAYS, seedFictionalCrew, shouldAutoSeedFictionalCrew } from '../services/simulator';

const fixedNow = new Date('2026-11-15T12:00:00.000Z');

describe('jeu fictif à un seul profil', () => {
  beforeEach(() => { Object.values(records).forEach((table) => table.clear()); });

  it('génère 60 jours cohérents pour un seul individu, datés jusqu’à aujourd’hui', async () => {
    const summary = await seedFictionalCrew({ now: fixedNow });
    const person = records.astronauts.get(CURRENT_USER_ID);
    const todayMeasures = [...records.measurements.values()].filter((row) => row.astronautId === CURRENT_USER_ID && BODY_MEASURE_FIELDS.some((field) => field.metric === row.metric) && new Date(row.timestamp).toISOString().slice(0, 10) === summary.endDate);
    const cognitiveMeasures = [...records.measurements.values()].filter((row) => row.astronautId === CURRENT_USER_ID && ['reactionTime', 'orientationAccuracy'].includes(row.metric) && new Date(row.timestamp).toISOString().slice(0, 10) === summary.endDate);
    const todayPsych = [...records.psychAssessments.values()].find((row) => row.astronautId === CURRENT_USER_ID && row.date === summary.endDate);
    const todaySleep = [...records.sleepLogs.values()].find((row) => row.astronautId === CURRENT_USER_ID && row.date === summary.endDate);

    expect(summary.astronauts).toBe(1);
    expect(summary.measurements).toBe(880);
    expect(summary.sleepLogs).toBe(DEMO_HISTORY_DAYS);
    expect(summary.assessments).toBe(21);
    expect(summary.activityEvents).toBe(DEMO_HISTORY_DAYS);
    expect(summary.endDate).toBe(fixedNow.toISOString().slice(0, 10));
    expect(new Date(summary.endDate).getTime() - new Date(summary.startDate).getTime()).toBe((DEMO_HISTORY_DAYS - 1) * 86400000);
    expect(records.users.size).toBe(1);
    expect(person.demo).toBe(true);
    expect(person.missionName).toBe('Aurora-7');
    expect(person.missionDay).toBe(60);
    expect(todayMeasures).toHaveLength(13);
    expect(new Set(todayMeasures.map((row) => row.metric)).size).toBe(BODY_MEASURE_FIELDS.length);
    expect(todayMeasures.every((row) => row.demo === true)).toBe(true);
    expect(cognitiveMeasures.map((row) => row.metric).sort()).toEqual(['orientationAccuracy', 'reactionTime']);
    expect(todaySleep.demo).toBe(true);
    expect(todayPsych.demo).toBe(true);
    expect(validate_mental_state(todayPsych.mentalStateData, { sleepQualityCalculated: true })).toBe(true);
    expect(todayPsych.mentalStateData.Sleep_Quality).toBe(computePsychSleepQuality(todaySleep, [...records.sleepLogs.values()].filter((log) => log.date < todaySleep.date).slice(-7)));
    const sortedSleep = [...records.sleepLogs.values()].sort((a, b) => a.date.localeCompare(b.date));
    sortedSleep.forEach((log, index) => {
      const expected = computePsychSleepQuality(log, sortedSleep.slice(Math.max(0, index - 7), index));
      expect(log.calculatedQuality).toBe(expected);
      expect(log.calculatedQuality).toBeGreaterThanOrEqual(0);
      expect(log.calculatedQuality).toBeLessThanOrEqual(62.53);
    });
    [...records.psychAssessments.values()].forEach((assessment) => {
      expect(validate_mental_state(assessment.mentalStateData, { sleepQualityCalculated: true })).toBe(true);
    });
  });

  it('maintient le cumul de dose strictement croissant et reste sous le seuil d’alerte', async () => {
    await seedFictionalCrew({ now: fixedNow });
    const cumulative = [...records.measurements.values()]
      .filter((row) => row.metric === 'radiationDose')
      .sort((a, b) => a.timestamp - b.timestamp);
    expect(cumulative.length).toBeGreaterThan(50);
    expect(cumulative.every((row, index) => index === 0 || row.value > cumulative[index - 1].value)).toBe(true);
    expect(cumulative.at(-1).value).toBeLessThan(100);
    const daily = [...records.measurements.values()].filter((row) => row.metric === 'radiationDoseDaily').sort((a, b) => a.timestamp - b.timestamp);
    expect(daily).toHaveLength(DEMO_HISTORY_DAYS);
    expect(cumulative.at(-1).value).toBeCloseTo(daily.reduce((sum, row) => sum + row.value, 0), 2);
    const pointsByMetric = new Map<string, number>();
    for (const row of records.measurements.values()) pointsByMetric.set(row.metric, (pointsByMetric.get(row.metric) ?? 0) + 1);
    expect(pointsByMetric.get('co2PartialPressure')).toBe(55);
    expect(pointsByMetric.get('intraocularPressure')).toBe(56);
    expect(pointsByMetric.get('reactionTime')).toBe(55);
    expect(pointsByMetric.get('orientationAccuracy')).toBe(54);
    for (const field of BODY_MEASURE_FIELDS.filter((field) => !['co2PartialPressure', 'intraocularPressure'].includes(field.metric))) {
      expect(pointsByMetric.get(field.metric)).toBe(60);
    }
  });

  it('présente les trois statuts corporels dans les mesures historiques', async () => {
    await seedFictionalCrew({ now: fixedNow });
    const statuses = new Set<string>();
    for (const field of BODY_MEASURE_FIELDS) {
      for (const row of records.measurements.values()) {
        if (row.metric === field.metric) statuses.add(getBodyMeasureStatus(field, row.value));
      }
    }
    expect(statuses).toEqual(new Set(['normal', 'watch', 'action']));
  });

  it('est idempotent, rafraîchit les dates relatives, et conserve les saisies manuelles', async () => {
    const first = await seedFictionalCrew({ now: fixedNow });
    await fakeDb.measurements.put({ id: 'manual-reading', astronautId: CURRENT_USER_ID, metric: 'heartRate', value: 75, unit: 'bpm', timestamp: fixedNow.getTime(), source: 'manual' });
    await fakeDb.sleepLogs.put({ id: 'manual-sleep', astronautId: CURRENT_USER_ID, date: '2026-11-15', hours: 7, bedtime: '22:00', latencyBucket: '<15', awakenings: 0, restfulness: 4 });
    await fakeDb.psychAssessments.put({ id: 'manual-psych', astronautId: CURRENT_USER_ID, date: '2026-11-15', answers: [], score: 80, status: 'normal' });
    const second = await seedFictionalCrew({ now: new Date(fixedNow.getTime() + 86400000) });
    expect(second.endDate).toBe('2026-11-16');
    expect(second.startDate).not.toBe(first.startDate);
    expect(records.measurements.has('manual-reading')).toBe(true);
    expect(records.sleepLogs.has('manual-sleep')).toBe(true);
    expect(records.psychAssessments.has('manual-psych')).toBe(true);
    expect([...records.measurements.values()].filter((row) => row.demo === true).length).toBe(first.measurements);
    expect(records.users.size).toBe(1);
  });

  it('rafraîchit uniquement quand activé, absent ou périmé', () => {
    expect(shouldAutoSeedFictionalCrew(false, false, undefined)).toBe(false);
    expect(shouldAutoSeedFictionalCrew(true, false, undefined)).toBe(true);
    expect(shouldAutoSeedFictionalCrew(true, true, fixedNow.getTime(), fixedNow.getTime() + 12 * 3600000)).toBe(false);
    expect(shouldAutoSeedFictionalCrew(true, true, fixedNow.getTime(), fixedNow.getTime() + 25 * 3600000)).toBe(true);
  });

  it('retire les anciens comptes issus du seed tout en gardant les entrées non générées', async () => {
    await fakeDb.users.put({ id: 'REAL-1', matricule: 'REAL-1' });
    await fakeDb.measurements.put({ id: 'manual-real', astronautId: 'REAL-1', source: 'manual' });
    await fakeDb.users.put({ id: 'AST-0002', matricule: 'AST-0002', name: 'Idriss Solmaren' });
    await fakeDb.astronauts.put({ id: 'AST-0002', matricule: 'AST-0002', name: 'Idriss Solmaren' });
    await fakeDb.measurements.put({ id: 'm-AST-0002-legacy', astronautId: 'AST-0002', source: 'simulated' });
    await seedFictionalCrew({ now: fixedNow });
    expect(records.users.has('AST-0002')).toBe(false);
    expect(records.astronauts.has('AST-0002')).toBe(false);
    expect(records.measurements.has('m-AST-0002-legacy')).toBe(false);
    expect(records.users.has('REAL-1')).toBe(true);
    expect(records.measurements.has('manual-real')).toBe(true);
  });

  it('remplace l’ancien compte AST-0001 connu du seed sans conserver ses mesures simulées', async () => {
    await fakeDb.astronauts.put({ id: CURRENT_USER_ID, matricule: CURRENT_USER_ID, name: 'Maëlys Virelande', demo: false });
    await fakeDb.users.put({ id: CURRENT_USER_ID, matricule: CURRENT_USER_ID, name: 'Maëlys Virelande' });
    await fakeDb.measurements.put({ id: 'm-AST-0001-legacy', astronautId: CURRENT_USER_ID, source: 'simulated' });
    const summary = await seedFictionalCrew({ now: fixedNow });
    expect(records.astronauts.get(CURRENT_USER_ID).name).toBe('Ariane Solenne');
    expect(records.measurements.has('m-AST-0001-legacy')).toBe(false);
    expect(summary.astronauts).toBe(1);
    expect(records.users.size).toBe(1);
  });
});
