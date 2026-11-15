import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Compass, RotateCcw } from 'lucide-react';
import {
  summarizeOrientationResponses,
  summarizeReactionTimes,
  type OrientationTestSummary,
  type ReactionTestSummary
} from '../services/cognitiveTests';

export type CognitiveTestResult =
  | { type: 'reaction'; summary: ReactionTestSummary; falseStarts: number }
  | { type: 'orientation'; summary: OrientationTestSummary };

interface CognitiveTestPanelProps {
  type: 'reaction' | 'orientation';
  onComplete: (result: CognitiveTestResult) => void;
  onReset: () => void;
}

const PRACTICE_TRIALS = 2;
const TRIAL_COUNT = 8;
const DIRECTIONS = ['north', 'northEast', 'east', 'southEast', 'south', 'southWest', 'west', 'northWest'] as const;

export const CognitiveTestPanel: React.FC<CognitiveTestPanelProps> = ({ type, onComplete, onReset }) => {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<'ready' | 'waiting' | 'stimulus' | 'practice' | 'running' | 'complete'>('ready');
  const [trial, setTrial] = useState(0);
  const [targetDirection, setTargetDirection] = useState(0);
  const [falseStarts, setFalseStarts] = useState(0);
  const [practiceRemaining, setPracticeRemaining] = useState(0);
  const [reactionSummary, setReactionSummary] = useState<ReactionTestSummary | null>(null);
  const [orientationSummary, setOrientationSummary] = useState<OrientationTestSummary | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stimulusAt = useRef(0);
  const stimulusActive = useRef(false);
  const orientationStartedAt = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const correctAnswers = useRef<boolean[]>([]);
  const orientationTimes = useRef<number[]>([]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    reactionTimes.current = [];
    correctAnswers.current = [];
    orientationTimes.current = [];
    stimulusActive.current = false;
    setTrial(0);
    setFalseStarts(0);
    setPracticeRemaining(0);
    setReactionSummary(null);
    setOrientationSummary(null);
    setPhase('ready');
    onReset();
  };

  const scheduleReactionTrial = (nextTrial: number) => {
    setTrial(nextTrial);
    setPhase('waiting');
    timer.current = setTimeout(() => {
      stimulusAt.current = performance.now();
      stimulusActive.current = true;
      setPhase('stimulus');
    }, 900 + Math.random() * 1500);
  };

  const start = () => {
    if (type === 'reaction') {
      reactionTimes.current = [];
      setFalseStarts(0);
      setPracticeRemaining(PRACTICE_TRIALS);
      stimulusActive.current = false;
      scheduleReactionTrial(1);
      return;
    }

    correctAnswers.current = [];
    orientationTimes.current = [];
    setTrial(1);
    setTargetDirection(Math.floor(Math.random() * DIRECTIONS.length));
    setPhase('practice');
  };

  const recordReaction = () => {
    if (!stimulusActive.current) {
      if (phase === 'waiting') setFalseStarts((count) => count + 1);
      return;
    }

    stimulusActive.current = false;
    const elapsed = performance.now() - stimulusAt.current;
    if (practiceRemaining > 0) {
      const remaining = practiceRemaining - 1;
      setPracticeRemaining(remaining);
      if (remaining === 0) setFalseStarts(0);
      timer.current = setTimeout(() => scheduleReactionTrial(1), 500);
      return;
    }

    reactionTimes.current.push(elapsed);
    if (reactionTimes.current.length >= TRIAL_COUNT) {
      const summary = summarizeReactionTimes(reactionTimes.current);
      setReactionSummary(summary);
      setPhase('complete');
      onComplete({ type: 'reaction', summary, falseStarts });
      return;
    }

    setPhase('waiting');
    timer.current = setTimeout(() => scheduleReactionTrial(trial + 1), 500);
  };

  const recordDirection = (direction: number) => {
    const isCorrect = direction === targetDirection;
    if (phase === 'practice') {
      setTrial(1);
      setTargetDirection(Math.floor(Math.random() * DIRECTIONS.length));
      orientationStartedAt.current = performance.now();
      setPhase('running');
      return;
    }

    correctAnswers.current.push(isCorrect);
    orientationTimes.current.push(performance.now() - orientationStartedAt.current);

    if (trial >= TRIAL_COUNT) {
      const summary = summarizeOrientationResponses(correctAnswers.current, orientationTimes.current);
      setOrientationSummary(summary);
      setPhase('complete');
      onComplete({ type: 'orientation', summary });
      return;
    }

    setTrial((current) => current + 1);
    setTargetDirection(Math.floor(Math.random() * DIRECTIONS.length));
    orientationStartedAt.current = performance.now();
  };

  const directions = DIRECTIONS.map((direction) => ({
    key: direction,
    label: t(`measurementModal.cognitive.directions.${direction}`)
  }));

  return (
    <section className="space-y-4 rounded-xl border border-slate-border bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary-light p-2 text-primary">
          {type === 'reaction' ? <Activity className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
        </div>
        <div>
          <h4 className="font-semibold text-slate-text">
            {t(type === 'reaction' ? 'measurementModal.cognitive.reactionTitle' : 'measurementModal.cognitive.orientationTitle')}
          </h4>
          <p className="mt-1 text-sm text-slate-muted">
            {t(type === 'reaction' ? 'measurementModal.cognitive.reactionInstructions' : 'measurementModal.cognitive.orientationInstructions')}
          </p>
        </div>
      </div>

      <p className="rounded-lg border border-slate-border bg-white px-3 py-2 text-xs text-slate-muted">
        {t('measurementModal.cognitive.disclaimer')}
      </p>

      {type === 'reaction' ? (
        <div className="space-y-3 text-center">
          {phase === 'ready' && (
            <button
              type="button"
              onClick={start}
              className="min-h-12 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {t('measurementModal.cognitive.start')}
            </button>
          )}
          {phase === 'waiting' && (
            <button
              type="button"
              onClick={recordReaction}
              className="flex min-h-28 w-full items-center justify-center rounded-xl border border-slate-border bg-white text-sm font-semibold text-slate-muted"
              aria-live="polite"
            >
              {t('measurementModal.cognitive.wait')}
            </button>
          )}
          {phase === 'stimulus' && (
            <button
              type="button"
              autoFocus
              onClick={recordReaction}
              className="min-h-28 w-full rounded-xl bg-accent text-xl font-bold text-white transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={t('measurementModal.cognitive.tapNow')}
            >
              {t('measurementModal.cognitive.tapNow')}
            </button>
          )}
          {phase === 'running' && (
            <div className="flex min-h-28 items-center justify-center rounded-xl border border-slate-border bg-white text-sm text-slate-muted">
              {t('measurementModal.cognitive.wait')}
            </div>
          )}
          {phase === 'complete' && reactionSummary && (
            <div className="rounded-xl border border-status-normal/30 bg-white p-4 text-left">
              <p className="text-sm font-semibold text-slate-text">
                {t('measurementModal.cognitive.reactionResult', {
                  median: reactionSummary.medianMs,
                  lapses: reactionSummary.lapses,
                  trials: reactionSummary.trialCount
                })}
              </p>
              {falseStarts > 0 && (
                <p className="mt-1 text-xs text-slate-muted">
                  {t('measurementModal.cognitive.falseStarts', { count: falseStarts })}
                </p>
              )}
            </div>
          )}
          {phase !== 'ready' && (
            <p className="text-xs text-slate-muted" aria-live="polite">
              {practiceRemaining > 0
                ? t('measurementModal.cognitive.practiceProgress', {
                    current: PRACTICE_TRIALS - practiceRemaining + 1,
                    total: PRACTICE_TRIALS
                  })
                : t('measurementModal.cognitive.progress', { current: Math.min(trial, TRIAL_COUNT), total: TRIAL_COUNT })}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {phase === 'ready' && (
            <div className="text-center">
              <button
                type="button"
                onClick={start}
                className="min-h-12 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t('measurementModal.cognitive.start')}
              </button>
            </div>
          )}
          {(phase === 'practice' || phase === 'running') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-muted">
                <span>
                  {phase === 'practice'
                    ? t('measurementModal.cognitive.practice')
                    : t('measurementModal.cognitive.progress', { current: trial, total: TRIAL_COUNT })}
                </span>
                <span>{t('measurementModal.cognitive.chooseDirection')}</span>
              </div>
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-slate-border bg-white shadow-xs">
                <svg viewBox="0 0 100 100" className="h-24 w-24" role="img" aria-label={t('measurementModal.cognitive.directionArrow')}>
                  <path
                    d="M50 8 L64 57 L50 49 L36 57 Z"
                    fill="#0B4F8A"
                    stroke="#083B68"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    transform={`rotate(${targetDirection * 45} 50 50)`}
                  />
                  <circle cx="50" cy="50" r="3" fill="#D9A400" />
                </svg>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {directions.map((direction, index) => (
                  <button
                    type="button"
                    key={direction.key}
                    onClick={() => recordDirection(index)}
                    className="min-h-11 rounded-lg border border-slate-border bg-white px-2 text-sm font-semibold text-slate-text hover:border-primary hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {direction.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'complete' && orientationSummary && (
            <div className="rounded-xl border border-status-normal/30 bg-white p-4">
              <p className="text-sm font-semibold text-slate-text">
                {t('measurementModal.cognitive.orientationResult', {
                  correct: orientationSummary.correctCount,
                  trials: orientationSummary.trialCount,
                  accuracy: orientationSummary.accuracy.toLocaleString(i18n.language),
                  time: orientationSummary.meanResponseMs
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {phase === 'complete' && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-border bg-white px-3 py-2 text-sm font-medium text-slate-text hover:bg-surface"
        >
          <RotateCcw className="h-4 w-4" />
          {t('measurementModal.cognitive.retry')}
        </button>
      )}
    </section>
  );
};
