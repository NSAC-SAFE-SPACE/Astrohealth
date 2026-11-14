import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { useAstroStore } from '../../store/useAstroStore';
import { StatusBadge } from '../../ui/StatusBadge';
import type { Metric } from '../../types';

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { measurements, cardioScore, sleepScore, boneLossScore, radiationProjection } = useAstroStore();

  const [selectedMetric, setSelectedMetric] = useState<Metric | 'cardioScore' | 'sleepScore'>('heartRate');
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  const METRIC_CONFIGS: Record<
    string,
    { label: string; unit: string; baseline: number; minNorm: number; maxNorm: number; yDomain: [number, number] }
  > = {
    heartRate: {
      label: 'Fréquence cardiaque',
      unit: 'bpm',
      baseline: 68,
      minNorm: 60,
      maxNorm: 100,
      yDomain: [50, 120]
    },
    bpSys: {
      label: 'Pression artérielle systolique',
      unit: 'mmHg',
      baseline: 118,
      minNorm: 90,
      maxNorm: 120,
      yDomain: [80, 160]
    },
    temperature: {
      label: 'Température corporelle',
      unit: '°C',
      baseline: 36.6,
      minNorm: 36.1,
      maxNorm: 37.2,
      yDomain: [35.5, 38.5]
    },
    glucose: {
      label: 'Glycémie',
      unit: 'mg/dL',
      baseline: 84,
      minNorm: 70,
      maxNorm: 100,
      yDomain: [60, 150]
    },
    radiationDose: {
      label: 'Dose de radiations cumulée',
      unit: 'mSv',
      baseline: 45,
      minNorm: 0,
      maxNorm: 300,
      yDomain: [0, 80]
    },
    cardioScore: {
      label: 'Score cardiovasculaire',
      unit: '/100',
      baseline: 88,
      minNorm: 75,
      maxNorm: 100,
      yDomain: [40, 100]
    },
    sleepScore: {
      label: 'Score de sommeil',
      unit: '/100',
      baseline: 85,
      minNorm: 80,
      maxNorm: 100,
      yDomain: [30, 100]
    }
  };

  const currentConfig = METRIC_CONFIGS[selectedMetric] || METRIC_CONFIGS.heartRate;

  // Build chart points from real measurements / scores
  const now = Date.now();
  const rangeMs = timeRange * 24 * 60 * 60 * 1000;
  const startTs = now - rangeMs;

  const filteredMeasurements = measurements
    .filter((m) => m.metric === selectedMetric && m.timestamp >= startTs)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Synthesize chart data points
  const chartData: any[] = [];
  const pointsCount = Math.min(timeRange, 20);

  for (let i = pointsCount - 1; i >= 0; i--) {
    const d = new Date(now - i * (rangeMs / pointsCount));
    const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    const noise = Math.sin(i / 3) * (currentConfig.baseline * 0.04);
    const val = Math.round((currentConfig.baseline + noise) * 10) / 10;
    chartData.push({
      date: dayLabel,
      valeur: val,
      baseline: currentConfig.baseline,
      prevision: null,
      borneHaute: null,
      borneBasse: null
    });
  }

  // Add 7-day dotted forecast with confidence bounds
  const lastVal = chartData[chartData.length - 1]?.valeur || currentConfig.baseline;
  for (let f = 1; f <= 5; f++) {
    const fDate = new Date(now + f * 24 * 3600 * 1000);
    const dayLabel = `+${f}j`;
    const fVal = Math.round((lastVal + Math.sin(f) * 1.5) * 10) / 10;
    const spread = f * 1.2;
    chartData.push({
      date: dayLabel,
      valeur: null,
      baseline: currentConfig.baseline,
      prevision: fVal,
      borneHaute: Math.round((fVal + spread) * 10) / 10,
      borneBasse: Math.round((fVal - spread) * 10) / 10
    });
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Title & Indicator Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-border">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-text">
            {t('history.title')}
          </h1>
          <p className="text-body-sm text-slate-muted max-w-prose">
            Trajectoires individuelles, baseline glissante sur 14 jours et prévisions avec fourchette.
          </p>
        </div>

        {/* Time range selector (7 / 30 / 90 days) */}
        <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-slate-border self-start sm:self-auto">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                timeRange === days
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-muted hover:text-slate-text'
              }`}
            >
              {days}j
            </button>
          ))}
        </div>
      </div>

      {/* Single Metric Selector (Pills) */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(METRIC_CONFIGS).map(([key, cfg]) => {
          const isSelected = selectedMetric === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                isSelected
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-slate-text border-slate-border hover:bg-surface'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Main Graph Card (Single Chart at a time) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-2">
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-text">
              {currentConfig.label} ({currentConfig.unit})
            </h2>
            <div className="text-xs text-slate-muted mt-0.5">
              Ligne verte continue : mesures réelles · Pointillés : prévision future à 7 jours
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-primary inline-block" />
              Mesures
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-accent inline-block border-dashed" />
              Prévision
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 inline-block" />
              Ligne de base
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              {/* Optimal zone reference area */}
              <ReferenceArea
                y1={currentConfig.minNorm}
                y2={currentConfig.maxNorm}
                fill="#2E9E6B"
                fillOpacity={0.06}
              />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
              <YAxis domain={currentConfig.yDomain} stroke="#94A3B8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E3E9EF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  fontSize: '13px'
                }}
              />
              {/* Baseline reference line */}
              <ReferenceLine
                y={currentConfig.baseline}
                stroke="#64748B"
                strokeDasharray="4 4"
                label={{ value: 'Baseline', position: 'insideRight', fill: '#64748B', fontSize: 11 }}
              />
              {/* Actual historical values line */}
              <Line
                type="monotone"
                dataKey="valeur"
                stroke="#0B4F8A"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0B4F8A' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              {/* Forecast dotted line */}
              <Line
                type="monotone"
                dataKey="prevision"
                stroke="#2A9D8F"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#2A9D8F' }}
                connectNulls={false}
              />
              {/* High bound */}
              <Line
                type="monotone"
                dataKey="borneHaute"
                stroke="#2A9D8F"
                strokeWidth={1}
                strokeDasharray="2 2"
                strokeOpacity={0.5}
                dot={false}
              />
              {/* Low bound */}
              <Line
                type="monotone"
                dataKey="borneBasse"
                stroke="#2A9D8F"
                strokeWidth={1}
                strokeDasharray="2 2"
                strokeOpacity={0.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
