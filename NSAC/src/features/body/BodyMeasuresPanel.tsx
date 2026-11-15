import React, { useEffect, useState } from 'react';
import { BODY_MEASURE_CONFIG, BODY_MEASURE_KEYS, getBodyIndicatorStatus, type BodyMeasureKey, type BodyMeasureStatus } from '../../engine/config/bodyMeasures';
import { get_body_measures, type BodyMeasuresData } from '../../services/bodyMeasures';
import { useAstroStore } from '../../store/useAstroStore';

const statusLabels: Record<BodyMeasureStatus, string> = { normal: 'Dans la plage nominale', watch: 'À surveiller', action: 'Alerte' };
const statusClasses: Record<BodyMeasureStatus, string> = {
  normal: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-900',
  action: 'border-rose-200 bg-rose-50 text-rose-800'
};

export const BodyMeasuresPanel: React.FC<{ focusFieldKey?: BodyMeasureKey | null; onFieldFocused?: () => void }> = ({ focusFieldKey, onFieldFocused }) => {
  const { astronaut, addBodyMeasurements } = useAstroStore();
  const [draft, setDraft] = useState<Partial<Record<BodyMeasureKey, string>>>({});
  const [latest, setLatest] = useState<BodyMeasuresData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['bone-muscle']));

  const matricule = astronaut.matricule ?? astronaut.id;
  const refresh = async () => {
    if (matricule) setLatest(await get_body_measures(matricule));
  };
  useEffect(() => { void refresh(); }, [matricule]);

  useEffect(() => {
    if (!focusFieldKey) return;
    const indicator = BODY_MEASURE_CONFIG.indicators.find((item) => item.fields.some((field) => field.key === focusFieldKey));
    const sectionId = indicator?.section;
    if (sectionId) setOpenSections((current) => new Set(current).add(sectionId));
    const timer = window.setTimeout(() => {
      const section = sectionId ? document.querySelector<HTMLDetailsElement>(`details[data-section-id="${sectionId}"]`) : null;
      if (section) section.open = true;
      const field = document.getElementById(`body-${focusFieldKey}`) as HTMLInputElement | null;
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
      onFieldFocused?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusFieldKey, onFieldFocused]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const values: Partial<Record<BodyMeasureKey, number>> = {};
    for (const key of BODY_MEASURE_KEYS) {
      const raw = draft[key]?.trim();
      if (raw !== undefined && raw !== '') values[key] = Number(raw);
    }
    if (Object.keys(values).length === 0) {
      setError('Renseignez au moins une mesure à enregistrer.');
      return;
    }
    if (values.Radiation_Dose_Cumulative !== undefined && latest?.Radiation_Dose_Cumulative !== null && latest?.Radiation_Dose_Cumulative !== undefined && values.Radiation_Dose_Cumulative < latest.Radiation_Dose_Cumulative) {
      const accepted = window.confirm('La dose cumulée saisie est inférieure à la précédente. Vérifiez la lecture du dosimètre. Confirmer cet enregistrement ?');
      if (!accepted) return;
    }
    setSaving(true);
    try {
      await addBodyMeasurements(values);
      setDraft({});
      await refresh();
      setSuccess('Les mesures renseignées ont été enregistrées dans votre historique.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec de l’enregistrement des mesures.');
    } finally {
      setSaving(false);
    }
  };

  return <section id="body-measures" className="space-y-5 rounded-2xl border border-slate-border bg-white p-5 sm:p-7">
    <header className="space-y-1">
      <p className="text-sm font-semibold text-primary">Suivi des indicateurs de bord</p>
      <h2 className="font-serif text-2xl font-bold">Mesures corporelles</h2>
      <p className="text-sm text-slate-muted">Saisissez une mesure ou plusieurs à la fois. Les champs laissés vides ne sont pas enregistrés.</p>
    </header>

    <form onSubmit={handleSave} className="space-y-4">
      {BODY_MEASURE_CONFIG.sections.map((section) => {
        const indicators = BODY_MEASURE_CONFIG.indicators.filter((indicator) => indicator.section === section.id);
        return <details key={section.id} data-section-id={section.id} open={openSections.has(section.id)} className="group rounded-xl border border-slate-border">
          <summary onClick={(event) => { event.preventDefault(); setOpenSections((current) => { const next = new Set(current); next.has(section.id) ? next.delete(section.id) : next.add(section.id); return next; }); }} className="cursor-pointer list-none px-4 py-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{section.label}<span className="float-right text-slate-muted group-open:rotate-180">⌄</span></summary>
          <div className="grid gap-3 border-t border-slate-border p-3 sm:grid-cols-2">
            {indicators.map((indicator) => {
              const statusValues = latest ? Object.fromEntries(Object.entries(latest).filter(([, value]) => value !== null)) as Partial<Record<BodyMeasureKey, number>> : null;
              const status = statusValues ? getBodyIndicatorStatus(indicator, statusValues) : null;
              return <article key={indicator.id} className="space-y-3 rounded-xl bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="font-semibold">{indicator.label}</h3><p className="text-xs text-slate-muted">Appareil : {indicator.device}</p></div>
                  {status && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>{statusLabels[status]}</span>}
                </div>
                {indicator.fields.map((field) => <div key={field.key} className="space-y-1.5">
                  <label htmlFor={`body-${field.key}`} className="text-sm font-medium">{field.label}</label>
                  <div className="flex items-center gap-2">
                    <input id={`body-${field.key}`} type="number" step={field.step} min={field.plausibility.min} max={field.plausibility.max} value={draft[field.key] ?? ''} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-slate-border bg-white px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" placeholder="Saisir une valeur" />
                    <span className="min-w-12 text-sm font-semibold text-slate-muted">{field.unit}</span>
                  </div>
                  <p className="text-xs text-slate-muted">{field.nominalText}. Plausibilité : {field.plausibility.min} à {field.plausibility.max} {field.unit}.</p>
                  <p className="text-xs text-slate-muted">Dernière valeur : {latest?.[field.key] === null || latest?.[field.key] === undefined ? 'Non mesuré' : `${latest[field.key]} ${field.unit}`}</p>
                </div>)}
                {status && status !== 'normal' && <p className="rounded-lg border border-slate-border bg-white px-3 py-2 text-xs text-slate-text">{indicator.risk}</p>}
                <a href={indicator.referenceUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-primary underline decoration-primary/40 underline-offset-2">Référence : {indicator.reference}</a>
              </article>;
            })}
          </div>
        </details>;
      })}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <button type="submit" disabled={saving || !Object.values(draft).some((value) => value?.trim())} className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer les mesures renseignées'}</button>
    </form>
  </section>;
};
