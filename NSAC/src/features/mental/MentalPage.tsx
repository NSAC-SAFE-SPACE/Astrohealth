import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Brain } from 'lucide-react';
import { useAstroStore } from '../../store/useAstroStore';
import type { MentalStateData } from '../../types';
import { MENTAL_STATE_FIELDS, MENTAL_STATE_KEYS, createMentalStateData, validate_mental_state } from './mentalState';
import { computePsychSleepQuality } from '../../engine/scores/sleep';
import { defaultSleepLogValues, SleepLogFields, type SleepLogValues } from '../../ui/SleepLogFields';
import { buildMentalPrediction } from '../../services/predictionCompleteness';
import { PredictionPanel } from '../../ui/PredictionPanel';

export const MentalPage: React.FC = () => {
  const { t } = useTranslation();
  const { astronaut, psychAssessments, sleepLogs, sleepScore, addMentalAssessment, logActivityEvent } = useAstroStore();
  const [mode, setMode] = useState<'overview' | 'questionnaire' | 'result'>('overview');
  const [mentalForm, setMentalForm] = useState<Partial<MentalStateData>>({});
  const [sleepValues, setSleepValues] = useState<SleepLogValues>(defaultSleepLogValues);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const todaySleep = sleepLogs.find((log) => log.date === today);
  const todaySleepScore = todaySleep ? computePsychSleepQuality(todaySleep, sleepLogs.filter((log) => log.date !== today).slice(-7)) : null;
  const setMental = <K extends keyof MentalStateData>(key: K, value: MentalStateData[K]) => setMentalForm((current) => ({ ...current, [key]: value }));
  const latestPsych = [...psychAssessments].sort((a, b) => b.date.localeCompare(a.date))[0];
  const prediction = useMemo(() => buildMentalPrediction(psychAssessments, sleepLogs, astronaut.id), [psychAssessments, sleepLogs, astronaut.id]);
  const hasSleepInputs = Number.isFinite(sleepValues.hours) && sleepValues.hours >= 0 && sleepValues.hours <= 16 && /^([01]\d|2[0-3]):[0-5]\d$/.test(sleepValues.bedtime) && ['<15', '15-30', '30-60', '>60'].includes(sleepValues.latencyBucket) && Number.isInteger(sleepValues.awakenings) && sleepValues.awakenings >= 0 && sleepValues.awakenings <= 10 && Number.isInteger(sleepValues.restfulness) && sleepValues.restfulness >= 1 && sleepValues.restfulness <= 5;
  const sleepLogForTest = { id: todaySleep?.id ?? 'preview', astronautId: todaySleep?.astronautId ?? '', date: today, ...sleepValues, latencyBucket: sleepValues.latencyBucket || '<15' };
  const sleepScoreForTest = hasSleepInputs ? computePsychSleepQuality(sleepLogForTest, sleepLogs.filter((log) => log.date !== today).slice(-7)) : null;
  const complete = MENTAL_STATE_KEYS.filter((key) => key !== 'Sleep_Quality').every((key) => mentalForm[key] !== undefined) && hasSleepInputs;
  const valid = (() => { if (!complete || sleepScoreForTest === null) return false; try { validate_mental_state(Object.fromEntries(MENTAL_STATE_KEYS.map((key) => [key, key === 'Sleep_Quality' ? sleepScoreForTest : mentalForm[key]])), { sleepQualityCalculated: true }); return true; } catch { return false; } })();
  useEffect(() => { logActivityEvent('view'); }, [logActivityEvent]);
  const submit = async () => {
    setSaveError('');
    if (!hasSleepInputs || sleepScoreForTest === null) {
      setSaveError('Renseignez tous les paramètres de sommeil avant l’enregistrement.');
      return;
    }
    setIsSaving(true);
    try {
      const data = createMentalStateData(mentalForm as Omit<MentalStateData, 'Sleep_Quality'>, sleepScoreForTest);
      validate_mental_state(data, { sleepQualityCalculated: true });
      await addMentalAssessment(data, { date: today, ...sleepValues, latencyBucket: sleepValues.latencyBucket as import('../../types').LatencyBucket });
      setMode('overview');
    } catch (error) {
      setSaveError(error instanceof Error ? `Enregistrement impossible : ${error.message}` : 'Enregistrement impossible. Vérifiez votre connexion et réessayez.');
    } finally {
      setIsSaving(false);
    }
  };
  const choices: Record<string, readonly string[]> = { Stress_level: ['High', 'Medium', 'Low'], 'Mood_Score': ['positive', 'neutral', 'negative'], 'Workload Perception': ['impossible', 'possible', 'easy'], Time_Perception: ['Slow', 'Normal', 'Fast'], Food: ['Bad', 'Good', 'Neutral'] };
  return <div className="mx-auto max-w-4xl space-y-8">
    <section className="border-b border-slate-border pb-4"><h1 className="font-serif text-3xl font-bold">{t('mental.title')}</h1><p className="mt-1 max-w-prose text-sm text-slate-muted">{t('mental.subtitle')}</p></section>
    {mode === 'questionnaire' && <section className="space-y-7 rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><header><div className="text-sm font-semibold text-primary">Auto-évaluation</div><h2 className="mt-1 font-serif text-2xl font-bold">Renseignez les huit champs</h2><p className="mt-1 text-sm text-slate-muted">Les choix sont enregistrés tels qu’affichés dans le modèle.</p></header>
      <div className="space-y-6">{MENTAL_STATE_FIELDS.map((field) => { const { key } = field; const options = 'options' in field ? field.options : undefined; const min = 'min' in field ? field.min : undefined; const max = 'max' in field ? field.max : undefined; const integer = 'integer' in field ? field.integer : false; const unit = 'unit' in field ? field.unit : undefined; return ( <div key={key} className="space-y-2"><label className="font-semibold">{({ Stress_level:'Niveau de stress', Happiness:'Niveau de bonheur', Mood_Score:'Humeur', 'Workload Perception':'Charge de travail perçue', Time_Perception:'Perception du temps', Food:'Alimentation', Communication_with_Earth_mins:'Communication avec les proches' } as Record<string,string>)[key]}</label>
      {options ? <div className="flex flex-wrap gap-2">{options.map((option) => <label key={option} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm transition-colors ${mentalForm[key as keyof MentalStateData] === option ? 'border-primary bg-primary-light text-primary' : 'border-slate-border hover:border-primary/50'}`}><input className="sr-only" type="radio" name={key} value={option} checked={mentalForm[key as keyof MentalStateData] === option} onChange={() => setMental(key as keyof MentalStateData, option as never)}/>{option}</label>)}</div> : key === 'Happiness' ? <div className="flex items-center gap-4"><input aria-label="Niveau de bonheur, de 0 à 10" className="w-full accent-primary" type="range" min={min} max={max} step={integer ? 1 : 0.01} value={mentalForm.Happiness ?? 5} onChange={(e) => setMental('Happiness', Number(e.target.value))}/><span className="w-8 text-right font-mono font-bold">{mentalForm.Happiness ?? 5}</span></div> : <input aria-label={key} className="w-full rounded-xl border border-slate-border px-4 py-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" type="number" min={min} max={max} step={integer ? 1 : key === 'Communication_with_Earth_mins' ? 0.1 : 0.01} value={mentalForm[key as keyof MentalStateData] ?? ''} onChange={(e) => setMental(key as keyof MentalStateData, (e.target.value === '' ? undefined : Number(e.target.value)) as never)}/>}
      <p className="text-xs text-slate-muted">{key === 'Happiness' ? 'Échelle entière de 0 à 10.' : key === 'Communication_with_Earth_mins' ? `Durée en ${unit}, valeur ≥ 0.` : 'Sélectionnez une valeur autorisée.'}</p></div>); })}</div>
      <section className="space-y-4 rounded-2xl border border-slate-border bg-surface p-5 sm:p-6">
        <div><h3 className="font-serif text-xl font-bold">Sommeil</h3><p className="mt-1 text-sm text-slate-muted">Les paramètres ci-dessous seront enregistrés avec votre auto-évaluation.</p></div>
        <SleepLogFields values={sleepValues} onChange={setSleepValues}/>
        <p className="text-sm font-semibold text-primary">Qualité du sommeil : {sleepScoreForTest === null ? '—' : `${sleepScoreForTest.toFixed(2)} / 62.53`}</p>
      </section>
      <section className="space-y-2 rounded-xl bg-surface p-4"><h3 className="font-semibold">Récapitulatif</h3>
        {MENTAL_STATE_KEYS.map((key) => <div key={key} className="flex justify-between gap-4 border-b border-slate-border/60 py-2 text-sm last:border-0"><span className="text-slate-muted">{key === 'Sleep_Quality' ? 'Qualité du sommeil' : key === 'Mood_Score' ? 'Humeur' : key}</span><strong className="text-right">{key === 'Sleep_Quality' ? (sleepScoreForTest === null ? '—' : `${sleepScoreForTest.toFixed(2)} / 62.53`) : String(mentalForm[key] ?? '—')}</strong></div>)}
      </section>
      <div className="flex gap-3"><button onClick={() => { setMode('overview'); }} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Annuler</button><button disabled={!valid} onClick={() => setMode('result')} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">Valider les réponses</button></div>
    </section>}
    {mode === 'result' && <section className="space-y-6 rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><header><p className="text-sm font-semibold text-primary">Récapitulatif final</p><h2 className="font-serif text-2xl font-bold">Vérifiez vos réponses</h2></header><div className="grid gap-3 sm:grid-cols-2">{MENTAL_STATE_KEYS.map((key) => <div key={key} className="rounded-xl bg-surface p-4"><p className="text-xs text-slate-muted">{key === 'Mood_Score' ? 'Humeur' : key}</p><p className="mt-1 font-semibold">{String(key === 'Sleep_Quality' ? sleepScoreForTest ?? '' : mentalForm[key] ?? '')}</p></div>)}</div>{saveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}<button disabled={!valid || isSaving} onClick={submit} className="min-h-12 w-full rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{isSaving ? 'Enregistrement…' : 'Enregistrer l’auto-évaluation'}</button></section>}
    {mode === 'overview' && <><section className="space-y-5 rounded-2xl border border-slate-border bg-surface p-6 sm:p-8"><div className="flex items-center gap-3"><Brain className="text-primary"/><div><h2 className="font-serif text-2xl font-bold">État psycho-émotionnel</h2><p className="text-sm text-slate-muted">{latestPsych ? `Dernière saisie : ${latestPsych.date}` : 'Aucune auto-évaluation enregistrée.'}</p></div></div><button onClick={() => { setMentalForm({}); setSleepValues(todaySleep ? { hours: todaySleep.hours, bedtime: todaySleep.bedtime, latencyBucket: todaySleep.latencyBucket, awakenings: todaySleep.awakenings, restfulness: todaySleep.restfulness } : defaultSleepLogValues); setMode('questionnaire'); }} className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-white">{latestPsych ? 'Nouvelle auto-évaluation' : 'Commencer l’auto-évaluation'}</button>{latestPsych?.mentalStateData && <div className="grid gap-3 sm:grid-cols-2">{MENTAL_STATE_KEYS.map((key) => <div key={key} className="rounded-xl bg-white p-4"><p className="text-xs text-slate-muted">{key === 'Mood_Score' ? 'Humeur' : key}</p><p className="font-semibold">{String(latestPsych.mentalStateData?.[key] ?? '—')}</p></div>)}</div>}</section>
      <section className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Moon className="text-primary"/><div><h2 className="font-serif text-2xl font-bold">{t('mental.sleepSection')}</h2><p className="text-sm text-slate-muted">{todaySleepScore !== null ? `Qualité sommeil du jour : ${todaySleepScore}/62.53` : sleepScore ? `Dernier score : ${sleepScore.value}/100` : 'Aucune donnée de sommeil calculée.'}</p></div></div><button onClick={() => { setMentalForm({}); setSleepValues(todaySleep ? { hours: todaySleep.hours, bedtime: todaySleep.bedtime, latencyBucket: todaySleep.latencyBucket, awakenings: todaySleep.awakenings, restfulness: todaySleep.restfulness } : defaultSleepLogValues); setMode('questionnaire'); }} className="min-h-12 rounded-xl border border-primary px-5 font-semibold text-primary">Inclure le sommeil dans mon auto-évaluation</button><div className="grid grid-cols-2 gap-2 sm:grid-cols-7">{sleepLogs.slice(-7).map((log) => <div key={log.id} className="rounded-lg border border-slate-border p-3 text-center"><div className="text-xs text-slate-muted">{log.date.slice(5)}</div><div className="font-semibold">{log.hours} h</div><div className="text-xs">{computePsychSleepQuality(log, sleepLogs.filter((other) => other.date !== log.date).slice(-7))}/62.53</div></div>)}</div></section><PredictionPanel kind="mental" astronautId={astronaut.id} payload={prediction.payload as unknown as Record<string, unknown>} missing={prediction.missing} total={8} onMissingField={() => { setMentalForm(latestPsych?.mentalStateData ?? {}); setSleepValues(todaySleep ? { hours: todaySleep.hours, bedtime: todaySleep.bedtime, latencyBucket: todaySleep.latencyBucket, awakenings: todaySleep.awakenings, restfulness: todaySleep.restfulness } : defaultSleepLogValues); setMode('questionnaire'); }} /></>}
  </div>;
};
