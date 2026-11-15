import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActivityCalendar } from '../../ui/ActivityCalendar';
import { ScoreGauge } from '../../ui/ScoreGauge';
import { StatusBadge } from '../../ui/StatusBadge';
import { MeasureModal } from '../../ui/MeasureModal';
import { useAstroStore } from '../../store/useAstroStore';
import { AstronautMascot } from '../../ui/AstronautMascot';
import { PlusCircle, ArrowRight, ShieldCheck, Heart, Moon, Zap, User } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    astronaut,
    activityEvents,
    globalStatus,
    globalScore,
    cardioScore,
    sleepScore,
    boneLossScore,
    radiationProjection
  } = useAstroStore();

  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);

  // Status summary word and advice sentence from i18n
  const summaryWord = t(`home.summaryWords.${globalStatus}`, { defaultValue: t('status.normal') });
  const adviceSentence = t(`home.adviceSentences.${globalStatus}`, {
    defaultValue: 'Tous les paramètres sont dans les normes orbitales.'
  });

  return (
    <div className="relative isolate space-y-10 sm:space-y-12 max-w-4xl mx-auto">
      <AstronautMascot />
      {/* 1. Header Profile Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-border">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface shrink-0 shadow-xs flex items-center justify-center">
            {astronaut.photo ? (
              <img
                src={astronaut.photo}
                alt={`Photo de ${astronaut.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-primary/60" />
            )}
          </div>
          <div className="space-y-1 max-w-prose">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <span className="block">{astronaut.mission.replace('_', ' ')}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-text">
              {t('home.greeting', { name: astronaut.name })}
            </h1>
          </div>
        </div>

        {/* Priority Status Callout */}
        <div className="self-start sm:self-center">
          <StatusBadge status={globalStatus} size="lg" />
        </div>
      </section>

      {/* 2. NASA Activity Calendar Section (GitHub-style 20 weeks x 7 days) */}
      <section className="space-y-3">
        <ActivityCalendar events={activityEvents} />
      </section>

      {/* 3. Main Condition Card (Score Gauge: ring, badge, one word, advice sentence) */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-slate-text">
          {t('home.statusCardTitle')}
        </h2>
        <ScoreGauge
          score={globalScore}
          status={globalStatus}
          summaryWord={summaryWord}
          adviceSentence={adviceSentence}
        />
      </section>

      {/* 4. Primary Action Buttons */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <button
          onClick={() => setIsMeasureModalOpen(true)}
          className="flex-1 min-h-[52px] px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center gap-2.5 hover:bg-primary-hover shadow-xs transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('home.measureButton')}</span>
        </button>

        <button
          onClick={() => navigate('/corps')}
          className="flex-1 min-h-[52px] px-6 py-3.5 rounded-xl bg-surface border border-slate-border text-slate-text font-semibold text-base flex items-center justify-center gap-2.5 hover:bg-slate-border/40 transition-colors"
        >
          <span>{t('home.seeBodyButton')}</span>
          <ArrowRight className="w-5 h-5 text-primary" />
        </button>
      </section>

      {/* 5. Sub-System Quick Glance Cards (Navigation to /corps & /mental) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/corps')}
          className="p-4 rounded-xl border border-slate-border bg-surface hover:border-primary/50 cursor-pointer transition-all space-y-2 min-h-[96px]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/corps')}
        >
          <div className="flex items-center justify-between">
            <Heart className="w-5 h-5 text-primary" />
            <StatusBadge status={cardioScore?.status || 'normal'} size="sm" showIcon={false} />
          </div>
          <div className="text-xs text-slate-muted uppercase tracking-wider font-semibold">
            {t('body.zones.heart')}
          </div>
          <div className="font-serif text-xl font-bold text-slate-text">
            {cardioScore?.value || '--'} / 100
          </div>
        </div>

        <div
          onClick={() => navigate('/mental')}
          className="p-4 rounded-xl border border-slate-border bg-surface hover:border-primary/50 cursor-pointer transition-all space-y-2 min-h-[96px]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/mental')}
        >
          <div className="flex items-center justify-between">
            <Moon className="w-5 h-5 text-accent" />
            <StatusBadge status={sleepScore?.status || 'normal'} size="sm" showIcon={false} />
          </div>
          <div className="text-xs text-slate-muted uppercase tracking-wider font-semibold">
            {t('mental.sleepSection')}
          </div>
          <div className="font-serif text-xl font-bold text-slate-text">
            {sleepScore?.value || '--'} / 100
          </div>
        </div>

        <div
          onClick={() => navigate('/corps')}
          className="p-4 rounded-xl border border-slate-border bg-surface hover:border-primary/50 cursor-pointer transition-all space-y-2 min-h-[96px]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/corps')}
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <StatusBadge status={boneLossScore?.status || 'normal'} size="sm" showIcon={false} />
          </div>
          <div className="text-xs text-slate-muted uppercase tracking-wider font-semibold">
            {t('body.zones.bone')}
          </div>
          <div className="font-serif text-xl font-bold text-slate-text">
            {boneLossScore ? `-${boneLossScore.value}%` : '--'}
          </div>
        </div>

        <div
          onClick={() => navigate('/corps')}
          className="p-4 rounded-xl border border-slate-border bg-surface hover:border-primary/50 cursor-pointer transition-all space-y-2 min-h-[96px]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/corps')}
        >
          <div className="flex items-center justify-between">
            <Zap className="w-5 h-5 text-amber-600" />
            <StatusBadge status={radiationProjection?.status || 'normal'} size="sm" showIcon={false} />
          </div>
          <div className="text-xs text-slate-muted uppercase tracking-wider font-semibold">
            {t('body.zones.radiation')}
          </div>
          <div className="font-serif text-xl font-bold text-slate-text">
            {radiationProjection ? `${radiationProjection.currentCumulative_mSv} mSv` : '--'}
          </div>
        </div>
      </section>

      {/* Guided Measure Stepper Modal */}
      <MeasureModal
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
      />
    </div>
  );
};
