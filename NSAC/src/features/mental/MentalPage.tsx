import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../ui/StatusBadge';
import { MeasureModal } from '../../ui/MeasureModal';
import { useAstroStore } from '../../store/useAstroStore';
import {
  Brain,
  Moon,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Check,
  Zap,
  Smile,
  Gauge,
  Clock,
  Users,
  SlidersHorizontal,
  X
} from 'lucide-react';
import type { Status, PsychMetrics } from '../../types';

export const MentalPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    psychAssessments,
    sleepLogs,
    sleepScore,
    addPsychAssessment,
    updatePsychMetrics,
    logActivityEvent
  } = useAstroStore();

  const [mode, setMode] = useState<'overview' | 'questionnaire' | 'result'>('overview');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([4, 4, 4, 4, 4]);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isAdjustingDimensions, setIsAdjustingDimensions] = useState(false);

  // Latest psych assessment
  const sortedPsych = [...psychAssessments].sort((a, b) => b.date.localeCompare(a.date));
  const latestPsych = sortedPsych[0] || {
    score: 84,
    status: 'normal' as Status,
    date: new Date().toISOString().split('T')[0],
    stressLevel: 24,
    moodScore: 84,
    workloadPerception: 32,
    timePerception: 50,
    communicationWithOthers: 88
  };

  // Temp state for editing dimensions
  const [tempStress, setTempStress] = useState<number>(latestPsych.stressLevel ?? 24);
  const [tempMood, setTempMood] = useState<number>(latestPsych.moodScore ?? 84);
  const [tempWorkload, setTempWorkload] = useState<number>(latestPsych.workloadPerception ?? 32);
  const [tempTime, setTempTime] = useState<number>(latestPsych.timePerception ?? 50);
  const [tempComm, setTempComm] = useState<number>(latestPsych.communicationWithOthers ?? 88);

  // Synchronize temp state when latestPsych updates
  useEffect(() => {
    setTempStress(latestPsych.stressLevel ?? 24);
    setTempMood(latestPsych.moodScore ?? 84);
    setTempWorkload(latestPsych.workloadPerception ?? 32);
    setTempTime(latestPsych.timePerception ?? 50);
    setTempComm(latestPsych.communicationWithOthers ?? 88);
  }, [latestPsych]);

  // Register view activity event on mount
  useEffect(() => {
    logActivityEvent('view');
  }, [logActivityEvent]);

  // Questions and choices from i18n
  const questions = (t('mental.questions', { returnObjects: true }) as string[]) || [
    'Je me suis senti(e) bien et de bonne humeur.',
    'Je me suis senti(e) calme et tranquille.',
    'Je me suis senti(e) plein(e) d’énergie.',
    'Je me suis réveillé(e) en me sentant frais et dispos.',
    'Ma vie quotidienne a été remplie de choses intéressantes.'
  ];

  const choices = (t('mental.choices', { returnObjects: true }) as { label: string; points: number }[]) || [
    { label: 'Tout le temps', points: 5 },
    { label: 'La plupart du temps', points: 4 },
    { label: 'Plus de la moitié du temps', points: 3 },
    { label: 'Moins de la moitié du temps', points: 2 },
    { label: 'De temps en temps', points: 1 },
    { label: 'Jamais', points: 0 }
  ];

  const last8Assessments = sortedPsych.slice(0, 8).reverse();

  // Handle single question answer selection and auto-advance
  const handleSelectAnswer = (pts: number) => {
    const nextAnswers = [...answers];
    nextAnswers[currentQIndex] = pts;
    setAnswers(nextAnswers);

    if (currentQIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQIndex((prev) => prev + 1);
      }, 180);
    } else {
      setTimeout(() => {
        setMode('result');
      }, 200);
    }
  };

  // Compute live score & evaluation for questionnaire result
  const calculatedSum = answers.reduce((a, b) => a + b, 0);
  const calculatedScore = calculatedSum * 4;
  const calculatedStatus: Status =
    calculatedScore >= 68
      ? 'normal'
      : calculatedScore >= 50
      ? 'watch'
      : calculatedScore >= 29
      ? 'action'
      : 'contact_flight_surgeon';

  // Get localized evaluation text
  const getEvaluation = (status: Status) => {
    const ev = t(`mental.evaluations.${status}`, { returnObjects: true }) as {
      title: string;
      phrase: string;
      actions: string[];
    };
    return (
      ev || {
        title: 'Évaluation psychologique',
        phrase: 'Bilan enregistré.',
        actions: ['Poursuivre les routines de bord.']
      }
    );
  };

  const currentEval = getEvaluation(latestPsych.status);
  const resultEval = getEvaluation(calculatedStatus);

  // Save assessment and return to overview
  const handleSaveAssessment = async () => {
    await addPsychAssessment(answers, {
      stressLevel: Math.max(15, Math.min(85, Math.round(100 - calculatedScore * 0.85))),
      moodScore: calculatedScore,
      workloadPerception: calculatedScore < 50 ? 72 : 35,
      timePerception: calculatedScore < 40 ? 30 : 50,
      communicationWithOthers: Math.max(25, Math.min(95, Math.round(calculatedScore * 0.95)))
    });
    setMode('overview');
    setCurrentQIndex(0);
  };

  const handleSaveDimensions = async () => {
    await updatePsychMetrics({
      stressLevel: tempStress,
      moodScore: tempMood,
      workloadPerception: tempWorkload,
      timePerception: tempTime,
      communicationWithOthers: tempComm
    });
    setIsAdjustingDimensions(false);
  };

  // Helpers for individual dimensions statuses
  const getStressStatus = (val: number): Status => (val < 35 ? 'normal' : val < 65 ? 'watch' : 'action');
  const getMoodStatus = (val: number): Status => (val >= 70 ? 'normal' : val >= 50 ? 'watch' : 'action');
  const getWorkloadStatus = (val: number): Status => (val <= 40 ? 'normal' : val <= 70 ? 'watch' : 'action');
  const getTimeStatus = (val: number): Status => (val >= 40 && val <= 60 ? 'normal' : 'watch');
  const getCommStatus = (val: number): Status => (val >= 75 ? 'normal' : val >= 50 ? 'watch' : 'action');

  const currentStress = latestPsych.stressLevel ?? 24;
  const currentMood = latestPsych.moodScore ?? 84;
  const currentWorkload = latestPsych.workloadPerception ?? 32;
  const currentTime = latestPsych.timePerception ?? 50;
  const currentComm = latestPsych.communicationWithOthers ?? 88;

  return (
    <div className="space-y-10 sm:space-y-12 max-w-4xl mx-auto">
      {/* Page Header */}
      <section className="pb-4 border-b border-slate-border">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-text">
          {t('mental.title')}
        </h1>
        <p className="text-body-sm text-slate-muted max-w-prose mt-1">
          {t('mental.subtitle')}
        </p>
      </section>

      {/* 1. QUESTIONNAIRE OMS-5 STEPPER VIEW */}
      {mode === 'questionnaire' && (
        <section
          aria-labelledby="question-heading"
          className="bg-surface p-6 sm:p-10 rounded-2xl border border-primary/40 shadow-md space-y-8"
        >
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-muted uppercase tracking-wider">
              <span>{t('mental.questionProgress', { current: currentQIndex + 1, total: questions.length })}</span>
              <span>{Math.round(((currentQIndex + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-3 py-2">
            <span className="text-sm uppercase tracking-wider font-bold text-primary">
              {t('mental.questionPrompt')}
            </span>
            <h2 id="question-heading" className="font-serif text-2xl sm:text-3xl font-bold text-slate-text max-w-prose leading-snug">
              « {questions[currentQIndex]} »
            </h2>
          </div>

          {/* Choices list (touch targets >= 52px with auto-advance) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {choices.map((choice) => {
              const isSelected = answers[currentQIndex] === choice.points;
              return (
                <button
                  key={choice.points}
                  onClick={() => handleSelectAnswer(choice.points)}
                  className={`min-h-[56px] px-5 py-3.5 rounded-xl border text-left flex items-center justify-between transition-all group shadow-xs ${
                    isSelected
                      ? 'bg-primary text-white border-primary font-semibold'
                      : 'bg-white text-slate-text border-slate-border hover:bg-primary-light hover:border-primary/60'
                  }`}
                >
                  <span className="text-base">{choice.label}</span>
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-white text-primary'
                        : 'bg-surface text-slate-muted group-hover:bg-primary group-hover:text-white'
                    }`}
                  >
                    {choice.points}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stepper bottom controls */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-border">
            {currentQIndex > 0 ? (
              <button
                onClick={() => setCurrentQIndex((prev) => prev - 1)}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-border text-sm font-semibold text-slate-text flex items-center gap-2 hover:bg-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('mental.prevQuestion')}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => {
                setMode('overview');
                setCurrentQIndex(0);
              }}
              className="text-xs font-medium text-slate-muted hover:text-slate-text underline min-h-[44px] flex items-center"
            >
              {t('mental.cancelAssessment')}
            </button>
          </div>
        </section>
      )}

      {/* 2. DEDICATED RESULT SUMMARY VIEW (POST-QUESTIONNAIRE) */}
      {mode === 'result' && (
        <section
          aria-labelledby="result-heading"
          className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-border shadow-lg space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-border">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-primary">
                Auto-évaluation terminée
              </span>
              <h2 id="result-heading" className="font-serif text-2xl sm:text-3xl font-bold text-slate-text mt-1">
                {t('mental.newAssessmentTitle')}
              </h2>
            </div>
            <StatusBadge status={calculatedStatus} size="lg" />
          </div>

          {/* Doctor Alert Callout if critical */}
          {calculatedStatus === 'contact_flight_surgeon' && (
            <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 text-sm font-semibold flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{t('mental.doctorAlertNotice')}</span>
            </div>
          )}

          {/* Score Display & Main Explanation */}
          <div className="flex flex-col md:flex-row items-center gap-8 p-6 rounded-2xl bg-surface border border-slate-border">
            <div className="relative flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-primary/20 bg-white shrink-0 shadow-xs">
              <span className="font-serif text-4xl font-bold text-slate-text">{calculatedScore}</span>
              <span className="text-xs uppercase tracking-wider text-slate-muted font-bold">/ 100</span>
            </div>

            <div className="space-y-2 text-center md:text-left max-w-prose">
              <h3 className="font-serif text-2xl font-bold text-slate-text">
                {resultEval.title}
              </h3>
              <p className="text-body text-slate-muted leading-relaxed">
                {resultEval.phrase}
              </p>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-muted">
              Actions recommandées pour les prochains jours :
            </div>
            <div className="space-y-2">
              {resultEval.actions.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-slate-border text-sm text-slate-text">
                  <CheckCircle2 className="w-5 h-5 text-status-normal shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save & Return Action Button */}
          <div className="pt-4 border-t border-slate-border">
            <button
              onClick={handleSaveAssessment}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-hover shadow-xs transition-colors"
            >
              <Check className="w-5 h-5" />
              <span>{t('mental.saveAndReturn')}</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. OVERVIEW VIEW */}
      {mode === 'overview' && (
        <>
          {/* Section A: Last Check Card */}
          <section className="bg-surface p-6 sm:p-8 rounded-2xl border border-slate-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  <Brain className="w-4 h-4 text-primary" />
                  <span>{t('mental.lastAssessment')} ({latestPsych.date})</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-4xl font-bold text-slate-text">
                    {latestPsych.score}
                  </span>
                  <span className="text-sm text-slate-muted font-semibold">/ 100</span>
                  <StatusBadge status={latestPsych.status} size="sm" />
                </div>
              </div>

              <button
                onClick={() => {
                  setAnswers([3, 3, 3, 3, 3]);
                  setCurrentQIndex(0);
                  setMode('questionnaire');
                }}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover shadow-xs transition-colors self-start sm:self-auto"
              >
                <span>{psychAssessments.length > 0 ? t('mental.retakeAssessment') : t('mental.startAssessment')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Assessment phrase and guidance */}
            <div className="space-y-3 max-w-prose">
              <h3 className="font-serif text-xl font-bold text-slate-text">
                {currentEval.title}
              </h3>
              <p className="text-body-sm text-slate-muted leading-relaxed">
                {currentEval.phrase}
              </p>
              <div className="space-y-2 pt-2">
                {currentEval.actions.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-text">
                    <CheckCircle2 className="w-4 h-4 text-status-normal shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 8 Last Assessments Visual Bars with Thresholds */}
            <div className="pt-6 border-t border-slate-border space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-muted">
                <span>{t('mental.historyTitle')}</span>
                <span>Seuil optimal : ≥ 68</span>
              </div>

              <div className="relative h-32 pt-4 flex items-end gap-2 sm:gap-3 bg-white p-4 rounded-xl border border-slate-border">
                {/* 68 Threshold dotted line */}
                <div
                  className="absolute left-0 right-0 border-b border-dashed border-status-normal pointer-events-none z-10"
                  style={{ bottom: '68%' }}
                  title="Seuil normal (68)"
                />
                {/* 50 Threshold dotted line */}
                <div
                  className="absolute left-0 right-0 border-b border-dashed border-status-watch/60 pointer-events-none z-10"
                  style={{ bottom: '50%' }}
                  title="Seuil vigilance (50)"
                />

                {last8Assessments.map((item, idx) => {
                  const heightPercent = Math.max(12, item.score);
                  const barColor =
                    item.status === 'normal'
                      ? 'bg-status-normal'
                      : item.status === 'watch'
                      ? 'bg-status-watch'
                      : item.status === 'action'
                      ? 'bg-status-action'
                      : 'bg-status-contact_flight_surgeon';
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group z-20">
                      <div className="text-[11px] font-bold text-slate-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.score}
                      </div>
                      <div
                        className={`w-full rounded-t-md ${barColor} transition-all duration-300 min-w-[16px]`}
                        style={{ height: `${heightPercent}%` }}
                        title={`${item.date} : ${item.score}/100 (${item.status})`}
                      />
                      <span className="text-[11px] text-slate-muted font-medium">
                        S{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section B: 5 Key Behavioral & Psychometric Dimensions (Stress, Mood, Workload, Time, Communication) */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-text">
                  {t('mental.dimensionsTitle')}
                </h2>
                <p className="text-xs text-slate-muted mt-0.5 max-w-prose">
                  {t('mental.dimensionsSubtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdjustingDimensions(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-primary text-primary font-semibold text-xs flex items-center gap-2 hover:bg-primary-light transition-colors self-start sm:self-auto"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t('mental.logDimensionsButton')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Stress Level */}
              <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-text">
                        {t('mental.dimensions.stressLevel.title')}
                      </span>
                    </div>
                    <StatusBadge status={getStressStatus(currentStress)} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-serif text-3xl font-bold text-slate-text">{currentStress}</span>
                    <span className="text-xs text-slate-muted font-semibold">/ 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentStress < 35 ? 'bg-status-normal' : currentStress < 65 ? 'bg-status-watch' : 'bg-status-action'
                      }`}
                      style={{ width: `${currentStress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-muted leading-tight">
                    {t('mental.dimensions.stressLevel.desc')}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-text pt-2 border-t border-slate-200 flex justify-between">
                  <span>Tonus sympathique</span>
                  <span className={currentStress < 35 ? 'text-status-normal' : 'text-amber-600'}>
                    {currentStress < 35 ? t('mental.dimensions.stressLevel.nominal') : currentStress < 65 ? t('mental.dimensions.stressLevel.watch') : t('mental.dimensions.stressLevel.action')}
                  </span>
                </div>
              </div>

              {/* 2. Mood Score */}
              <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Smile className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-text">
                        {t('mental.dimensions.moodScore.title')}
                      </span>
                    </div>
                    <StatusBadge status={getMoodStatus(currentMood)} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-serif text-3xl font-bold text-slate-text">{currentMood}</span>
                    <span className="text-xs text-slate-muted font-semibold">/ 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentMood >= 70 ? 'bg-status-normal' : currentMood >= 50 ? 'bg-status-watch' : 'bg-status-action'
                      }`}
                      style={{ width: `${currentMood}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-muted leading-tight">
                    {t('mental.dimensions.moodScore.desc')}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-text pt-2 border-t border-slate-200 flex justify-between">
                  <span>Valence affective</span>
                  <span className={currentMood >= 70 ? 'text-status-normal' : 'text-amber-600'}>
                    {currentMood >= 70 ? t('mental.dimensions.moodScore.nominal') : currentMood >= 50 ? t('mental.dimensions.moodScore.watch') : t('mental.dimensions.moodScore.action')}
                  </span>
                </div>
              </div>

              {/* 3. Workload Perception */}
              <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-text">
                        {t('mental.dimensions.workloadPerception.title')}
                      </span>
                    </div>
                    <StatusBadge status={getWorkloadStatus(currentWorkload)} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-serif text-3xl font-bold text-slate-text">{currentWorkload}</span>
                    <span className="text-xs text-slate-muted font-semibold">/ 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentWorkload <= 40 ? 'bg-status-normal' : currentWorkload <= 70 ? 'bg-status-watch' : 'bg-status-action'
                      }`}
                      style={{ width: `${currentWorkload}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-muted leading-tight">
                    {t('mental.dimensions.workloadPerception.desc')}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-text pt-2 border-t border-slate-200 flex justify-between">
                  <span>Index NASA-TLX</span>
                  <span className={currentWorkload <= 40 ? 'text-status-normal' : 'text-amber-600'}>
                    {currentWorkload <= 40 ? t('mental.dimensions.workloadPerception.nominal') : currentWorkload <= 70 ? t('mental.dimensions.workloadPerception.watch') : t('mental.dimensions.workloadPerception.action')}
                  </span>
                </div>
              </div>

              {/* 4. Time Perception */}
              <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-text">
                        {t('mental.dimensions.timePerception.title')}
                      </span>
                    </div>
                    <StatusBadge status={getTimeStatus(currentTime)} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-serif text-3xl font-bold text-slate-text">{currentTime}</span>
                    <span className="text-xs text-slate-muted font-semibold">/ 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentTime >= 40 && currentTime <= 60 ? 'bg-status-normal' : 'bg-status-watch'
                      }`}
                      style={{ width: `${currentTime}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-muted leading-tight">
                    {t('mental.dimensions.timePerception.desc')}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-text pt-2 border-t border-slate-200 flex justify-between">
                  <span>Écoulement temporel</span>
                  <span className={currentTime >= 40 && currentTime <= 60 ? 'text-status-normal' : 'text-amber-600'}>
                    {currentTime >= 40 && currentTime <= 60 ? t('mental.dimensions.timePerception.nominal') : t('mental.dimensions.timePerception.watch')}
                  </span>
                </div>
              </div>

              {/* 5. Communication with Others */}
              <div className="p-4 rounded-xl bg-surface border border-slate-border space-y-3 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-text">
                        {t('mental.dimensions.communicationWithOthers.title')}
                      </span>
                    </div>
                    <StatusBadge status={getCommStatus(currentComm)} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-serif text-3xl font-bold text-slate-text">{currentComm}</span>
                    <span className="text-xs text-slate-muted font-semibold">/ 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentComm >= 75 ? 'bg-status-normal' : currentComm >= 50 ? 'bg-status-watch' : 'bg-status-action'
                      }`}
                      style={{ width: `${currentComm}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-muted leading-tight">
                    {t('mental.dimensions.communicationWithOthers.desc')}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-text pt-2 border-t border-slate-200 flex justify-between">
                  <span>Cohésion d'équipage</span>
                  <span className={currentComm >= 75 ? 'text-status-normal' : 'text-amber-600'}>
                    {currentComm >= 75 ? t('mental.dimensions.communicationWithOthers.nominal') : currentComm >= 50 ? t('mental.dimensions.communicationWithOthers.watch') : t('mental.dimensions.communicationWithOthers.action')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section C: Sommeil & Récupération */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  <Moon className="w-4 h-4 text-accent" />
                  <span>{t('mental.sleepSection')}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-3xl font-bold text-slate-text">
                    {sleepScore?.value ?? 82}
                  </span>
                  <span className="text-sm text-slate-muted font-semibold">/ 100</span>
                  <StatusBadge status={sleepScore?.status || 'normal'} size="sm" />
                </div>
              </div>

              <button
                onClick={() => setIsSleepModalOpen(true)}
                className="min-h-[48px] px-5 py-2.5 rounded-xl border border-primary text-primary font-semibold text-sm hover:bg-primary-light transition-colors self-start sm:self-auto"
              >
                {t('mental.sleepLogButton')}
              </button>
            </div>

            {/* Breakdown of Sleep Components */}
            {sleepScore && (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-muted">
                  {t('mental.sleepComponents')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sleepScore.components.map((comp) => (
                    <div key={comp.key} className="p-3.5 rounded-xl bg-surface border border-slate-border space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-text capitalize">
                        <span>{comp.key.replace('_', ' ')}</span>
                        <span className="text-primary font-semibold">{comp.value} / 100</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, comp.value))}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-muted leading-tight">{comp.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7-Night Sleep Trend */}
            <div className="pt-2 border-t border-slate-border/80 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                {t('mental.sleepTrend')} (durée en heures)
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {sleepLogs.slice(-7).map((log, i) => (
                  <div key={i} className="text-center p-2.5 rounded-xl bg-surface border border-slate-border">
                    <div className="text-[11px] text-slate-muted font-medium">{log.date.slice(5)}</div>
                    <div className="font-serif font-bold text-base text-slate-text">{log.hours}h</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section D: Ce qui influence votre humeur (Couplage) */}
          <section className="bg-surface p-6 sm:p-8 rounded-2xl border border-slate-border space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <GitBranch className="w-4 h-4 text-accent" />
              <span>{t('mental.influencesTitle')} (modèle de couplage physiologique)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                t('mental.influences', { returnObjects: true }) as { title: string; text: string }[]
              ).map((inf, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-slate-border space-y-1.5">
                  <div className="text-sm font-bold text-slate-text flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span>{inf.title}</span>
                  </div>
                  <p className="text-xs text-slate-muted leading-relaxed">
                    {inf.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* MODAL: AJUSTER LES 5 DIMENSIONS COMPORTEMENTALES */}
      {isAdjustingDimensions && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-border shadow-xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary text-white">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-text">
                    {t('mental.dimensionsTitle')}
                  </h3>
                  <p className="text-xs text-slate-muted">
                    Auto-évaluation des 5 dimensions de santé comportementale.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustingDimensions(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Slider 1: Stress Level */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-text">
                  <span>{t('mental.dimensions.stressLevel.title')}</span>
                  <span className="font-mono font-bold text-primary">{tempStress} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempStress}
                  onChange={(e) => setTempStress(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0 (Serein)</span>
                  <span>50 (Modéré)</span>
                  <span>100 (Stress aigu)</span>
                </div>
              </div>

              {/* Slider 2: Mood Score */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-text">
                  <span>{t('mental.dimensions.moodScore.title')}</span>
                  <span className="font-mono font-bold text-primary">{tempMood} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempMood}
                  onChange={(e) => setTempMood(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0 (Moral bas)</span>
                  <span>50 (Neutre)</span>
                  <span>100 (Très positif)</span>
                </div>
              </div>

              {/* Slider 3: Workload Perception */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-text">
                  <span>{t('mental.dimensions.workloadPerception.title')}</span>
                  <span className="font-mono font-bold text-primary">{tempWorkload} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempWorkload}
                  onChange={(e) => setTempWorkload(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0 (Léger)</span>
                  <span>50 (Soutenu)</span>
                  <span>100 (Surcharge NASA-TLX)</span>
                </div>
              </div>

              {/* Slider 4: Time Perception */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-text">
                  <span>{t('mental.dimensions.timePerception.title')}</span>
                  <span className="font-mono font-bold text-primary">{tempTime} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempTime}
                  onChange={(e) => setTempTime(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0 (Temps figé / lent)</span>
                  <span>50 (Nominal)</span>
                  <span>100 (Temps accéléré)</span>
                </div>
              </div>

              {/* Slider 5: Communication with Others */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-text">
                  <span>{t('mental.dimensions.communicationWithOthers.title')}</span>
                  <span className="font-mono font-bold text-primary">{tempComm} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempComm}
                  onChange={(e) => setTempComm(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0 (Repli / Tension)</span>
                  <span>50 (Modérée)</span>
                  <span>100 (Cohésion optimale)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdjustingDimensions(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-border text-xs font-semibold text-slate-text hover:bg-slate-50 min-h-[44px]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveDimensions}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs min-h-[44px]"
              >
                {t('mental.saveDimensions')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Sleep Measurement Modal */}
      <MeasureModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        initialMetric="sleepQuality"
      />
    </div>
  );
};
