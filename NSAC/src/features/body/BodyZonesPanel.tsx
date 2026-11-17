import React, { useEffect, useMemo, useState } from 'react';
import { BODY_MEASURE_CONFIG, BODY_MEASURE_FIELD_BY_KEY, getBodyIndicatorStatus, getBodyMeasureStatus, type BodyMeasureKey, type BodyMeasureStatus } from '../../engine/config/bodyMeasures';
import { BODY_ZONE_CONFIG, BODY_ZONE_FIELD_KEYS, type BodyZoneId } from '../../engine/config/bodyZones';
import { get_body_measures, type BodyMeasuresData } from '../../services/bodyMeasures';
import { useAstroStore } from '../../store/useAstroStore';

const styles: Record<BodyMeasureStatus | 'missing', string> = {
  normal: 'bg-emerald-500', watch: 'bg-amber-500', action: 'bg-rose-600', missing: 'bg-slate-300'
};
const statusText: Record<BodyMeasureStatus, string> = {
  normal: 'Nominal', watch: 'À surveiller', action: 'Alerte'
};

function MiniHistory({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return <p className="text-xs text-slate-muted">Historique insuffisant pour tracer une évolution.</p>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const path = points.map((value, index) => `${(index / (points.length - 1)) * 120},${28 - ((value - min) / spread) * 24}`).join(' ');
  return <svg viewBox="0 0 120 32" role="img" aria-label={`Évolution historique : ${label}`} className="h-8 w-32 overflow-visible">
    <polyline points={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
  </svg>;
}

export const BodyZonesPanel: React.FC<{ onRequestMeasure: (key: BodyMeasureKey) => void; selectedZone: BodyZoneId | null; onSelectZone: (zone: BodyZoneId | null) => void }> = ({ onRequestMeasure, selectedZone, onSelectZone }) => {
  const { astronaut, measurements } = useAstroStore();
  const matricule = astronaut.matricule ?? astronaut.id;
  const [values, setValues] = useState<BodyMeasuresData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setValues(null);
    if (!matricule) return () => { active = false; };
    void get_body_measures(matricule).then((result) => { if (active) { setValues(result); setError(''); } })
      .catch(() => { if (active) setError('Impossible de lire les mesures de ce profil.'); });
    return () => { active = false; };
  }, [matricule, measurements]);

  const selected = useMemo(() => BODY_ZONE_CONFIG.find((zone) => zone.id === selectedZone), [selectedZone]);
  const indicators = useMemo(() => selected ? BODY_MEASURE_CONFIG.indicators.filter((indicator) => selected.indicatorIds.includes(indicator.id)) : [], [selected]);

  const statusForZone = (zone: typeof BODY_ZONE_CONFIG[number]): BodyMeasureStatus | 'missing' => {
    if (!values) return 'missing';
    const items = BODY_MEASURE_CONFIG.indicators.filter((indicator) => zone.indicatorIds.includes(indicator.id));
    const statuses = items.flatMap((indicator) => {
      const status = getBodyIndicatorStatus(indicator, values);
      return status ? [status] : [];
    });
    if (!statuses.length) return 'missing';
    if (statuses.includes('action')) return 'action';
    if (statuses.includes('watch')) return 'watch';
    return 'normal';
  };

  const latestTimestamp = (key: BodyMeasureKey): number | undefined => {
    const field = BODY_MEASURE_FIELD_BY_KEY[key];
    return measurements.filter((measurement) => measurement.metric === field.metric || (key === 'Fasting_Glucose' && measurement.metric === 'glucose' && (measurement.context ?? 'fasting') === 'fasting'))
      .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp;
  };

  const historyValues = (key: BodyMeasureKey): number[] => {
    const field = BODY_MEASURE_FIELD_BY_KEY[key];
    return measurements.filter((measurement) => measurement.metric === field.metric || (key === 'Fasting_Glucose' && measurement.metric === 'glucose' && (measurement.context ?? 'fasting') === 'fasting'))
      .sort((a, b) => a.timestamp - b.timestamp).slice(-12).map((measurement) => {
        if (key === 'Fasting_Glucose' && measurement.metric === 'glucose') return measurement.value * (field.legacyConversions?.[measurement.unit] ?? 1);
        return measurement.value;
      });
  };

  return <section className="grid gap-5 2xl:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]" aria-label="Exploration des indicateurs corporels">
    <nav data-decor-avoid className="space-y-3 rounded-2xl border border-slate-border bg-white p-5" aria-label="Zones du corps">
      <div><p className="text-sm font-semibold text-primary">Exploration corporelle</p><h2 className="font-serif text-2xl font-bold">Choisir une zone</h2><p className="mt-1 text-sm text-slate-muted">Sélectionnez une zone pour consulter les indicateurs et leur historique.</p></div>
      <div className="space-y-2">
        {BODY_ZONE_CONFIG.filter((zone) => zone.access === 'model').map((zone) => <button key={zone.id} type="button" onClick={() => onSelectZone(zone.id)} aria-pressed={selectedZone === zone.id} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${selectedZone === zone.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-border bg-white text-slate-text hover:bg-surface'}`}>
          <span>{zone.label}</span><span className={`h-3 w-3 shrink-0 rounded-full ${styles[statusForZone(zone)]}`} aria-label={statusForZone(zone) === 'missing' ? 'Aucune mesure' : statusText[statusForZone(zone) as BodyMeasureStatus]} />
        </button>)}
        <button type="button" onClick={() => onSelectZone('whole_body')} aria-pressed={selectedZone === 'whole_body'} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${selectedZone === 'whole_body' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-border bg-white text-slate-text hover:bg-surface'}`}>
          <span>Corps entier · mesures non localisées</span><span className={`h-3 w-3 shrink-0 rounded-full ${styles[statusForZone(BODY_ZONE_CONFIG.find((zone) => zone.id === 'whole_body')!)]}`} aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs text-slate-muted">Vert : nominal · orange : à surveiller · rouge : alerte · gris : aucune mesure.</p>
    </nav>

    {selected ? <div data-decor-avoid className="space-y-4 rounded-2xl border border-slate-border bg-white p-5 sm:p-6" aria-live="polite">
      <header><p className="text-sm font-semibold text-primary">Indicateurs associés</p><h2 className="font-serif text-2xl font-bold">{selected.label}</h2></header>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {indicators.flatMap((indicator) => indicator.fields.map((field) => {
        const value = values?.[field.key] ?? null;
        const status = value === null ? null : getBodyMeasureStatus(field, value);
        const timestamp = latestTimestamp(field.key);
        const points = historyValues(field.key);
        return <article key={field.key} className="space-y-3 rounded-xl border border-slate-border bg-surface/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h3 className="font-semibold">{field.label}</h3><p className="text-sm text-slate-muted">{value === null ? 'Non mesuré' : `${value} ${field.unit}`}</p></div>
            <span className={`inline-flex items-center gap-2 rounded-full border border-slate-border bg-white px-2.5 py-1 text-xs font-semibold ${status ? 'text-slate-text' : 'text-slate-muted'}`}><span className={`h-2.5 w-2.5 rounded-full ${styles[status ?? 'missing']}`} />{status ? statusText[status] : 'Aucune mesure'}</span>
          </div>
          <p className="text-xs text-slate-muted">{field.nominalText} · Plage de saisie : {field.plausibility.min} à {field.plausibility.max} {field.unit}.</p>
          {status && status !== 'normal' && <p className="text-sm text-slate-text">{BODY_MEASURE_CONFIG.indicators.find((item) => item.fields.some((candidate) => candidate.key === field.key))?.risk}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><MiniHistory points={points} label={field.label} /><span className="text-xs text-slate-muted">{timestamp ? new Date(timestamp).toLocaleString() : 'Aucune date enregistrée'}</span></div>{value === null && <button type="button" onClick={() => onRequestMeasure(field.key)} className="min-h-10 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Saisir cette mesure</button>}</div>
          <a href={indicator.referenceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2">Référence : {indicator.reference}</a>
        </article>;
      }))}
    </div> : <div data-decor-avoid className="flex min-h-36 items-center rounded-2xl border border-dashed border-slate-border bg-white p-5 text-sm text-slate-muted" aria-live="polite">Sélectionnez un point vert du modèle, ou choisissez une zone dans la liste, pour afficher ses indicateurs.</div>}
  </section>;
};
