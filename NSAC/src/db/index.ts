import Dexie, { Table } from 'dexie';
import type {
  Measurement,
  SleepLog,
  BoneDensityRecord,
  PsychAssessment,
  ActivityEvent,
  LabResult,
  Astronaut
} from '../types';

export interface MedicalReportRecord {
  id?: string;
  astronautId: string;
  generatedAt: number;
  periodDays: number;
  status: 'en attente' | 'transmis';
  deliveredAt?: number;
  summaryText: string;
  reportJson: string;
}

export class AstrohealthDatabase extends Dexie {
  measurements!: Table<Measurement, string>;
  sleepLogs!: Table<SleepLog, string>;
  boneDensityRecords!: Table<BoneDensityRecord, string>;
  psychAssessments!: Table<PsychAssessment, string>;
  activityEvents!: Table<ActivityEvent, string>;
  labResults!: Table<LabResult, string>;
  astronauts!: Table<Astronaut, string>;
  reports!: Table<MedicalReportRecord, string>;

  constructor() {
    super('AstrohealthDB');
    this.version(1).stores({
      measurements: 'id, astronautId, metric, timestamp, source',
      sleepLogs: 'id, astronautId, date',
      boneDensityRecords: 'id, astronautId, date, site, method, isBaseline',
      psychAssessments: 'id, astronautId, date, status',
      activityEvents: 'id, astronautId, date, type',
      labResults: 'id, astronautId, analyte, date',
      astronauts: 'id',
      reports: 'id, astronautId, generatedAt, status'
    });
  }
}

export const db = new AstrohealthDatabase();
