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
  Check
} from 'lucide-react';
import type { Status } from '../../types';

export const MentalPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    psychAssessments,
    sleepLogs,
    sleepScore,
    addPsychAssessment,
    logActivityEvent
  } = useAstroStore();

  const [mode, setMode] = useState<'overview' | 'questionnaire' | 'result'>('overview');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([4, 4, 4, 4, 4]);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);

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

  // Latest psych assessment
  const sortedPsych = [...psychAssessments].sort((a, b) => b.date.localeCompare(a.date));
  const latestPsych = sortedPsych[0] || {
    score: 84,
    status: 'normal' as Status,
    date: new Date().toISOString().split('T')[0]
  };

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
      // Completed all 5 questions -> go to result review screen
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
    await addPsychAssessment(answers);
    setMode('overview');
    setCurrentQIndex(0);
  };

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

      {/* 3. OVERVIEW VIEW: Last check card + 8-week history + Sleep + Influences */}
      {mode === 'overview' && (
        <>
          {/* Last Check Card */}
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

          {/* Section Sommeil & Récupération */}
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

          {/* Section: Ce qui influence votre humeur (Couplage) */}
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

      {/* Guided Sleep Measurement Modal */}
      <MeasureModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        initialMetric="sleepQuality"
      />
    </div>
  );
};
