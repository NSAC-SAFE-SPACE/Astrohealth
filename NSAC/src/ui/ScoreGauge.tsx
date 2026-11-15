import React from 'react';
import { StatusBadge } from './StatusBadge';
import type { Status } from '../types';
import { useTranslation } from 'react-i18next';

interface ScoreGaugeProps {
  score: number; // 0-100
  status: Status;
  summaryWord: string;
  adviceSentence: string;
  scoreDetails: string[];
  onStatusClick: () => void;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  status,
  summaryWord,
  adviceSentence,
  scoreDetails,
  onStatusClick
}) => {
  const { t } = useTranslation();
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = {
    normal: '#2E9E6B',
    watch: '#D9A400',
    action: '#E07B00',
    contact_flight_surgeon: '#C93C3C'
  }[status] || '#0B4F8A';

  return (
    <div className="bg-surface p-6 rounded-xl border border-slate-border flex flex-col md:flex-row items-center gap-6">
      <div
        className="relative group flex items-center justify-center shrink-0 rounded-full"
        tabIndex={0}
        aria-describedby="global-score-details"
        aria-label={t('home.scoreDetailsTitle')}
      >
        <svg width="140" height="140" className="transform -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#E3E9EF"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-serif text-3xl font-bold text-slate-text">{score}</span>
          <span className="text-xs uppercase tracking-wider text-slate-muted font-semibold">/ 100</span>
        </div>
        <div
          id="global-score-details"
          role="tooltip"
          className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 transition-opacity absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-96 rounded-xl border border-slate-border bg-white p-4 text-left shadow-lg"
        >
          <p className="text-sm font-bold text-slate-text mb-2">{t('home.scoreDetailsTitle')}</p>
          <ul className="space-y-1.5 text-xs font-normal text-slate-muted">
            {scoreDetails.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 max-w-prose">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          <span className="font-serif text-2xl font-bold text-slate-text capitalize">{summaryWord}</span>
          <button
            type="button"
            onClick={onStatusClick}
            className="rounded-full focus-visible:outline"
            aria-label={t('home.openStatusDetails', { status: summaryWord })}
          >
            <StatusBadge status={status} size="sm" />
          </button>
        </div>
        <p className="text-body text-slate-muted leading-relaxed">
          {adviceSentence}
        </p>
      </div>
    </div>
  );
};
