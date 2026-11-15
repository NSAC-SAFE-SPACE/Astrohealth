import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeDb, records } = vi.hoisted(() => {
  const records: Record<string, Map<string, any>> = {};
  const makeTable = (name: string, primaryKey = 'id') => {
    const rows = new Map<string, any>();
    records[name] = rows;
    return {
      put: vi.fn(async (row: any) => { rows.set(row[primaryKey], row); }),
      bulkPut: vi.fn(async (values: any[]) => { values.forEach((row) => rows.set(row[primaryKey], row)); }),
      bulkDelete: vi.fn(async (keys: string[]) => { keys.forEach((key) => rows.delete(key)); }),
      where: vi.fn((field: string) => ({
        anyOf: (keys: string[]) => ({
          delete: async () => {
            for (const [key, row] of rows) if (keys.includes(row[field])) rows.delete(key);
          }
        })
      }))
    };
  };
  const fakeDb: any = {
    users: makeTable('users', 'matricule'), astronauts: makeTable('astronauts'),
    measurements: makeTable('measurements'), sleepLogs: makeTable('sleepLogs'),
    psychAssessments: makeTable('psychAssessments'), activityEvents: makeTable('activityEvents'),
    boneDensityRecords: makeTable('boneDensityRecords'), labResults: makeTable('labResults'), reports: makeTable('reports'),
    transaction: async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => callback()
  };
  return { fakeDb, records };
});

vi.mock('../db', () => ({ db: fakeDb }));

import { DEMO_ACCOUNT_IDS, seedFictionalCrew, shouldAutoSeedFictionalCrew } from '../services/simulator';

describe('fictional demo seeding', () => {
  beforeEach(() => { Object.values(records).forEach((table) => table.clear()); });

  it('seeds the demo accounts and their records on an enabled empty database', async () => {
    const existingDemoCount = records.users.size;
    if (shouldAutoSeedFictionalCrew(true, existingDemoCount)) await seedFictionalCrew();

    expect(records.users.size).toBe(10);
    expect(records.astronauts.size).toBe(10);
    expect(records.measurements.size).toBeGreaterThan(0);
    expect(records.sleepLogs.size).toBeGreaterThan(0);
    expect(records.psychAssessments.size).toBeGreaterThan(0);
    expect(records.activityEvents.size).toBeGreaterThan(0);
    expect([...records.users.keys()].sort()).toEqual([...DEMO_ACCOUNT_IDS].sort());
  });

  it('does not auto-seed when disabled or when any demo account already exists', () => {
    expect(shouldAutoSeedFictionalCrew(false, 0)).toBe(false);
    expect(shouldAutoSeedFictionalCrew(true, 1)).toBe(false);
    expect(shouldAutoSeedFictionalCrew(true, 0)).toBe(true);
  });

  it('reset removes only the known demo users and their records', async () => {
    await fakeDb.users.put({ id: 'REAL-1', matricule: 'REAL-1' });
    await fakeDb.measurements.put({ id: 'real-reading', astronautId: 'REAL-1' });
    await seedFictionalCrew();
    await seedFictionalCrew({ reset: true });

    expect(records.users.has('REAL-1')).toBe(true);
    expect(records.measurements.has('real-reading')).toBe(true);
    expect(records.users.size).toBe(11);
    expect(records.measurements.size).toBeGreaterThan(1);
    expect(records.users.get('AST-0001')).toBeDefined();
  });
});
