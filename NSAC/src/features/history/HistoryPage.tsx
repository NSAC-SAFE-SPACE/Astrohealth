import React, { useState, useEffect, useMemo } from 'react';
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
import {
  HeartRateForecaster,
  BloodPressureForecaster,
  TemperatureForecaster,
  GlucoseForecaster,
  BoneMassForecaster,
  MoodForecaster
} from '../../engine';
import { TrendingUp, Activity, HelpCircle, Calendar, ShieldCheck } from 'lucide-react';
import { BODY_MEASURE_FIELDS } from '../../engine/config/bodyMeasures';

export type HistoryMetricKey =
  | 'heartRate'
  | 'bpSys'
  | 'bpDia'
  | 'temperature'
  | 'glucose'
  | 'boneLoss'
  | 'sleep'
  | 'mood'
  | 'stress'
  | 'radiationDose'
  | 'boneZScore'
  | 'muscleStrengthLoss'
  | 'spo2'
  | 'radiationDoseDaily'
  | 'intraocularPressure'
  | 'urineSpecificGravity'
  | 'co2PartialPressure'
  | 'fastingGlucose';

export const HistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language.startsWith('fr');

  const {
    measurements,
    sleepLogs,
    psychAssessments,
    boneRecords,
    missionDay,
    logActivityEvent
  } = useAstroStore();

  const [selectedMetric, setSelectedMetric] = useState<HistoryMetricKey>('heartRate');
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  // Register view event on page load
  useEffect(() => {
    logActivityEvent('view');
  }, [logActivityEvent]);

  // Metric configurations
  const METRIC_CONFIGS: Partial<Record<
    HistoryMetricKey,
    {
      labelKey: string;
      unit: string;
      fallbackBaseline: number;
      minNorm: number;
      maxNorm: number;
      yDomain: [number, number];
    }
  >> = {
    glucose: {
      labelKey: 'history.metrics.glucose',
      unit: 'mg/dL',
      fallbackBaseline: 85,
      minNorm: 70,
      maxNorm: 100,
      yDomain: [60, 140]
    },
    boneLoss: {
      labelKey: 'history.metrics.boneLoss',
      unit: '%',
      fallbackBaseline: 2.1,
      minNorm: 0,
      maxNorm: 4.5,
      yDomain: [0, 8]
    },
    sleep: {
      labelKey: 'history.metrics.sleep',
      unit: 'h',
      fallbackBaseline: 7.5,
      minNorm: 7.0,
      maxNorm: 9.0,
      yDomain: [4, 11]
    },
    mood: {
      labelKey: 'history.metrics.mood',
      unit: '/100',
      fallbackBaseline: 76,
      minNorm: 68,
      maxNorm: 100,
      yDomain: [20, 100]
    },
    stress: {
      labelKey: 'history.metrics.stress',
      unit: '/100',
      fallbackBaseline: 24,
      minNorm: 0,
      maxNorm: 35,
      yDomain: [0, 100]
    }
  };

  BODY_MEASURE_FIELDS.forEach((field) => {
    METRIC_CONFIGS[field.metric as HistoryMetricKey] = {
      labelKey: field.label,
      unit: field.unit,
      fallbackBaseline: field.nominal.min !== undefined && field.nominal.max !== undefined
        ? (field.nominal.min + field.nominal.max) / 2
        : field.nominal.min ?? field.nominal.max ?? 0,
      minNorm: field.nominal.min ?? field.plausibility.min,
      maxNorm: field.nominal.max ?? field.plausibility.max,
      yDomain: [field.plausibility.min, field.plausibility.max]
    };
  });

  const currentConfig = METRIC_CONFIGS[selectedMetric]!;

  // Build real time series and forecasts
  const { chartData, personalBaseline, forecastSummary } = useMemo(() => {
    const now = Date.now();
    const rangeMs = timeRange * 24 * 60 * 60 * 1000;
    const startTs = now - rangeMs;

    interface RawPoint {
      timestamp: number;
      value: number;
      dateStr: string;
    }

    const rawPoints: RawPoint[] = [];

    if (selectedMetric === 'sleep') {
      sleepLogs.forEach((log) => {
        const ts = new Date(log.date).getTime();
        if (ts >= startTs) {
          rawPoints.push({ timestamp: ts, value: log.hours, dateStr: log.date.slice(5) });
        }
      });
    } else if (selectedMetric === 'mood') {
      psychAssessments.forEach((p) => {
        const ts = new Date(p.date).getTime();
        if (ts >= startTs) {
          rawPoints.push({ timestamp: ts, value: p.score, dateStr: p.date.slice(5) });
        }
      });
    } else if (selectedMetric === 'stress') {
      psychAssessments.forEach((p) => {
        const ts = new Date(p.date).getTime();
        if (ts >= startTs) {
          rawPoints.push({ timestamp: ts, value: p.stressLevel ?? 24, dateStr: p.date.slice(5) });
        }
      });
    } else if (selectedMetric === 'boneLoss') {
      boneRecords.forEach((b) => {
        const ts = new Date(b.date).getTime();
        if (ts >= startTs) {
          rawPoints.push({ timestamp: ts, value: b.valueGcm2, dateStr: b.date.slice(5) });
        }
      });
      // Also look into measurements for boneProxy
      measurements
        .filter((m) => m.metric === 'boneProxy' && m.timestamp >= startTs)
        .forEach((m) => {
          rawPoints.push({
            timestamp: m.timestamp,
            value: m.value,
            dateStr: new Date(m.timestamp).toISOString().split('T')[0].slice(5)
          });
        });
    } else {
      const metricName = selectedMetric;

      measurements
        .filter((m) => m.metric === metricName && m.timestamp >= startTs)
        .forEach((m) => {
          rawPoints.push({
            timestamp: m.timestamp,
            value: m.value,
            dateStr: new Date(m.timestamp).toISOString().split('T')[0].slice(5)
          });
        });
    }

    // Sort chronologically
    rawPoints.sort((a, b) => a.timestamp - b.timestamp);
    if (rawPoints.length === 0) {
      return { chartData: [], personalBaseline: null, forecastSummary: null };
    }

    // Compute rolling 14-day baseline
    const fourteenDaysMs = 14 * 24 * 3600 * 1000;
    const baselinePoints = rawPoints.filter((p) => p.timestamp >= now - fourteenDaysMs);
    const computedBaseline =
      baselinePoints.length > 0
        ? Math.round((baselinePoints.reduce((sum, p) => sum + p.value, 0) / baselinePoints.length) * 10) / 10
        : currentConfig.fallbackBaseline;

    // Resample/group points by days if dense
    const aggregatedMap = new Map<string, { sum: number; count: number }>();
    rawPoints.forEach((p) => {
      const existing = aggregatedMap.get(p.dateStr) || { sum: 0, count: 0 };
      existing.sum += p.value;
      existing.count += 1;
      aggregatedMap.set(p.dateStr, existing);
    });

    const historicalData: any[] = [];
    aggregatedMap.forEach((entry, dateStr) => {
      historicalData.push({
        date: dateStr,
        valeur: Math.round((entry.sum / entry.count) * 10) / 10,
        baseline: computedBaseline,
        prevision: null,
        borneHaute: null,
        borneBasse: null
      });
    });

    // Calculate 7-day future prediction with forecaster
    const latestVal = historicalData[historicalData.length - 1]?.valeur || computedBaseline;
    let predVal = latestVal;
    let predLow = latestVal * 0.96;
    let predHigh = latestVal * 1.04;
    let driverNote = '';

    if (selectedMetric === 'heartRate') {
      const f = new HeartRateForecaster(latestVal);
      const res = f.predict('7d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
      if (res.drivers.length > 0) driverNote = isFrench ? res.drivers[0].explanation : res.drivers[0].explanationEn || '';
    } else if (selectedMetric === 'bpSys') {
      const f = new BloodPressureForecaster(latestVal, 80);
      const res = f.predict('7d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
      if (res.drivers.length > 0) driverNote = isFrench ? res.drivers[0].explanation : res.drivers[0].explanationEn || '';
    } else if (selectedMetric === 'temperature') {
      const f = new TemperatureForecaster(latestVal);
      const res = f.predict('7d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
    } else if (selectedMetric === 'glucose') {
      const f = new GlucoseForecaster(latestVal);
      const res = f.predict('7d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
    } else if (selectedMetric === 'boneLoss') {
      const f = new BoneMassForecaster(missionDay, 60);
      const res = f.predict('30d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
    } else if (selectedMetric === 'mood') {
      const f = new MoodForecaster(latestVal);
      const res = f.predict('7d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
    } else if (selectedMetric === 'stress') {
      predVal = Math.round(latestVal * 10) / 10;
      predLow = Math.max(0, Math.round((latestVal - 5) * 10) / 10);
      predHigh = Math.min(100, Math.round((latestVal + 6) * 10) / 10);
    } else if (selectedMetric === 'radiationDose') {
      predVal = Math.round((latestVal + 1.2) * 10) / 10;
      predLow = Math.round(latestVal * 10) / 10;
      predHigh = Math.round((latestVal + 2.5) * 10) / 10;
    }

    // Connect the last historical point to the forecast trajectory
    const forecastPoints: any[] = [];
    const stepCount = 5;
    for (let step = 1; step <= stepCount; step++) {
      const dayOffset = Math.round((step / stepCount) * 7);
      const interpVal = Math.round((latestVal + (predVal - latestVal) * (step / stepCount)) * 10) / 10;
      const interpLow = Math.round((latestVal + (predLow - latestVal) * (step / stepCount)) * 10) / 10;
      const interpHigh = Math.round((latestVal + (predHigh - latestVal) * (step / stepCount)) * 10) / 10;

      forecastPoints.push({
        date: `+${dayOffset}j`,
        valeur: null,
        baseline: computedBaseline,
        prevision: interpVal,
        borneHaute: interpHigh,
        borneBasse: interpLow
      });
    }

    return {
      chartData: [...historicalData, ...forecastPoints],
      personalBaseline: computedBaseline,
      forecastSummary: {
        val: predVal,
        low: predLow,
        high: predHigh,
        driverNote
      }
    };
  }, [selectedMetric, timeRange, measurements, sleepLogs, psychAssessments, boneRecords, missionDay, currentConfig, isFrench]);

  const METRIC_KEYS: HistoryMetricKey[] = Array.from(new Set<HistoryMetricKey>([
    'heartRate',
    'bpSys',
    'temperature',
    'glucose',
    'boneLoss',
    'sleep',
    'mood',
    'stress',
    ...BODY_MEASURE_FIELDS.map((field) => field.metric as HistoryMetricKey)
  ]));

  return (
    <div className="space-y-8 sm:space-y-10 max-w-5xl mx-auto">
      {/* Header & Time Horizon Selector */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-border">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-text">
            {t('history.title')}
          </h1>
          <p className="text-body-sm text-slate-muted max-w-prose mt-1">
            {t('history.subtitle')}
          </p>
        </div>

        {/* Time range selector (7 / 30 / 90 days) */}
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-slate-border self-start sm:self-auto">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                timeRange === days
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-muted hover:text-slate-text'
              }`}
            >
              {t(`history.range${days}d`)}
            </button>
          ))}
        </div>
      </section>

      {/* Single Metric Selection Pills */}
      <section className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
          {t('history.selectMetric')}
        </div>
        <div className="flex flex-wrap gap-2">
          {METRIC_KEYS.map((key) => {
            const isSelected = selectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-slate-text border-slate-border hover:bg-surface'
                }`}
              >
                {t(METRIC_CONFIGS[key]!.labelKey)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Single Chart View Card */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
        {/* Chart Header with Legend & Baseline Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold text-slate-text">
                {t(currentConfig.labelKey)}
              </h2>
              <span className="text-xs uppercase font-bold text-primary bg-primary-light px-2.5 py-1 rounded-md">
                {currentConfig.unit}
              </span>
            </div>
            <p className="text-xs text-slate-muted mt-1">
              {t('history.forecastNotice')}
            </p>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-primary rounded-full inline-block" />
              <span>Mesures réelles</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-accent border-b-2 border-dashed border-accent inline-block" />
              <span>{t('history.forecastLegend')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-slate-400 border-b border-dashed border-slate-500 inline-block" />
              <span>{t('history.baselineLegend')} ({personalBaseline ?? '—'} {currentConfig.unit})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-status-normal/15 rounded-xs inline-block" />
              <span>{t('history.thresholdNormal')}</span>
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-84 sm:h-96">
          {!chartData.length && <div className="flex h-full items-center justify-center text-sm text-slate-muted">Aucune mesure enregistrée pour cette période.</div>}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
              {/* Discrete optimal physiological range reference area */}
              <ReferenceArea
                y1={currentConfig.minNorm}
                y2={currentConfig.maxNorm}
                fill="#2E9E6B"
                fillOpacity={0.07}
              />

              <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
              <YAxis domain={currentConfig.yDomain} stroke="#94A3B8" fontSize={12} tickLine={false} />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const labelStr = String(label ?? '');
                    return (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-border shadow-md space-y-1 text-xs">
                        <div className="font-bold text-slate-text border-b border-slate-border pb-1">
                          {labelStr.startsWith('+') ? `Projection à ${labelStr.slice(1)}` : `Date : ${labelStr}`}
                        </div>
                        {data.valeur !== null && (
                          <div className="text-primary font-semibold">
                            Mesure : {data.valeur} {currentConfig.unit}
                          </div>
                        )}
                        {data.prevision !== null && (
                          <div className="text-accent font-semibold">
                            Prévision : ~{data.prevision} {currentConfig.unit}
                            <span className="text-slate-400 font-normal ml-1">
                              ({data.borneBasse} - {data.borneHaute})
                            </span>
                          </div>
                        )}
                        <div className="text-slate-500">
                          Baseline personnelle : {data.baseline} {currentConfig.unit}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* 14-day rolling baseline reference line */}
              {personalBaseline !== null && <ReferenceLine
                y={personalBaseline}
                stroke="#64748B"
                strokeDasharray="4 4"
                label={{
                  value: `Baseline (${personalBaseline})`,
                  position: 'insideRight',
                  fill: '#64748B',
                  fontSize: 11
                }}
              />}

              {/* Actual historical values line */}
              <Line
                type="monotone"
                dataKey="valeur"
                stroke="#0B4F8A"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#0B4F8A' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />

              {/* Dotted 7-day forecast line */}
              <Line
                type="monotone"
                dataKey="prevision"
                stroke="#2A9D8F"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#2A9D8F' }}
                connectNulls={false}
              />

              {/* Upper forecast bound */}
              <Line
                type="monotone"
                dataKey="borneHaute"
                stroke="#2A9D8F"
                strokeWidth={1}
                strokeDasharray="2 2"
                strokeOpacity={0.4}
                dot={false}
              />

              {/* Lower forecast bound */}
              <Line
                type="monotone"
                dataKey="borneBasse"
                stroke="#2A9D8F"
                strokeWidth={1}
                strokeDasharray="2 2"
                strokeOpacity={0.4}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Prediction summary callout under graph */}
        <div className="p-4 rounded-xl bg-surface border border-slate-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              Synthèse prédictive à 7 jours
            </div>
            <div className="font-bold text-slate-text text-base mt-0.5">
              {forecastSummary ? <>Valeur attendue : ~{forecastSummary.val} {currentConfig.unit}
              <span className="font-normal text-slate-muted ml-2">
                (fourchette estimée : {forecastSummary.low} à {forecastSummary.high} {currentConfig.unit})
              </span></> : 'Aucune prévision sans mesures enregistrées.'}
            </div>
          </div>
          {forecastSummary?.driverNote && (
            <p className="text-xs text-slate-muted italic max-w-sm">
              {forecastSummary.driverNote}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
