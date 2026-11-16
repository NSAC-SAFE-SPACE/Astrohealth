import Dexie, { Table } from 'dexie';
import type {
  Measurement,
  SleepLog,
  BoneDensityRecord,
  PsychAssessment,
  ActivityEvent,
  LabResult,
  Astronaut,
  MentalStateData,
  StressAssessment,
  WellBeingAssessment
} from '../types';
import { migrateLegacyMentalStateData } from '../features/mental/mentalState';

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

export interface PredictionRecord {
  id: string;
  astronautId: string;
  kind: 'body' | 'mental';
  createdAt: number;
  apiVersion?: string;
  requestJson: string;
  responseJson: string;
}

export class AstrohealthDatabase extends Dexie {
  measurements!: Table<Measurement, string>;
  sleepLogs!: Table<SleepLog, string>;
  boneDensityRecords!: Table<BoneDensityRecord, string>;
  psychAssessments!: Table<PsychAssessment, string>;
  activityEvents!: Table<ActivityEvent, string>;
  labResults!: Table<LabResult, string>;
  astronauts!: Table<Astronaut, string>;
  users!: Table<Astronaut, string>;
  reports!: Table<MedicalReportRecord, string>;
  predictionRecords!: Table<PredictionRecord, string>;
  stressAssessments!: Table<StressAssessment, string>;
  wellBeingAssessments!: Table<WellBeingAssessment, string>;

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
    this.version(2).stores({
      measurements: 'id, astronautId, metric, timestamp, source', sleepLogs: 'id, astronautId, date',
      boneDensityRecords: 'id, astronautId, date, site, method, isBaseline', psychAssessments: 'id, astronautId, date, status',
      activityEvents: 'id, astronautId, date, type', labResults: 'id, astronautId, analyte, date',
      astronauts: 'id, matricule', users: '&matricule, id, name', reports: 'id, astronautId, generatedAt, status'
    });
    this.version(3).stores({
      measurements: 'id, astronautId, metric, timestamp, source', sleepLogs: 'id, astronautId, date',
      boneDensityRecords: 'id, astronautId, date, site, method, isBaseline', psychAssessments: 'id, astronautId, date, status',
      activityEvents: 'id, astronautId, date, type', labResults: 'id, astronautId, analyte, date',
      astronauts: 'id, matricule', users: '&matricule, id, name', reports: 'id, astronautId, generatedAt, status'
    }).upgrade(async (transaction) => {
      const users = transaction.table<Astronaut, string>('users');
      const astronauts = transaction.table<Astronaut, string>('astronauts');
      await users.toCollection().modify((user) => {
        user.matricule ??= user.id;
        user.id ??= user.matricule;
      });
      await astronauts.toCollection().modify((user) => { user.matricule ??= user.id; });
      const existingUsers = await users.toArray();
      const known = new Set(existingUsers.map((user) => user.matricule));
      for (const profile of await astronauts.toArray()) {
        if (!known.has(profile.matricule)) await users.put({ ...profile, matricule: profile.matricule ?? profile.id });
      }
    });
    this.version(4).stores({
      measurements: 'id, astronautId, metric, timestamp, source', sleepLogs: 'id, astronautId, date',
      boneDensityRecords: 'id, astronautId, date, site, method, isBaseline', psychAssessments: 'id, astronautId, date, status',
      activityEvents: 'id, astronautId, date, type', labResults: 'id, astronautId, analyte, date',
      astronauts: 'id, matricule', users: '&matricule, id, name', reports: 'id, astronautId, generatedAt, status'
    }).upgrade(async (transaction) => {
      await transaction.table<PsychAssessment, string>('psychAssessments').toCollection().modify((assessment) => {
        if (assessment.mentalStateData) {
          assessment.mentalStateData = migrateLegacyMentalStateData(assessment.mentalStateData) as MentalStateData;
        }
      });
    });
    this.version(5).stores({
      measurements: 'id, astronautId, metric, timestamp, source', sleepLogs: 'id, astronautId, date',
      boneDensityRecords: 'id, astronautId, date, site, method, isBaseline', psychAssessments: 'id, astronautId, date, status',
      activityEvents: 'id, astronautId, date, type', labResults: 'id, astronautId, analyte, date',
      astronauts: 'id, matricule', users: '&matricule, id, name', reports: 'id, astronautId, generatedAt, status',
      predictionRecords: 'id, astronautId, kind, createdAt'
    });
    this.version(6).stores({
      measurements: 'id, astronautId, metric, timestamp, source', sleepLogs: 'id, astronautId, date',
      boneDensityRecords: 'id, astronautId, date, site, method, isBaseline', psychAssessments: 'id, astronautId, date, status',
      activityEvents: 'id, astronautId, date, type', labResults: 'id, astronautId, analyte, date',
      astronauts: 'id, matricule', users: '&matricule, id, name', reports: 'id, astronautId, generatedAt, status',
      predictionRecords: 'id, astronautId, kind, createdAt',
      stressAssessments: 'id, astronautId, completedAt', wellBeingAssessments: 'id, astronautId, completedAt'
    });
  }
}

export const db = new AstrohealthDatabase();
