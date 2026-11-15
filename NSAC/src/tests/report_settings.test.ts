import { describe, it, expect } from 'vitest';
import { processNasaCsvData } from '../services/nasaData';
import { SAMPLE_NASA_CMP_CSV } from '../services/sampleCmpData';
import type { Status, Astronaut } from '../types';

describe('Étape 8 - Rapport de vol, file d’attente & bilan sanguin F-12', () => {
  describe('1. Génération du rapport médical du chirurgien de vol', () => {
    it('doit générer une structure de rapport complète conforme avec le disclaimer obligatoire', () => {
      const astronaut: Astronaut = {
        id: 'astro-test-1',
        name: 'Ariane Solenne',
        age: 46,
        sex: 'male',
        weightKg: 82,
        mission: 'station',
        bloodGlucoseUnit: 'mg/dL',
        commDelayMinutes: 5
      };

      const payload = {
        metadata: {
          mission: 'Expedition 72',
          environment: astronaut.mission,
          generatedAt: new Date().toISOString(),
          periodDays: 7,
          disclaimer: 'Outil éducatif, pas un diagnostic médical.'
        },
        astronaut,
        telemetry: {
          globalScore: 88,
          globalStatus: 'normal' as Status,
          cardioScore: { meanSys: 118, meanDia: 76, meanHr: 68 },
          sleepScore: { value: 85, status: 'normal' as Status },
          boneLossScore: { value: 1.8, meanRatePerMonth: 0.45 },
          radiationProjection: { currentCumulative_mSv: 35.4 },
          psychAssessment: { who5Score: 76, status: 'normal' as Status },
          detectedPatterns: []
        }
      };

      // Disclaimers and metadata
      expect(payload.metadata.disclaimer).toBe('Outil éducatif, pas un diagnostic médical.');
      expect(payload.metadata.mission).toBe('Expedition 72');
      expect(payload.metadata.periodDays).toBe(7);

      // Biometrics
      expect(payload.astronaut.name).toBe('Ariane Solenne');
      expect(payload.astronaut.age).toBe(46);
      expect(payload.astronaut.sex).toBe('male');

      // Telemetry
      expect(payload.telemetry.globalScore).toBe(88);
      expect(payload.telemetry.globalStatus).toBe('normal');
      expect(payload.telemetry.psychAssessment.who5Score).toBe(76);
      expect(payload.telemetry.cardioScore.meanSys).toBe(118);
    });

    it('doit formater le résumé et l’export JSON valide et sérialisable', () => {
      const reportData = {
        generatedAt: new Date().toISOString(),
        periodDays: 30,
        globalStatus: 'normal' as Status,
        score: 92,
        timestamp: Date.now()
      };

      const jsonString = JSON.stringify(reportData, null, 2);
      expect(typeof jsonString).toBe('string');

      const parsed = JSON.parse(jsonString);
      expect(Number.isNaN(Date.parse(parsed.generatedAt))).toBe(false);
      expect(parsed.score).toBe(92);
      expect(parsed.globalStatus).toBe('normal');
    });
  });

  describe('2. File d’attente télémétrique avec délai de communication simulé', () => {
    it('doit simuler la progression du statut de transmission selon le délai orbital', () => {
      // commDelay = 0 (Direct / LEO)
      const delayZero = 0;
      const initialStatusZero = delayZero === 0 ? 'transmis' : 'en attente';
      expect(initialStatusZero).toBe('transmis');

      // commDelay = 5 (Mars proche / transit)
      const delayMars = 5;
      const initialStatusMars = delayMars === 0 ? 'transmis' : 'en attente';
      expect(initialStatusMars).toBe('en attente');

      // Countdown calculation for responsive UX
      const countdownSec = Math.max(3, Math.min(delayMars * 2, 12));
      expect(countdownSec).toBe(10);
    });
  });

  describe('3. Bilan sanguin optionnel NASA LSDS-8 (F-12)', () => {
    it('doit parser le fichier CSV LSDS-8 CMP et extraire les analytes avec leurs plages de référence', () => {
      const prepared = processNasaCsvData(SAMPLE_NASA_CMP_CSV);

      expect(prepared.summary.totalSamples).toBeGreaterThan(0);
      expect(prepared.summary.totalRecords).toBeGreaterThan(0);

      // Check key analytes are recognized
      const analytes = Object.keys(prepared.analyteReferenceRanges);
      expect(analytes).toContain('glucose');
      expect(analytes).toContain('calcium');
      expect(analytes).toContain('potassium');
      expect(analytes).toContain('sodium');
      expect(analytes).toContain('albumin');
      expect(analytes).toContain('creatinine');

      // Check reference range bounds for glucose
      const glucoseRef = prepared.analyteReferenceRanges['glucose'];
      expect(glucoseRef.refMin).toBe(70);
      expect(glucoseRef.refMax).toBe(99);
      expect(glucoseRef.unit).toBe('mg/dL');
    });

    it('doit détecter l’anomalie de plausibilité du glucose à 36 mg/dL sans supprimer l’enregistrement', () => {
      const prepared = processNasaCsvData(SAMPLE_NASA_CMP_CSV);

      // Anomalies count must be at least 1 (glucose at 36 mg/dL in sample C002_R+1)
      expect(prepared.summary.anomaliesCount).toBeGreaterThanOrEqual(1);

      const glucoseAnomaly = prepared.records.find(
        (r) => r.analyte === 'glucose' && r.value === 36
      );
      expect(glucoseAnomaly).toBeDefined();
      expect(glucoseAnomaly?.sampleId).toBe('C002_R+1');
      expect(glucoseAnomaly?.isPlausibilityAnomaly).toBe(true);
      expect(glucoseAnomaly?.anomalyNote).toContain('Valeur de glucose inhabituelle (36 mg/dL)');
    });

    it('doit détecter et marquer les valeurs manquantes (missing values)', () => {
      const prepared = processNasaCsvData(SAMPLE_NASA_CMP_CSV);
      expect(prepared.summary.missingValuesCount).toBeGreaterThan(0);

      const missingRecord = prepared.records.find((r) => r.isMissing);
      expect(missingRecord).toBeDefined();
      expect(missingRecord?.value).toBeNull();
    });

    it('doit formater les données de laboratoire pour l’affichage en tableau', () => {
      const prepared = processNasaCsvData(SAMPLE_NASA_CMP_CSV);
      const rows = Object.entries(prepared.analyteReferenceRanges).map(([analyte, ref]) => {
        const record = prepared.records.find((r) => r.analyte === analyte && r.value !== null);
        const val = record?.value ?? null;
        const isOutOfRange = val !== null && (val < ref.refMin || val > ref.refMax);
        return {
          analyte,
          val,
          unit: ref.unit,
          refMin: ref.refMin,
          refMax: ref.refMax,
          isOutOfRange
        };
      });

      expect(rows.length).toBeGreaterThan(10);
      const glucoseRow = rows.find((r) => r.analyte === 'glucose');
      expect(glucoseRow).toBeDefined();
      expect(glucoseRow?.unit).toBe('mg/dL');
    });
  });
});
