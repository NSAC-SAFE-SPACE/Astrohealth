import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../ui/StatusBadge';
import { MeasureModal } from '../../ui/MeasureModal';
import { useAstroStore } from '../../store/useAstroStore';
import {
  Brain,
  Moon,
  TrendingUp,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Smile,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { WHO5_QUESTIONS, WHO5_CHOICES, evaluatePsychStatus } from '../../engine/scores/psych';

export const MentalPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    psychAssessments,
    sleepLogs,
    sleepScore,
    addPsychAssessment
  } = useAstroStore();

  const [isQuestionnaireActive, setIsQuestionnaireActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([4, 4, 4, 4, 4]);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);

  // Latest psych assessment
  const sortedPsych = [...psychAssessments].sort((a, b) => b.date.localeCompare(a.date));
  const latestPsych = sortedPsych[0] || {
    score: 84,
    status: 'normal',
    date: new Date().toISOString().split('T')[0]
  };

  const last8Assessments = sortedPsych.slice(0, 8).reverse();

  // Handle single question answer selection and auto-advance
  const handleSelectAnswer = (pts: number) => {
    const nextAnswers = [...answers];
    nextAnswers[currentQIndex] = pts;
    setAnswers(nextAnswers);

    if (currentQIndex < WHO5_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQIndex((prev) => prev + 1);
      }, 200);
    } else {
      // Finished all 5 questions
      setTimeout(async () => {
        await addPsychAssessment(nextAnswers);
        setIsQuestionnaireActive(false);
        setCurrentQIndex(0);
      }, 300);
    }
  };

  const currentEval = evaluatePsychStatus(latestPsych.score);

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Title */}
      <div className="pb-4 border-b border-slate-border">
        <h1 className="font-serif text-3xl font-bold text-slate-text">
          {t('mental.title')}
        </h1>
        <p className="text-body-sm text-slate-muted max-w-prose">
          Évaluation autonome du moral, de la vitalité psychologique et de la récupération du sommeil.
        </p>
      </div>

      {/* QUESTIONNAIRE OMS-5 INTERACTIVE FLOW */}
      {isQuestionnaireActive ? (
        <section className="bg-surface p-6 sm:p-8 rounded-2xl border border-primary/30 shadow-md space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-muted uppercase tracking-wider">
              <span>{t('mental.questionProgress', { current: currentQIndex + 1, total: WHO5_QUESTIONS.length })}</span>
              <span>{Math.round(((currentQIndex + 1) / WHO5_QUESTIONS.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentQIndex + 1) / WHO5_QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-2 py-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">
              {t('mental.questionPrompt')}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-text max-w-prose">
              « {WHO5_QUESTIONS[currentQIndex]} »
            </h2>
          </div>

          {/* Choices list (one-click selection with auto-advance) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WHO5_CHOICES.map((choice) => (
              <button
                key={choice.points}
                onClick={() => handleSelectAnswer(choice.points)}
                className="min-h-[52px] px-5 py-3.5 rounded-xl border border-slate-border bg-white hover:bg-primary-light hover:border-primary text-slate-text font-medium text-base text-left flex items-center justify-between transition-all group shadow-xs"
              >
                <span>{choice.label}</span>
                <span className="w-6 h-6 rounded-full bg-surface group-hover:bg-primary group-hover:text-white text-xs font-semibold text-slate-muted flex items-center justify-center transition-colors">
                  {choice.points}
                </span>
              </button>
            ))}
          </div>

          {/* Stepper controls */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-border">
            {currentQIndex > 0 ? (
              <button
                onClick={() => setCurrentQIndex((prev) => prev - 1)}
                className="px-4 py-2 rounded-lg border border-slate-border text-sm font-medium text-slate-text flex items-center gap-2 hover:bg-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('mental.prevQuestion')}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => setIsQuestionnaireActive(false)}
              className="text-xs text-slate-muted hover:text-slate-text underline"
            >
              Interrompre le bilan
            </button>
          </div>
        </section>
      ) : (
        /* OVERVIEW CARD: Last assessment + 8 last results history */
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
                setIsQuestionnaireActive(true);
                setCurrentQIndex(0);
              }}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover shadow-xs transition-colors self-start sm:self-auto"
            >
              <span>{t('mental.startAssessment')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Plain-language explanation & actions */}
          <div className="space-y-3 max-w-prose">
            <h3 className="font-serif text-lg font-bold text-slate-text">
              {currentEval.title}
            </h3>
            <p className="text-body-sm text-slate-text leading-relaxed">
              {currentEval.explanation}
            </p>
            <div className="space-y-1.5 pt-1">
              {currentEval.actions.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-text">
                  <CheckCircle2 className="w-4 h-4 text-status-normal shrink-0 mt-0.5" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 8 Last Assessments Bar Chart */}
          <div className="pt-4 border-t border-slate-border space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              {t('mental.historyTitle')} (évolution hebdomadaire)
            </div>
            <div className="flex items-end gap-3 h-28 pt-4">
              {last8Assessments.map((item, idx) => {
                const heightPercent = Math.max(10, item.score);
                const barColor =
                  item.status === 'normal'
                    ? 'bg-status-normal'
                    : item.status === 'watch'
                    ? 'bg-status-watch'
                    : item.status === 'action'
                    ? 'bg-status-action'
                    : 'bg-status-contact_flight_surgeon';
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[11px] font-semibold text-slate-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.score}
                    </div>
                    <div
                      className={`w-full rounded-t-md ${barColor} transition-all duration-300`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-slate-400">
                      S{idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION SOMMEIL : SCORE DE QUALITÉ DU SOMMEIL */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <Moon className="w-4 h-4 text-accent" />
              <span>{t('mental.sleepSection')}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl font-bold text-slate-text">
                {sleepScore?.value ?? 85}
              </span>
              <span className="text-sm text-slate-muted font-semibold">/ 100</span>
              <StatusBadge status={sleepScore?.status || 'normal'} size="sm" />
            </div>
          </div>

          <button
            onClick={() => setIsSleepModalOpen(true)}
            className="px-5 py-2.5 rounded-xl border border-primary text-primary font-semibold text-sm hover:bg-primary-light transition-colors self-start sm:self-auto"
          >
            {t('mental.sleepLogButton')}
          </button>
        </div>

        {/* Breakdown of Sleep Components */}
        {sleepScore && (
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-muted">
              Composantes du score de sommeil (durée, continuité, régularité, ressenti)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sleepScore.components.map((comp) => (
                <div key={comp.key} className="p-3.5 rounded-xl bg-surface border border-slate-border space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-text capitalize">
                    <span>{comp.key.replace('_', ' ')}</span>
                    <span className="text-primary">{comp.value} / 100</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, comp.value))}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-muted leading-tight">{comp.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-Night Trend preview */}
        <div className="pt-2 border-t border-slate-border/80">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted mb-2">
            {t('mental.sleepTrend')} (durée en heures)
          </div>
          <div className="flex items-center gap-2">
            {sleepLogs.slice(0, 7).map((log, i) => (
              <div key={i} className="flex-1 text-center p-2 rounded-lg bg-surface border border-slate-border">
                <div className="text-[11px] text-slate-muted">{log.date.slice(5)}</div>
                <div className="font-bold text-sm text-slate-text">{log.hours} h</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COUPLING: Ce qui influence votre humeur */}
      <section className="bg-surface p-6 rounded-2xl border border-slate-border space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
          <GitBranch className="w-4 h-4 text-accent" />
          <span>{t('mental.influencesTitle')} (modèle de couplage physiologique)</span>
        </div>
        <ul className="space-y-2 text-body-sm text-slate-text">
          <li className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
            <span><strong>Sommeil récupérateur :</strong> Une nuit avec un score &gt;80 stabilise positivement l'humeur du lendemain (+12 %).</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
            <span><strong>Exercice régulier :</strong> La séance quotidienne de 2h d'entraînement stimule la sécrétion d'endorphines et réduit le stress d'isolement.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-status-watch mt-2 shrink-0" />
            <span><strong>Confinement et distance :</strong> La baisse de variété environnementale requiert des rituels de communication réguliers avec l'équipage.</span>
          </li>
        </ul>
      </section>

      {/* Guided Sleep Log modal */}
      <MeasureModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        initialMetric="sleepQuality"
      />
    </div>
  );
};
