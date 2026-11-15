import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from './StatusBadge';
import {
  FileText,
  User,
  Heart,
  Moon,
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  Clock,
  Radio,
  CheckCircle2
} from 'lucide-react';
import type { Astronaut, Status, ScoreResult, Pattern } from '../types';

interface ReportPreviewProps {
  astronaut: Astronaut;
  reportPeriod: 7 | 30;
  reportStatus: 'aucun' | 'en attente' | 'transmis';
  commDelayMinutes: number;
  globalScore: number;
  globalStatus: Status;
  cardioScore: any;
  sleepScore: ScoreResult | null;
  boneLossScore: any;
  radiationProjection: any;
  latestPsychScore: number;
  latestPsychStatus: Status;
  psychMetrics?: {
    stressLevel?: number;
    moodScore?: number;
    workloadPerception?: number;
    timePerception?: number;
    communicationWithOthers?: number;
  };
  patterns: Pattern[];
  meanSleepHours: number;
  latestTemp: number;
  latestGlucose: number;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  astronaut,
  reportPeriod,
  reportStatus,
  commDelayMinutes,
  globalScore,
  globalStatus,
  cardioScore,
  sleepScore,
  boneLossScore,
  radiationProjection,
  latestPsychScore,
  latestPsychStatus,
  psychMetrics,
  patterns,
  meanSleepHours,
  latestTemp,
  latestGlucose
}) => {
  const { t } = useTranslation();
  const now = new Date();
  const nowStr = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const referenceDate = now.toISOString().slice(0, 10).replace(/-/g, '');

  return (
    <div
      id="flight-surgeon-report"
      className="bg-white p-6 sm:p-10 rounded-2xl border-2 border-slate-border shadow-md space-y-8 print:p-0 print:border-none print:shadow-none"
    >
      {/* Official Header */}
      <div className="border-b-2 border-primary pb-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <span>NASA HUMAN RESEARCH PROGRAM // EXPÉDITION 72</span>
          </div>
          <div className="text-xs text-slate-muted font-mono">
            REF-MED-{referenceDate}-{astronaut.name.toUpperCase().slice(0, 3)}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-text">
              Rapport médical du chirurgien de vol
            </h1>
            <p className="text-xs text-slate-muted">
              Période d'analyse : <strong>{reportPeriod} derniers jours</strong> · Date : {nowStr}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {reportStatus === 'transmis' ? (
              <span className="px-3.5 py-1.5 rounded-full bg-status-normal/15 text-status-normal border border-status-normal text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                TRANSMIS AU SOL
              </span>
            ) : reportStatus === 'en attente' ? (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500 text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 animate-spin" />
                EN ATTENTE (DÉLAI {commDelayMinutes} MIN)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold">
                DOCUMENT LOCAL PRÊT
              </span>
            )}
          </div>
        </div>

        {/* Mandatory Educational Disclaimer */}
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium text-center">
          {t('app.disclaimer')}
        </div>
      </div>

      {/* Section 1: Astronaut Profile Summary */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-muted border-b border-slate-border pb-1">
          1. Fiche biométrique de l'astronaute
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface border border-slate-border text-sm">
          <div>
            <span className="text-xs text-slate-muted block">Identifiant</span>
            <strong className="text-slate-text font-bold text-base">{astronaut.name}</strong>
          </div>
          <div>
            <span className="text-xs text-slate-muted block">Âge / Sexe</span>
            <strong className="text-slate-text font-semibold">{astronaut.age} ans · {astronaut.sex === 'male' ? 'Homme' : 'Femme'}</strong>
          </div>
          <div>
            <span className="text-xs text-slate-muted block">Poids corporel</span>
            <strong className="text-slate-text font-semibold">{astronaut.weightKg} kg</strong>
          </div>
          <div>
            <span className="text-xs text-slate-muted block">Environnement</span>
            <strong className="text-slate-text font-semibold capitalize">{astronaut.mission.replace('_', ' ')}</strong>
          </div>
        </div>
      </section>

      {/* Section 2: Global Health Status & Fusion Patterns */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-muted border-b border-slate-border pb-1">
          2. Synthèse globale & Détection multi-métrique
        </h2>
        <div className="p-5 rounded-xl bg-surface border border-slate-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-border flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="font-serif text-2xl font-bold text-slate-text">{globalScore}</span>
              <span className="text-[10px] text-slate-muted font-bold">/ 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-slate-text">Score synthétique de vol</h3>
                <StatusBadge status={globalStatus} size="sm" />
              </div>
              <p className="text-xs text-slate-muted mt-0.5">
                Calculé à partir des filtres de Kalman et des écarts de baseline glissante à 14 jours.
              </p>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-text max-w-sm">
            {globalStatus === 'normal'
              ? 'Tous les systèmes physiologiques se maintiennent dans les limites orbitales nominales.'
              : globalStatus === 'watch'
              ? 'Vigilance recommandée sur la fatigue ou le métabolisme. Aucune intervention médicale urgente.'
              : globalStatus === 'action'
              ? 'Altérations cumulées détectées. Ajustement des protocoles d’exercice et de repos prescrit.'
              : 'ALERTE CRITIQUE : contact direct requis avec le médecin de vol en liaison prioritaire.'}
          </div>
        </div>

        {/* Multi-metric patterns callout if any */}
        {patterns.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
            <div className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Pattern de couplage détecté</span>
            </div>
            {patterns.map((p, i) => (
              <p key={i} className="text-amber-800 leading-relaxed">
                {p.explanation}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Detailed Vital Systems Telemetry */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-muted border-b border-slate-border pb-1">
          3. Télémétrie des sous-systèmes vitaux sur {reportPeriod} jours
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Cardio */}
          <div className="p-4 rounded-xl border border-slate-border bg-surface space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-muted uppercase">Cardiovasculaire</span>
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div className="font-serif text-lg font-bold text-slate-text">
              {cardioScore?.meanSys || 118} / {cardioScore?.meanDia || 78} mmHg
            </div>
            <div className="text-xs text-slate-muted">
              Pouls repos : {cardioScore?.meanHr || 68} bpm
            </div>
          </div>

          {/* Card 2: Sommeil */}
          <div className="p-4 rounded-xl border border-slate-border bg-surface space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-muted uppercase">Sommeil</span>
              <Moon className="w-4 h-4 text-accent" />
            </div>
            <div className="font-serif text-lg font-bold text-slate-text">
              {sleepScore?.value ?? 82} / 100
            </div>
            <div className="text-xs text-slate-muted">
              Moyenne : {meanSleepHours} h / nuit
            </div>
          </div>

          {/* Card 3: Os & Muscles */}
          <div className="p-4 rounded-xl border border-slate-border bg-surface space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-muted uppercase">Perte osseuse</span>
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="font-serif text-lg font-bold text-slate-text">
              -{boneLossScore?.value ?? 1.8}%
            </div>
            <div className="text-xs text-slate-muted">
              Taux : {boneLossScore?.meanRatePerMonth ?? 0.45}% / mois
            </div>
          </div>

          {/* Card 4: Radiations */}
          <div className="p-4 rounded-xl border border-slate-border bg-surface space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-muted uppercase">Radiations</span>
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <div className="font-serif text-lg font-bold text-slate-text">
              {radiationProjection?.currentCumulative_mSv ?? 35.4} mSv
            </div>
            <div className="text-xs text-slate-muted">
              Proj. 30j : {radiationProjection?.projected30d.nominal ?? 42} mSv
            </div>
          </div>
        </div>

        {/* Secondary parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-slate-border bg-white text-xs flex justify-between items-center">
            <span className="text-slate-muted">Température centrale (moyenne) :</span>
            <strong className="text-slate-text font-bold text-sm">{latestTemp} °C</strong>
          </div>
          <div className="p-3 rounded-lg border border-slate-border bg-white text-xs flex justify-between items-center">
            <span className="text-slate-muted">Glycémie capillaire à jeun :</span>
            <strong className="text-slate-text font-bold text-sm">{latestGlucose} {astronaut.bloodGlucoseUnit || 'mg/dL'}</strong>
          </div>
        </div>
      </section>

      {/* Section 4: Mental Well-Being (WHO-5 & Behavioral Health Panel) */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-muted border-b border-slate-border pb-1">
          4. Évaluation psychologique & Dimensions comportementales de bord
        </h2>
        <div className="p-4 rounded-xl bg-surface border border-slate-border flex items-center justify-between gap-4">
          <div>
            <div className="font-serif text-xl font-bold text-slate-text">
              Indice global OMS-5 : {latestPsychScore} / 100
            </div>
            <p className="text-xs text-slate-muted mt-1">
              {latestPsychScore >= 68
                ? 'État psychologique et vitalité stables, engagement opérationnel optimal.'
                : latestPsychScore >= 50
                ? 'Vigilance modérée sur la motivation ou l’énergie. Aménager les temps de détente.'
                : latestPsychScore >= 29
                ? 'Baisse d’énergie et charge mentale soutenue constatée.'
                : 'ALERTE : score OMS-5 critique. Échange psychologique confidentiel requis.'}
            </p>
          </div>
          <StatusBadge status={latestPsychStatus} size="sm" />
        </div>

        {/* 5 Key Behavioral Health Dimensions */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl border border-slate-border bg-white space-y-1">
            <span className="text-[11px] font-bold text-slate-muted uppercase block">Stress</span>
            <div className="font-serif text-base font-bold text-slate-text">
              {psychMetrics?.stressLevel ?? 24} / 100
            </div>
            <span className="text-[10px] text-status-normal font-semibold">
              {(psychMetrics?.stressLevel ?? 24) < 35 ? 'Faible (nominal)' : (psychMetrics?.stressLevel ?? 24) < 65 ? 'Modéré' : 'Élevé'}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-border bg-white space-y-1">
            <span className="text-[11px] font-bold text-slate-muted uppercase block">Humeur</span>
            <div className="font-serif text-base font-bold text-slate-text">
              {psychMetrics?.moodScore ?? 84} / 100
            </div>
            <span className="text-[10px] text-status-normal font-semibold">
              {(psychMetrics?.moodScore ?? 84) >= 70 ? 'Optimale' : (psychMetrics?.moodScore ?? 84) >= 50 ? 'Neutre' : 'Basse'}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-border bg-white space-y-1">
            <span className="text-[11px] font-bold text-slate-muted uppercase block">Charge mentale</span>
            <div className="font-serif text-base font-bold text-slate-text">
              {psychMetrics?.workloadPerception ?? 32} / 100
            </div>
            <span className="text-[10px] text-slate-muted font-semibold">
              {(psychMetrics?.workloadPerception ?? 32) <= 40 ? 'NASA-TLX bas' : (psychMetrics?.workloadPerception ?? 32) <= 70 ? 'Soutenue' : 'Surcharge'}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-border bg-white space-y-1">
            <span className="text-[11px] font-bold text-slate-muted uppercase block">Temps perçu</span>
            <div className="font-serif text-base font-bold text-slate-text">
              {psychMetrics?.timePerception ?? 50} / 100
            </div>
            <span className="text-[10px] text-slate-muted font-semibold">
              {(psychMetrics?.timePerception ?? 50) >= 40 && (psychMetrics?.timePerception ?? 50) <= 60 ? 'Rythme nominal' : 'Distorsion'}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-border bg-white space-y-1">
            <span className="text-[11px] font-bold text-slate-muted uppercase block">Communication</span>
            <div className="font-serif text-base font-bold text-slate-text">
              {psychMetrics?.communicationWithOthers ?? 88} / 100
            </div>
            <span className="text-[10px] text-status-normal font-semibold">
              {(psychMetrics?.communicationWithOthers ?? 88) >= 75 ? 'Cohésion fluide' : (psychMetrics?.communicationWithOthers ?? 88) >= 50 ? 'Réservée' : 'Repli'}
            </span>
          </div>
        </div>
      </section>

      {/* Section 5: Prescribed Actions & Operational Counter-measures */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-muted border-b border-slate-border pb-1">
          5. Prescription de contre-mesures de bord
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-text">
          <li className="p-3 rounded-xl border border-slate-border bg-surface space-y-1">
            <strong className="font-bold text-primary block">Entraînement physique</strong>
            <span>2 heures obligatoires par jour (1h musculation ARED sous charge, 1h cyclo-ergomètre / T2).</span>
          </li>
          <li className="p-3 rounded-xl border border-slate-border bg-surface space-y-1">
            <strong className="font-bold text-primary block">Nutrition & Hydratation</strong>
            <span>Apport hydrique minimum 2,5 L, sodium contrôlé et supplémentation quotidienne vitamine D3.</span>
          </li>
          <li className="p-3 rounded-xl border border-slate-border bg-surface space-y-1">
            <strong className="font-bold text-primary block">Protocole de sommeil</strong>
            <span>Sanctuariser 8 heures en couchette avec éclairage circadien régulé.</span>
          </li>
        </ul>
      </section>

      {/* Official Sign-off Footer */}
      <div className="pt-6 border-t-2 border-slate-border flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
        <span>Généré automatiquement par Astrohealth Client-Side v1.0.0</span>
        <span className="font-mono">NASA HRP Bio-Telemetry Telecommunications Protocol</span>
      </div>
    </div>
  );
};
