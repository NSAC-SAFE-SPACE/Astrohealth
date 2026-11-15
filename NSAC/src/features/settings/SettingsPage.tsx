import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAstroStore } from '../../store/useAstroStore';
import { changeLanguage } from '../../i18n';
import { db, MedicalReportRecord } from '../../db';
import { ReportPreview } from '../../ui/ReportPreview';
import { processNasaCsvData, PreparedNasaData } from '../../services/nasaData';
import { SAMPLE_NASA_CMP_CSV } from '../../services/sampleCmpData';
import {
  Settings,
  User,
  Radio,
  FileText,
  Download,
  Printer,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Zap,
  PlusCircle
} from 'lucide-react';
import type { MissionEnvironment, LabResult, Status } from '../../types';
import { ENVIRONMENT_COMM_DELAYS } from '../../services/profile';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    astronaut,
    astronautProfiles,
    updateAstronautProfile,
    createAstronautProfile,
    selectAstronautProfile,
    cardioScore,
    sleepScore,
    boneLossScore,
    radiationProjection,
    globalStatus,
    globalScore,
    patterns,
    psychAssessments,
    sleepLogs,
    measurements
  } = useAstroStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(astronaut.name);
  const [age, setAge] = useState(astronaut.age);
  const [sex, setSex] = useState(astronaut.sex);
  const [weightKg, setWeightKg] = useState(astronaut.weightKg);
  const [mission, setMission] = useState<MissionEnvironment>(astronaut.mission);
  const [glucoseUnit, setGlucoseUnit] = useState<'mg/dL' | 'mmol/L'>(astronaut.bloodGlucoseUnit || 'mg/dL');
  const [commDelay, setCommDelay] = useState(astronaut.commDelayMinutes ?? 5);
  const [reportPeriod, setReportPeriod] = useState<7 | 30>(7);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Transmission queue simulated state
  const [reportStatus, setReportStatus] = useState<'aucun' | 'en attente' | 'transmis'>('aucun');
  const [countdownSec, setCountdownSec] = useState<number>(0);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [showReportPreview, setShowReportPreview] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Optional Lab Data State
  const [labData, setLabData] = useState<PreparedNasaData | null>(null);
  const [labMessage, setLabMessage] = useState<string | null>(null);

  // Keep state in sync if store changes
  useEffect(() => {
    setName(astronaut.name);
    setAge(astronaut.age);
    setSex(astronaut.sex);
    setWeightKg(astronaut.weightKg);
    setMission(astronaut.mission);
    setGlucoseUnit(astronaut.bloodGlucoseUnit || 'mg/dL');
    setCommDelay(astronaut.commDelayMinutes ?? 5);
  }, [astronaut]);

  // Transmission timer
  useEffect(() => {
    if (reportStatus !== 'en attente' || countdownSec <= 0) return;

    const interval = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          setReportStatus('transmis');
          // Update DB record
          if (pendingReportId) {
            db.reports.update(pendingReportId, {
              status: 'transmis',
              deliveredAt: Date.now()
            }).then(() => setPendingReportId(null));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [reportStatus, countdownSec, pendingReportId]);

  // Handle local client-side image resize to 256px
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Crop square center
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 256, 256);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updateAstronautProfile({ photo: dataUrl });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const creatingProfile = isCreatingProfile;
    const profile = {
      name,
      age: Number(age),
      sex,
      weightKg: Number(weightKg),
      mission,
      bloodGlucoseUnit: glucoseUnit
    };
    if (isCreatingProfile) {
      await createAstronautProfile(profile);
      setIsCreatingProfile(false);
    } else {
      await updateAstronautProfile({
        ...profile,
        commDelayMinutes: Number(commDelay)
      });
    }
    setSaveSuccessMessage(creatingProfile ? t('settings.profileCreated') : t('settings.profileSaved'));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const startNewProfile = () => {
    setName('');
    setAge(30);
    setSex('female');
    setWeightKg(65);
    setMission('spacecraft');
    setGlucoseUnit('mg/dL');
    setCommDelay(ENVIRONMENT_COMM_DELAYS.spacecraft.nominalMin);
    setIsCreatingProfile(true);
    setSaveSuccess(false);
  };

  const cancelNewProfile = () => {
    setIsCreatingProfile(false);
    setName(astronaut.name);
    setAge(astronaut.age);
    setSex(astronaut.sex);
    setWeightKg(astronaut.weightKg);
    setMission(astronaut.mission);
    setGlucoseUnit(astronaut.bloodGlucoseUnit || 'mg/dL');
    setCommDelay(astronaut.commDelayMinutes ?? 5);
  };

  // Generate Flight Surgeon Report
  const handleGenerateReport = async () => {
    const reportId = `rep-${Date.now()}`;
    const reportData = buildReportPayload();

    const newRecord: MedicalReportRecord = {
      id: reportId,
      astronautId: astronaut.id,
      generatedAt: Date.now(),
      periodDays: reportPeriod,
      status: commDelay > 0 ? 'en attente' : 'transmis',
      deliveredAt: commDelay === 0 ? Date.now() : undefined,
      summaryText: `Rapport du ${new Date().toLocaleDateString('fr-FR')} (${reportPeriod} jours) - Statut : ${globalStatus}`,
      reportJson: JSON.stringify(reportData)
    };

    await db.reports.put(newRecord);
    setPendingReportId(newRecord.id ?? null);

    if (commDelay > 0) {
      setReportStatus('en attente');
      // Keep the transmission state visible without making the user wait for full orbital latency.
      const simulatedSeconds = Math.max(3, Math.min(commDelay * 2, 12));
      setCountdownSec(simulatedSeconds);
    } else {
      setReportStatus('transmis');
      setCountdownSec(0);
    }

    setShowReportPreview(true);
  };

  const handleForceTransmit = async () => {
    setCountdownSec(0);
    setReportStatus('transmis');
    if (pendingReportId) {
      await db.reports.update(pendingReportId, {
        status: 'transmis',
        deliveredAt: Date.now()
      });
      setPendingReportId(null);
    }
  };

  const buildReportPayload = () => {
    const latestPsych = psychAssessments[psychAssessments.length - 1];
    const meanSleep =
      sleepLogs.length > 0
        ? Number((sleepLogs.slice(0, 7).reduce((acc, l) => acc + l.hours, 0) / Math.min(sleepLogs.length, 7)).toFixed(1))
        : 7.2;
    const latestT = measurements.find((m) => m.metric === 'temperature')?.value ?? 36.6;
    const latestG = measurements.find((m) => m.metric === 'glucose')?.value ?? 84;

    return {
      metadata: {
        mission: 'Expedition 72',
        environment: astronaut.mission,
        generatedAt: new Date().toISOString(),
        periodDays: reportPeriod,
        disclaimer: 'Outil éducatif, pas un diagnostic médical.'
      },
      astronaut: {
        id: astronaut.id,
        name,
        age,
        sex,
        weightKg
      },
      telemetry: {
        globalScore,
        globalStatus,
        cardioScore,
        sleepScore,
        meanSleepHours: meanSleep,
        boneLossScore,
        radiationProjection,
        temperature: latestT,
        glucose: latestG,
        glucoseUnit: astronaut.bloodGlucoseUnit || 'mg/dL',
        psychAssessment: {
          who5Score: latestPsych?.score ?? 76,
          status: latestPsych?.status ?? 'normal'
        },
        detectedPatterns: patterns
      }
    };
  };

  const handleDownloadJson = () => {
    const reportData = buildReportPayload();
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Astrohealth_Rapport_Chirurgien_${new Date().toISOString().slice(0, 10)}_${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Optional Lab CSV parsing & loading
  const parseAndSetLabData = async (csvText: string, filename: string) => {
    const parsed = processNasaCsvData(csvText);
    setLabData(parsed);

    // Save records to Dexie IndexedDB
    const todayStr = new Date().toISOString().split('T')[0];
    const recordsToStore: LabResult[] = parsed.records.slice(0, 50).map((r, i) => ({
      id: `lab-${Date.now()}-${i}`,
      astronautId: astronaut.id,
      analyte: r.analyte,
      value: r.value ?? 0,
      unit: r.unit,
      refMin: r.refMin ?? 0,
      refMax: r.refMax ?? 100,
      date: todayStr
    }));

    await db.labResults.bulkPut(recordsToStore);

    setLabMessage(
      `${filename} : ${parsed.summary.totalRecords} mesures intégrées (${parsed.summary.totalSamples} échantillons, ${Object.keys(parsed.analyteReferenceRanges).length} analytes).`
    );
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await parseAndSetLabData(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCmp = async () => {
    await parseAndSetLabData(SAMPLE_NASA_CMP_CSV, 'LSDS-8_CMP.csv (NASA GeneLab)');
  };

  // Derived values for ReportPreview
  const latestPsych = psychAssessments[psychAssessments.length - 1];
  const latestPsychScore = latestPsych?.score ?? 76;
  const latestPsychStatus: Status = latestPsych?.status ?? 'normal';
  const meanSleepHours =
    sleepLogs.length > 0
      ? Number((sleepLogs.slice(0, 7).reduce((acc, l) => acc + l.hours, 0) / Math.min(sleepLogs.length, 7)).toFixed(1))
      : 7.2;
  const latestTemp = measurements.find((m) => m.metric === 'temperature')?.value ?? 36.6;
  const latestGlucose = measurements.find((m) => m.metric === 'glucose')?.value ?? 84;

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Page Header (Hidden in Print) */}
      <div className="pb-4 border-b border-slate-border no-print">
        <h1 className="font-serif text-3xl font-bold text-slate-text">
          {t('settings.title')}
        </h1>
        <p className="text-body-sm text-slate-muted max-w-prose">
          Paramètres individuels, environnement orbital et transmission télémétrique.
        </p>
      </div>

      {/* Astronaut profile form */}
      <section id="profils" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-bold text-slate-text">
            {t('settings.profileSection')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {!isCreatingProfile && astronautProfiles.length > 1 && (
              <select
                aria-label={t('settings.selectProfile')}
                value={astronaut.id}
                onChange={(e) => selectAstronautProfile(e.target.value)}
                className="h-11 px-3 rounded-xl border border-slate-border text-sm font-semibold bg-white"
              >
                {astronautProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            )}
            {isCreatingProfile ? (
              <button
                type="button"
                onClick={cancelNewProfile}
                className="px-4 py-2.5 rounded-xl border border-slate-border text-sm font-semibold hover:bg-surface min-h-[44px]"
              >
                {t('settings.cancelNewProfile')}
              </button>
            ) : (
              <button
                type="button"
                onClick={startNewProfile}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary-hover min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4" />
                {t('settings.newProfile')}
              </button>
            )}
          </div>
        </div>

        {/* Profile photo with local 256px crop */}
        {!isCreatingProfile && <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface flex items-center justify-center shrink-0">
            {astronaut.photo ? (
              <img src={astronaut.photo} alt="Photo profil" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary/60" />
            )}
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-slate-border text-xs font-semibold text-slate-text hover:bg-surface flex items-center gap-2 min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>{t('settings.profilePhoto')}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
            <p className="text-[11px] text-slate-400">
              Traitée 100% en local dans le navigateur (cadrage 256×256 px), jamais envoyée sur un serveur.
            </p>
          </div>
        </div>}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.name')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-border text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.environment')}
              </label>
              <select
                value={mission}
                onChange={(e) => setMission(e.target.value as any)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-border text-sm font-semibold bg-white"
              >
                <option value="station">Station spatiale orbitale (station)</option>
                <option value="spacecraft">Vaisseau espace profond (spacecraft)</option>
                <option value="lunar_base">Base lunaire (lunar_base - 1/6 g)</option>
                <option value="mars_rover">Rover martien (mars_rover - 1/3 g)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.age')}
              </label>
              <input
                type="number"
                min="1"
                max="120"
                required
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-border text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.weight')}
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-border text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.sex')}
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-border text-sm font-semibold bg-white"
              >
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.glucoseUnit')}
              </label>
              <select
                value={glucoseUnit}
                onChange={(e) => setGlucoseUnit(e.target.value as any)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-border text-sm font-semibold bg-white"
              >
                <option value="mg/dL">mg/dL (canonique NASA)</option>
                <option value="mmol/L">mmol/L (standard international)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-muted mb-1">
                {t('settings.commDelay')} ({commDelay} min)
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={commDelay}
                onChange={(e) => setCommDelay(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0 min (Direct / LEO)</span>
                <span>10 min (Lune / Mars proche)</span>
                <span>20 min (Mars opposition)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover shadow-xs transition-colors min-h-[44px]"
            >
              {isCreatingProfile ? t('settings.startTracking') : t('settings.saveChanges')}
            </button>
            {saveSuccess && (
              <span className="text-xs font-semibold text-status-normal flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {saveSuccessMessage}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Flight surgeon report and telemetry queue */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
        <div className="flex items-center gap-3 no-print">
          <div className="p-2.5 rounded-xl bg-primary text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-slate-text">
              {t('settings.reportSection')}
            </h2>
            <p className="text-xs text-slate-muted">
              Synthèse clinique pour le médecin de mission, file d'attente télémétrique avec délai simulé et exports hors ligne.
            </p>
          </div>
        </div>

        {/* Period choice & actions (no-print) */}
        <div className="space-y-4 no-print">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              {[7, 30].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setReportPeriod(period as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border min-h-[40px] ${
                    reportPeriod === period
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-slate-text border-slate-border hover:bg-surface'
                  }`}
                >
                  {period === 7 ? t('settings.period7d') : t('settings.period30d')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowReportPreview(!showReportPreview)}
              className="px-4 py-2 rounded-xl border border-slate-border bg-surface text-slate-text text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 min-h-[40px]"
            >
              {showReportPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showReportPreview ? 'Masquer l’aperçu' : 'Afficher l’aperçu du rapport'}</span>
            </button>
          </div>

          {/* Telemetry Queue Status Banner */}
          <div className="p-4 rounded-xl bg-surface border border-slate-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                {t('settings.reportStatusQueue')}
              </div>
              <div className="text-sm font-bold text-slate-text flex items-center gap-2">
                {reportStatus === 'aucun' && (
                  <span className="text-slate-400">Prêt à générer (aucun envoi en attente)</span>
                )}
                {reportStatus === 'en attente' && (
                  <span className="text-amber-600 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin text-amber-500" />
                    En attente d'acquisition Terre (délai orbital {commDelay} min · reste {countdownSec}s)...
                  </span>
                )}
                {reportStatus === 'transmis' && (
                  <span className="text-status-normal flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Rapport transmis avec succès au centre de contrôle de Houston (délai respecté)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reportStatus === 'en attente' && (
                <button
                  type="button"
                  onClick={handleForceTransmit}
                  className="px-3.5 py-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs hover:bg-amber-200 min-h-[40px]"
                  title="Transmettre maintenant"
                >
                  Transmettre maintenant
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateReport}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-hover shadow-xs min-h-[44px]"
              >
                {t('settings.generateReport')}
              </button>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-5 py-2.5 rounded-xl border border-slate-border bg-white text-slate-text font-semibold text-xs flex items-center gap-2 hover:bg-surface shadow-xs min-h-[44px]"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>{t('settings.exportJson')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl border border-slate-border bg-white text-slate-text font-semibold text-xs flex items-center gap-2 hover:bg-surface shadow-xs min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>{t('settings.exportPdf')}</span>
            </button>
          </div>
        </div>

        {/* Embedded Flight Surgeon Report Document */}
        {showReportPreview && (
          <div className="pt-2">
            <ReportPreview
              astronaut={{ ...astronaut, name, age, mission }}
              reportPeriod={reportPeriod}
              reportStatus={reportStatus}
              commDelayMinutes={commDelay}
              globalScore={globalScore}
              globalStatus={globalStatus}
              cardioScore={cardioScore}
              sleepScore={sleepScore}
              boneLossScore={boneLossScore}
              radiationProjection={radiationProjection}
              latestPsychScore={latestPsychScore}
              latestPsychStatus={latestPsychStatus}
              psychMetrics={{
                stressLevel: latestPsych?.stressLevel,
                moodScore: latestPsych?.moodScore,
                workloadPerception: latestPsych?.workloadPerception,
                timePerception: latestPsych?.timePerception,
                communicationWithOthers: latestPsych?.communicationWithOthers
              }}
              patterns={patterns}
              meanSleepHours={meanSleepHours}
              latestTemp={latestTemp}
              latestGlucose={latestGlucose}
            />
          </div>
        )}
      </section>

      {/* Optional lab blood panel (F-12) */}
      <section className="bg-surface p-6 sm:p-8 rounded-2xl border border-slate-border space-y-6 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-white">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-slate-text">
              {t('settings.labSection')}
            </h3>
            <p className="text-xs text-slate-muted">
              Importation et comparaison de panels biochimiques de laboratoire (NASA GeneLab LSDS-8 CMP / Eve) avec détection d'anomalies.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLoadSampleCmp}
            className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:bg-primary-hover shadow-xs min-h-[44px]"
          >
            <Zap className="w-4 h-4" />
            <span>Charger l'échantillon NASA LSDS-8 (CMP)</span>
          </button>

          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-border text-xs font-semibold text-slate-text flex items-center gap-2 hover:bg-slate-50 min-h-[44px]"
          >
            <Upload className="w-4 h-4 text-primary" />
            <span>{t('settings.importCsv')}</span>
          </button>
          <input
            type="file"
            ref={csvInputRef}
            onChange={handleCsvImport}
            accept=".csv"
            className="hidden"
          />
        </div>

        {labMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{labMessage}</span>
          </div>
        )}

        {/* Lab Panel Results Display */}
        {labData && (
          <div className="space-y-4 pt-2">
            {/* Summary statistics badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-border">
                <span className="text-slate-muted block">Échantillons</span>
                <strong className="text-slate-text text-base font-bold">{labData.summary.totalSamples}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-border">
                <span className="text-slate-muted block">Analytes tracés</span>
                <strong className="text-slate-text text-base font-bold">{Object.keys(labData.analyteReferenceRanges).length}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-border">
                <span className="text-slate-muted block">Valeurs manquantes</span>
                <strong className="text-slate-text text-base font-bold">{labData.summary.missingValuesCount}</strong>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
                <span className="text-amber-800 block font-semibold">Anomalies plausibilité</span>
                <strong className="text-amber-900 text-base font-bold">{labData.summary.anomaliesCount}</strong>
              </div>
            </div>

            {/* Plausibility Warning Callout (Glucose 36 mg/dL) */}
            {labData.summary.anomaliesCount > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Anomalie de plausibilité détectée (Protocole NASA)</span>
                </div>
                <p>
                  Échantillon <strong>C002_R+1</strong> : glycémie enregistrée à <strong>36 mg/dL</strong> (seuil bas critique &lt; 50 mg/dL).
                  Conformément aux directives de vol, cette valeur n'est <em>pas supprimée</em> du registre, mais signalée pour vérification avec l'équipage.
                </p>
              </div>
            )}

            {/* Analyte Reference Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-border bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-border text-slate-muted uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Analyte</th>
                    <th className="py-2.5 px-3">Valeur mesurée</th>
                    <th className="py-2.5 px-3">Plage de référence NASA</th>
                    <th className="py-2.5 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(labData.analyteReferenceRanges).map(([analyte, ref]) => {
                    // Find latest record for this analyte
                    const record = labData.records.find((r) => r.analyte === analyte && r.value !== null);
                    const val = record?.value ?? null;
                    const isOutOfRange = val !== null && (val < ref.refMin || val > ref.refMax);
                    const isAnomaly = record?.isPlausibilityAnomaly;

                    return (
                      <tr key={analyte} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-text capitalize">
                          {analyte.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-text">
                          {val !== null ? `${val} ${ref.unit}` : <span className="text-slate-400">Non mesuré</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-muted font-mono">
                          {ref.refMin} – {ref.refMax} {ref.unit}
                        </td>
                        <td className="py-2.5 px-3">
                          {isAnomaly ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                              Anomalie
                            </span>
                          ) : isOutOfRange ? (
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[11px]">
                              Hors plage
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              Nominal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
