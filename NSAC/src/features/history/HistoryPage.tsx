import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
import type { Metric } from '../../types';

export const MIN_FORECAST_POINTS = 5;
export const BASELINE_WINDOW_DAYS = 14;
export const MIN_BASELINE_DAYS = 14;

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
  | 'fastingGlucose'
  | 'reactionTime'
  | 'orientationAccuracy';

export const HistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openMeasure } = useOutletContext<{ openMeasure: (metric?: Metric) => void }>();
  const isFrench = i18n.language.startsWith('fr');

  const {
    measurements,
    sleepLogs,
    psychAssessments,
    boneRecords,
    logActivityEvent,
    astronaut,
    isLoading
  } = useAstroStore();

  const [selectedMetric, setSelectedMetric] = useState<HistoryMetricKey>('heartRate');
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);

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
    },
    reactionTime: {
      labelKey: 'history.metrics.reactionTime', unit: 'ms', fallbackBaseline: 0,
      minNorm: 0, maxNorm: 0, yDomain: [0, 1500]
    },
    orientationAccuracy: {
      labelKey: 'history.metrics.orientationAccuracy', unit: '%', fallbackBaseline: 0,
      minNorm: 0, maxNorm: 0, yDomain: [0, 100]
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
  const { chartData, personalBaseline, forecastSummary, forecastReason, olderCount, baselineDays } = useMemo(() => {
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
      sleepLogs.filter((log) => log.astronautId === astronaut.id).forEach((log) => {
        const ts = new Date(log.date).getTime();
        if (ts <= now) {
          rawPoints.push({ timestamp: ts, value: log.hours, dateStr: log.date.slice(5) });
        }
      });
    } else if (selectedMetric === 'mood') {
      psychAssessments.filter((assessment) => assessment.astronautId === astronaut.id).forEach((p) => {
        const ts = new Date(p.date).getTime();
        if (ts <= now) {
          rawPoints.push({ timestamp: ts, value: p.score, dateStr: p.date.slice(5) });
        }
      });
    } else if (selectedMetric === 'stress') {
      psychAssessments.filter((assessment) => assessment.astronautId === astronaut.id).forEach((p) => {
        const ts = new Date(p.date).getTime();
        if (ts <= now && p.stressLevel !== undefined) {
          rawPoints.push({ timestamp: ts, value: p.stressLevel, dateStr: p.date.slice(5) });
        }
      });
    } else if (selectedMetric === 'boneLoss') {
      boneRecords.filter((record) => record.astronautId === astronaut.id).forEach((b) => {
        const ts = new Date(b.date).getTime();
        if (ts <= now) {
          rawPoints.push({ timestamp: ts, value: b.valueGcm2, dateStr: b.date.slice(5) });
        }
      });
      // Also look into measurements for boneProxy
      measurements
        .filter((m) => m.astronautId === astronaut.id && m.metric === 'boneProxy' && m.timestamp <= now)
        .forEach((m) => {
          rawPoints.push({
            timestamp: m.timestamp,
            value: m.value,
            dateStr: new Date(m.timestamp).toISOString().split('T')[0].slice(5)
          });
        });
    } else if (selectedMetric === 'glucose' || selectedMetric === 'fastingGlucose') {
      const displayUnit = selectedMetric === 'glucose' ? 'mg/dL' : 'g/L';
      measurements
        .filter((measurement) => measurement.astronautId === astronaut.id && measurement.timestamp <= now && (
          measurement.metric === selectedMetric ||
          (selectedMetric === 'glucose' && measurement.metric === 'fastingGlucose') ||
          (selectedMetric === 'fastingGlucose' && measurement.metric === 'glucose' && (measurement.context ?? 'fasting') === 'fasting')
        ))
        .forEach((measurement) => {
          let value = measurement.value;
          if (measurement.unit !== displayUnit) {
            if (displayUnit === 'mg/dL') value = measurement.unit === 'g/L' ? value * 100 : value * 18;
            else value = measurement.unit === 'mg/dL' ? value / 100 : value / 5.55;
          }
          rawPoints.push({
            timestamp: measurement.timestamp,
            value: Number(value.toFixed(1)),
            dateStr: new Date(measurement.timestamp).toISOString().split('T')[0].slice(5)
          });
        });
    } else {
      measurements
        .filter((m) => m.astronautId === astronaut.id && m.metric === selectedMetric && m.timestamp <= now)
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
    const inRangePoints = rawPoints.filter((point) => point.timestamp >= startTs && point.timestamp <= now);
    const visiblePoints = showAllMeasurements ? rawPoints : inRangePoints;
    if (visiblePoints.length === 0) {
      return { chartData: [], personalBaseline: null, forecastSummary: null, forecastReason: null, olderCount: rawPoints.length, baselineDays: 0 };
    }

    // Only claim a personal baseline when at least one real point exists for each of 14 days.
    const baselineStart = now - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const baselinePoints = rawPoints.filter((point) => point.timestamp >= baselineStart && point.timestamp <= now);
    const baselineDaySet = new Set(baselinePoints.map((point) => point.dateStr));
    const baselineDays = baselineDaySet.size;
    const computedBaseline = baselineDays >= MIN_BASELINE_DAYS
      ? Math.round((baselinePoints.reduce((sum, point) => sum + point.value, 0) / baselinePoints.length) * 10) / 10
      : null;

    // Resample/group points by days if dense
    const aggregatedMap = new Map<string, { sum: number; count: number }>();
    visiblePoints.forEach((p) => {
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
    const latestVal = historicalData[historicalData.length - 1]?.valeur;
    const forecastSupported = ['heartRate', 'bpSys', 'temperature', 'glucose', 'boneLoss', 'mood', 'radiationDose'].includes(selectedMetric);
    const enoughForForecast = historicalData.length >= MIN_FORECAST_POINTS;
    if (!forecastSupported || !enoughForForecast || latestVal === undefined) {
      return {
        chartData: historicalData,
        personalBaseline: computedBaseline,
        forecastSummary: null,
        forecastReason: forecastSupported
          ? `Pas assez de mesures pour une prévision (${historicalData.length} sur ${MIN_FORECAST_POINTS} requises).`
          : 'Prévision indisponible pour cet indicateur.',
        olderCount: Math.max(0, rawPoints.length - inRangePoints.length),
        baselineDays
      };
    }
    let predVal = latestVal;
    let predLow = latestVal;
    let predHigh = latestVal;
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
      const baselineRecords = boneRecords.filter((record) => record.isBaseline);
      const hasDensityBaseline = baselineRecords.length > 0;
      const baselineDensity = baselineRecords.length > 0
        ? baselineRecords.reduce((sum, record) => sum + record.valueGcm2, 0) / baselineRecords.length
        : rawPoints[0]?.value ?? 100;
      const currentPercent = hasDensityBaseline ? (latestVal / baselineDensity) * 100 : latestVal;
      const densityScale = hasDensityBaseline ? baselineDensity / 100 : 1;
      const f = new BoneMassForecaster(currentPercent);
      const res = f.predict('30d');
      predVal = res.value * densityScale;
      predLow = res.low * densityScale;
      predHigh = res.high * densityScale;
    } else if (selectedMetric === 'mood') {
      const f = new MoodForecaster(latestVal);
      const res = f.predict('7d');
      predVal = res.value;
      predLow = res.low;
      predHigh = res.high;
    } else if (selectedMetric === 'radiationDose') {
      predVal = Math.round((latestVal + 1.2) * 10) / 10;
      predLow = Math.round(latestVal * 10) / 10;
      predHigh = Math.round((latestVal + 2.5) * 10) / 10;
    }

    // The forecast is shown only at its modelled seven-day endpoint; no intermediate values are fabricated.
    historicalData[historicalData.length - 1].prevision = latestVal;
    historicalData[historicalData.length - 1].borneHaute = latestVal;
    historicalData[historicalData.length - 1].borneBasse = latestVal;
    const forecastPoint = {
      date: '+7j',
      valeur: null,
      baseline: computedBaseline,
      prevision: predVal,
      borneHaute: predHigh,
      borneBasse: predLow
    };

    return {
      chartData: [...historicalData, forecastPoint],
      personalBaseline: computedBaseline,
      forecastReason: null,
      olderCount: Math.max(0, rawPoints.length - inRangePoints.length),
      baselineDays,
      forecastSummary: {
        val: predVal,
        low: predLow,
        high: predHigh,
        driverNote
      }
    };
  }, [selectedMetric, timeRange, showAllMeasurements, measurements, sleepLogs, psychAssessments, boneRecords, currentConfig, isFrench, astronaut.id]);

  const requestSelectedMeasurement = () => {
    const bodyField = BODY_MEASURE_FIELDS.find((field) => field.metric === selectedMetric);
    if (bodyField) {
      navigate('/corps', { state: { focusFieldKey: bodyField.key } });
      return;
    }
    const initialMetric: Metric = selectedMetric === 'bpDia' ? 'bpSys' : selectedMetric === 'sleep' ? 'sleepQuality' : selectedMetric as Metric;
    openMeasure(initialMetric);
  };

  const METRIC_KEYS: HistoryMetricKey[] = Array.from(new Set<HistoryMetricKey>([
    'heartRate',
    'bpSys',
    'temperature',
    'glucose',
    'boneLoss',
    'sleep',
    'mood',
    'stress',
    'reactionTime',
    'orientationAccuracy',
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
              onClick={() => { setTimeRange(days); setShowAllMeasurements(false); }}
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
                onClick={() => { setSelectedMetric(key); setShowAllMeasurements(false); }}
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
      <section className="min-w-0 overflow-hidden bg-white p-6 sm:p-8 rounded-2xl border border-slate-border shadow-xs space-y-6">
        {isLoading ? <div role="status" className="flex min-h-72 items-center justify-center text-sm text-slate-muted">Chargement des mesures…</div> : chartData.length === 0 ? (
          <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-slate-border bg-surface/40 p-6 text-center">
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-text">{t(currentConfig.labelKey)}</h2>
              <p className="mt-2 text-sm text-slate-muted">Aucune mesure enregistrée pour cette période.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {olderCount > 0 && !showAllMeasurements && <button type="button" onClick={() => setShowAllMeasurements(true)} className="min-h-11 rounded-xl border border-slate-border bg-white px-4 py-2 text-sm font-semibold text-slate-text hover:bg-surface">Voir toute la période ({olderCount} mesures antérieures)</button>}
              <button type="button" onClick={requestSelectedMeasurement} className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Saisir une mesure</button>
            </div>
          </div>
        ) : <>
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
              {forecastSummary ? t('history.forecastNotice') : selectedMetric === 'reactionTime' || selectedMetric === 'orientationAccuracy' ? t('history.cognitiveNotice') : forecastReason}
            </p>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-primary rounded-full inline-block" />
              <span>Mesures réelles</span>
            </span>
            {forecastSummary && <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-accent border-b-2 border-dashed border-accent inline-block" />
              <span>{t('history.forecastLegend')}</span>
            </span>}
            {personalBaseline !== null ? <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-slate-400 border-b border-dashed border-slate-500 inline-block" />
              <span>{t('history.baselineLegend')} ({personalBaseline} {currentConfig.unit})</span>
            </span> : <span>{`Ligne de base indisponible (${baselineDays} sur ${MIN_BASELINE_DAYS} jours requis)`}</span>}
            {selectedMetric !== 'reactionTime' && selectedMetric !== 'orientationAccuracy' && <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-status-normal/15 rounded-xs inline-block" />
              <span>{t('history.thresholdNormal')}</span>
            </span>}
          </div>
        </div>

        {/* Recharts Container */}
        <div className="relative isolate min-w-0 w-full h-[340px] sm:h-[384px] overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart key={`${astronaut.id}-${selectedMetric}-${timeRange}-${showAllMeasurements}`} data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
              {/* Discrete optimal physiological range reference area */}
              {selectedMetric !== 'reactionTime' && selectedMetric !== 'orientationAccuracy' && <ReferenceArea
                y1={currentConfig.minNorm}
                y2={currentConfig.maxNorm}
                fill="#2E9E6B"
                fillOpacity={0.07}
              />}

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
              {forecastSummary && <Line
                type="monotone"
                dataKey="prevision"
                stroke="#2A9D8F"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#2A9D8F' }}
                connectNulls={false}
              />}

              {/* Upper forecast bound */}
              {forecastSummary && <Line
                type="monotone"
                dataKey="borneHaute"
                stroke="#2A9D8F"
                strokeWidth={1}
                strokeDasharray="2 2"
                strokeOpacity={0.4}
                dot={false}
              />}

              {/* Lower forecast bound */}
              {forecastSummary && <Line
                type="monotone"
                dataKey="borneBasse"
                stroke="#2A9D8F"
                strokeWidth={1}
                strokeDasharray="2 2"
                strokeOpacity={0.4}
                dot={false}
              />}
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
              </span></> : forecastReason}
            </div>
          </div>
          {forecastSummary?.driverNote && (
            <p className="text-xs text-slate-muted italic max-w-sm">
              {forecastSummary.driverNote}
            </p>
          )}
        </div>
        </>}
      </section>
    </div>
  );
};
