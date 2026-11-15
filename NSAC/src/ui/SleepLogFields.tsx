import React from 'react';
import type { LatencyBucket } from '../types';

export interface SleepLogValues { hours: number; bedtime: string; latencyBucket: LatencyBucket | ''; awakenings: number; restfulness: number }
interface Props { values: SleepLogValues; onChange: (values: SleepLogValues) => void }
export const defaultSleepLogValues: SleepLogValues = { hours: 0, bedtime: '', latencyBucket: '', awakenings: -1, restfulness: 0 };

export const SleepLogFields: React.FC<Props> = ({ values, onChange }) => {
  const update = (patch: Partial<SleepLogValues>) => onChange({ ...values, ...patch });
  return <div className="space-y-4">
    <label className="block text-sm font-medium">Heures effectives dormies<input type="number" step="0.5" min="0" max="16" value={values.hours || ''} onChange={(e) => update({ hours: e.target.value === '' ? 0 : Number(e.target.value) })} className="mt-1 h-12 w-full rounded-xl border border-slate-border px-4 text-lg font-semibold"/></label>
    <label className="block text-sm font-medium">Heure du coucher<input type="time" value={values.bedtime} onChange={(e) => update({ bedtime: e.target.value })} className="mt-1 h-12 w-full rounded-xl border border-slate-border px-4 text-lg font-semibold"/></label>
    <fieldset><legend className="mb-1 text-sm font-medium">Temps pour s’endormir</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(['<15','15-30','30-60','>60'] as LatencyBucket[]).map((bucket) => <button key={bucket} type="button" onClick={() => update({ latencyBucket: bucket })} className={`h-11 rounded-lg border text-sm font-medium ${values.latencyBucket === bucket ? 'border-primary bg-primary text-white' : 'border-slate-border bg-white'}`}>{bucket} min</button>)}</div></fieldset>
    <div className="space-y-1"><label className="block text-sm font-medium">Nombre de réveils nocturnes : {values.awakenings < 0 ? '—' : values.awakenings}</label><input aria-label="Nombre de réveils nocturnes" type="range" min="0" max="10" value={Math.max(0, values.awakenings)} onChange={(e) => update({ awakenings: Number(e.target.value) })} className="w-full accent-primary"/></div>
    <fieldset><legend className="mb-1 text-sm font-medium">Ressenti d’énergie au réveil (1 = épuisé, 5 = en pleine forme) : {values.restfulness || '—'}/5</legend><div className="flex gap-2">{[1,2,3,4,5].map((score) => <button key={score} type="button" onClick={() => update({ restfulness: score })} className={`h-12 flex-1 rounded-lg border font-bold ${values.restfulness === score ? 'border-primary bg-primary text-white' : 'border-slate-border bg-white'}`}>{score}</button>)}</div></fieldset>
  </div>;
};
