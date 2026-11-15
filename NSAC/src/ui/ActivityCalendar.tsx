import React from 'react';
import { useTranslation } from 'react-i18next';
import { NasaDot, NasaDotState } from './NasaDot';
import type { ActivityEvent } from '../types';

interface ActivityCalendarProps {
  events: ActivityEvent[];
  className?: string;
}

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ events, className = '' }) => {
  const { t } = useTranslation();

  // 20 weeks * 7 days = 140 days
  const TOTAL_DAYS = 140;
  const WEEKS = 20;
  const DAYS_PER_WEEK = 7;

  // Build daily map: dateStr -> 0 | 1 | 2
  const eventMap = new Map<string, NasaDotState>();
  events.forEach((ev) => {
    const current = eventMap.get(ev.date) || 0;
    if (ev.type === 'measurement') {
      eventMap.set(ev.date, 2);
    } else if (ev.type === 'view') {
      if (current < 1) eventMap.set(ev.date, 1);
    }
  });

  const now = new Date();
  const days: { dateStr: string; daysAgo: number; state: NasaDotState }[] = [];

  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const state = eventMap.get(dateStr) || 0;
    days.push({ dateStr, daysAgo: i, state });
  }

  // Calculate current streak (consecutive days of state >= 1 ending today)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].state >= 1) {
      streak++;
    } else {
      break;
    }
  }

  const measurementCount = events.filter((e) => e.type === 'measurement').length;

  // Grid grouped by weeks (columns of 7 days)
  const columns: { dateStr: string; daysAgo: number; state: NasaDotState }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col = days.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK);
    columns.push(col);
  }

  return (
    <div className={`bg-surface p-6 rounded-xl border border-slate-border ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-2">
        <div>
          <h3 className="font-serif text-xl font-semibold text-slate-text">
            {t('home.activityTitle')}
          </h3>
          <p className="text-sm text-slate-muted">
            {t('home.activitySubtitle')}
          </p>
        </div>
        <div className="text-sm font-medium text-primary bg-primary-light px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
          {t('home.activityStreak', { count: measurementCount, streak })}
        </div>
      </div>

      {/* Grid container with smooth horizontal scroll */}
      <div className="overflow-x-auto py-5 scrollbar-thin">
        <div className="flex gap-2 min-w-max">
          {columns.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-2">
              {week.map((day) => {
                const label =
                  day.daysAgo === 0
                    ? `Aujourd'hui : ${day.state === 2 ? 'mesure effectuée' : day.state === 1 ? 'consultation' : 'aucune activité'}`
                    : `Il y a ${day.daysAgo} jours : ${day.state === 2 ? 'mesure effectuée' : day.state === 1 ? 'consultation' : 'aucune activité'}`;
                return (
                  <NasaDot
                    key={day.dateStr}
                    state={day.state}
                    size={26}
                    ariaLabel={label}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 3-State Legend */}
      <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-slate-muted border-t border-slate-border/60">
        <div className="flex items-center gap-2">
          <NasaDot state={0} size={18} />
          <span>{t('home.activityLegend0')}</span>
        </div>
        <div className="flex items-center gap-2">
          <NasaDot state={1} size={18} />
          <span>{t('home.activityLegend1')}</span>
        </div>
        <div className="flex items-center gap-2">
          <NasaDot state={2} size={18} />
          <span className="font-semibold text-slate-text">{t('home.activityLegend2')}</span>
        </div>
      </div>
    </div>
  );
};
