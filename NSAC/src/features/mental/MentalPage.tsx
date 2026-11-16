import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Moon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAstroStore } from '../../store/useAstroStore';
import type { MentalStateData, StressAssessment, WellBeingAssessment } from '../../types';
import { calculateStressAssessment, STRESS_QUESTION_IDS, STRESS_QUESTION_KEYS, STRESS_QUESTIONNAIRE_VERSION, type StressAnswerScore, type StressAnswers, type StressQuestionId } from './assessments/stress';
import { calculateWellBeingAssessment, WELLBEING_QUESTION_IDS, WELLBEING_QUESTION_KEYS, WELLBEING_QUESTIONNAIRE_VERSION, type WellBeingAnswerScore, type WellBeingAnswers, type WellBeingQuestionId } from './assessments/wellbeing';
import { MENTAL_STATE_KEYS, createMentalStateData, validate_mental_state } from './mentalState';
import { computePsychSleepQuality } from '../../engine/scores/sleep';
import { defaultSleepLogValues, SleepLogFields, type SleepLogValues } from '../../ui/SleepLogFields';
import { buildMentalPredictionFromAssessments } from '../../services/predictionCompleteness';
import { PredictionPanel } from '../../ui/PredictionPanel';
import { BrainDoodles } from './BrainDoodles';

const stressQuestions = [
  'À quelle fréquence avez-vous ressenti une tension ou une pression émotionnelle difficile à gérer ?',
  'À quelle fréquence vous êtes-vous senti·e dépassé·e par les responsabilités et exigences de la mission ?',
  'À quelle fréquence avez-vous eu des inquiétudes concernant votre sécurité ou celle de l’équipage ?',
  'À quelle fréquence avez-vous eu du mal à vous détendre, même pendant les périodes de repos ?',
  'À quelle fréquence avez-vous été irritable ou avez-vous eu des réactions émotionnelles inhabituelles ?',
  'À quelle fréquence avez-vous ressenti de la solitude ou une distance émotionnelle avec vos proches ?',
  'À quelle fréquence avez-vous eu du mal à vous concentrer à cause de préoccupations personnelles ou professionnelles ?',
  'À quelle fréquence avez-vous eu l’impression de perdre le contrôle de votre organisation quotidienne ?',
  'À quelle fréquence vous êtes-vous senti·e calme et capable de gérer les difficultés rencontrées ?',
  'À quelle fréquence vous êtes-vous senti·e soutenu·e et en confiance avec les autres membres d’équipage ?'
];
const wellBeingQuestions = [
  'Vous êtes-vous senti·e de bonne humeur et joyeux·se ?', 'Vous êtes-vous senti·e calme et détendu·e ?',
  'Vous êtes-vous senti·e actif·ve et plein·e d’énergie ?', 'Vous êtes-vous réveillé·e en vous sentant frais·che et reposé·e ?',
  'Votre vie quotidienne a-t-elle été remplie de choses qui vous intéressent ?'
];
const stressOptions = ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Presque toujours'];
const wellBeingOptions = ['Tout le temps', 'La plupart du temps', 'Plus de la moitié du temps', 'Moins de la moitié du temps', 'Parfois', 'Jamais'];
const stressInterpretation: Record<string, string> = {
  LOW: 'Les réponses indiquent un niveau relativement faible de stress perçu. Gardez vos routines, vos temps de repos et les échanges positifs avec l’équipage.',
  MEDIUM: 'Les réponses indiquent un niveau modéré de stress perçu. Des pauses de relaxation, le suivi du sommeil et un échange avec l’équipage peuvent aider.',
  HIGH: 'Les réponses indiquent un niveau élevé de stress perçu. Envisagez d’en parler au professionnel de santé mentale de la mission.'
};
const wellBeingInterpretation: Record<string, string> = {
  LOW: 'Les réponses indiquent un niveau faible de bien-être psychologique déclaré. Envisagez d’en parler à un professionnel de soutien approprié.',
  MEDIUM: 'Les réponses indiquent un niveau modéré de bien-être déclaré. Des routines saines, du repos et des liens sociaux peuvent le soutenir.',
  HIGH: 'Les réponses indiquent un niveau élevé de bien-être déclaré. Continuez les routines et activités qui contribuent positivement à votre quotidien.'
};

type FlowMode = 'overview' | 'stress-intro' | 'stress-question' | 'stress-review' | 'stress-result' | 'wellbeing-intro' | 'wellbeing-question' | 'wellbeing-review' | 'wellbeing-result' | 'context';
type ContextKey = Exclude<keyof MentalStateData, 'Stress_level' | 'Happiness' | 'Sleep_Quality'>;
const contextOptions: Record<string, readonly string[]> = {
  Mood_Score: ['positive', 'neutral', 'negative'], 'Workload Perception': ['impossible', 'possible', 'easy'],
  Time_Perception: ['Slow', 'Normal', 'Fast'], Food: ['Bad', 'Good', 'Neutral']
};
const contextLabels: Record<string, string> = {
  Mood_Score: 'Humeur', 'Workload Perception': 'Charge de travail perçue', Time_Perception: 'Perception du temps', Food: 'Alimentation', Communication_with_Earth_mins: 'Communication avec les proches (heures)'
};

export const MentalPage: React.FC = () => {
  const { t } = useTranslation();
  const { astronaut, psychAssessments, stressAssessments, wellBeingAssessments, sleepLogs, sleepScore, addMentalAssessment, addStressAssessment, addWellBeingAssessment, logActivityEvent } = useAstroStore();
  const [mode, setMode] = useState<FlowMode>('overview');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stressDraft, setStressDraft] = useState<Partial<StressAnswers>>({});
  const [wellBeingDraft, setWellBeingDraft] = useState<Partial<WellBeingAnswers>>({});
  const [mentalForm, setMentalForm] = useState<Partial<MentalStateData>>({});
  const [sleepValues, setSleepValues] = useState<SleepLogValues>(defaultSleepLogValues);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const todaySleep = sleepLogs.find((log) => log.date === today);
  const todaySleepScore = todaySleep ? computePsychSleepQuality(todaySleep, sleepLogs.filter((log) => log.date !== today).slice(-7)) : null;
  const latestPsych = [...psychAssessments].filter((item) => item.astronautId === astronaut.id && item.mentalStateData).sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestStress = [...stressAssessments].filter((item) => item.astronautId === astronaut.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  const latestWellBeing = [...wellBeingAssessments].filter((item) => item.astronautId === astronaut.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  const prediction = useMemo(() => buildMentalPredictionFromAssessments(psychAssessments, sleepLogs, stressAssessments, wellBeingAssessments, astronaut.id), [psychAssessments, sleepLogs, stressAssessments, wellBeingAssessments, astronaut.id]);
  const stressResult = useMemo(() => Object.keys(stressDraft).length === 10 ? calculateStressAssessment(stressDraft) : null, [stressDraft]);
  const wellBeingResult = useMemo(() => Object.keys(wellBeingDraft).length === 5 ? calculateWellBeingAssessment(wellBeingDraft) : null, [wellBeingDraft]);
  const isStress = mode.startsWith('stress-');
  const isWellBeing = mode.startsWith('wellbeing-');
  const questions = isStress ? stressQuestions : wellBeingQuestions;
  const answerOptions = isStress ? stressOptions : wellBeingOptions;
  const questionId = isStress ? STRESS_QUESTION_IDS[questionIndex] : WELLBEING_QUESTION_IDS[questionIndex];
  const questionKey = isStress ? STRESS_QUESTION_KEYS[questionIndex] : WELLBEING_QUESTION_KEYS[questionIndex];
  const currentAnswer = isStress ? stressDraft[questionId as StressQuestionId] : wellBeingDraft[questionId as WellBeingQuestionId];
  const answered = isStress ? Object.keys(stressDraft).length === 10 : Object.keys(wellBeingDraft).length === 5;
  const setMental = <K extends ContextKey>(key: K, value: MentalStateData[K]) => setMentalForm((current) => ({ ...current, [key]: value }));
  const sleepLogForTest = { id: todaySleep?.id ?? 'preview', astronautId: todaySleep?.astronautId ?? astronaut.id, date: today, ...sleepValues, latencyBucket: sleepValues.latencyBucket || '<15' };
  const hasSleepInputs = Number.isFinite(sleepValues.hours) && sleepValues.hours >= 0 && sleepValues.hours <= 16 && /^([01]\d|2[0-3]):[0-5]\d$/.test(sleepValues.bedtime) && ['<15', '15-30', '30-60', '>60'].includes(sleepValues.latencyBucket) && Number.isInteger(sleepValues.awakenings) && sleepValues.awakenings >= 0 && sleepValues.awakenings <= 10 && Number.isInteger(sleepValues.restfulness) && sleepValues.restfulness >= 1 && sleepValues.restfulness <= 5;
  const sleepScoreForTest = hasSleepInputs ? computePsychSleepQuality(sleepLogForTest, sleepLogs.filter((log) => log.date !== today).slice(-7)) : null;
  const contextKeys = MENTAL_STATE_KEYS.filter((key): key is ContextKey => key !== 'Stress_level' && key !== 'Happiness' && key !== 'Sleep_Quality');
  const contextComplete = contextKeys.every((key) => mentalForm[key] !== undefined) && hasSleepInputs && sleepScoreForTest !== null;
  const canStartContext = Boolean(latestStress && latestWellBeing);

  useEffect(() => { logActivityEvent('view'); }, [logActivityEvent]);

  const startFlow = (kind: 'stress' | 'wellbeing') => { setQuestionIndex(0); setSaveError(''); kind === 'stress' ? (setStressDraft({}), setMode('stress-intro')) : (setWellBeingDraft({}), setMode('wellbeing-intro')); };
  const saveStress = async () => {
    if (!stressResult) return;
    setIsSaving(true); setSaveError('');
    try { await addStressAssessment({ answers: stressDraft as StressAnswers, ...stressResult, questionnaireVersion: STRESS_QUESTIONNAIRE_VERSION }); setMode('stress-result'); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Enregistrement impossible. Réessayez.'); }
    finally { setIsSaving(false); }
  };
  const saveWellBeing = async () => {
    if (!wellBeingResult) return;
    setIsSaving(true); setSaveError('');
    try { await addWellBeingAssessment({ answers: wellBeingDraft as WellBeingAnswers, ...wellBeingResult, questionnaireVersion: WELLBEING_QUESTIONNAIRE_VERSION }); setMode('wellbeing-result'); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Enregistrement impossible. Réessayez.'); }
    finally { setIsSaving(false); }
  };
  const submitContext = async () => {
    if (!contextComplete || !latestStress || !latestWellBeing) return;
    setIsSaving(true); setSaveError('');
    try {
      const data = createMentalStateData({
        Stress_level: latestStress.stressLevel === 'HIGH' ? 'High' : latestStress.stressLevel === 'MEDIUM' ? 'Medium' : 'Low',
        Happiness: Math.round(latestWellBeing.wellBeingScore),
        Mood_Score: mentalForm.Mood_Score as MentalStateData['Mood_Score'],
        'Workload Perception': mentalForm['Workload Perception'] as MentalStateData['Workload Perception'],
        Time_Perception: mentalForm.Time_Perception as MentalStateData['Time_Perception'],
        Food: mentalForm.Food as MentalStateData['Food'],
        Communication_with_Earth_mins: mentalForm.Communication_with_Earth_mins as number
      }, sleepScoreForTest as number);
      validate_mental_state(data, { sleepQualityCalculated: true });
      await addMentalAssessment(data, { date: today, ...sleepValues, latencyBucket: sleepValues.latencyBucket as import('../../types').LatencyBucket });
      setMode('overview');
    } catch (error) { setSaveError(error instanceof Error ? `Enregistrement impossible : ${error.message}` : 'Enregistrement impossible. Réessayez.'); }
    finally { setIsSaving(false); }
  };
  const startContext = () => {
    setMentalForm(latestPsych?.mentalStateData ? Object.fromEntries(contextKeys.map((key) => [key, latestPsych.mentalStateData?.[key]])) : {});
    setSleepValues(todaySleep ? { hours: todaySleep.hours, bedtime: todaySleep.bedtime, latencyBucket: todaySleep.latencyBucket, awakenings: todaySleep.awakenings, restfulness: todaySleep.restfulness } : defaultSleepLogValues);
    setMode('context');
  };
  const chartData = (rows: { completedAt: string; value: number }[]) => rows.slice().sort((a, b) => a.completedAt.localeCompare(b.completedAt)).map((row) => ({ date: new Date(row.completedAt).toLocaleDateString(), score: row.value }));

  const intro = (kind: 'stress' | 'wellbeing') => <section className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-9" data-decor-avoid>
    <p className="text-sm font-semibold text-primary">Évaluation {kind === 'stress' ? 'du stress émotionnel' : 'du bonheur et du bien-être'}</p>
    <h2 className="font-serif text-2xl font-bold">{kind === 'stress' ? 'Stress perçu' : 'Bien-être déclaré'}</h2>
    <p className="text-sm text-slate-muted">{kind === 'stress' ? 'Répondez selon votre vécu émotionnel des 7 derniers jours. Choisissez la fréquence qui décrit le mieux chaque situation.' : 'Répondez selon votre ressenti au cours des deux dernières semaines. Cette adaptation AstroHealth est un indicateur de bien-être déclaré, pas un outil diagnostique.'}</p>
    <div className="rounded-xl bg-surface p-4 text-sm">Période : <strong>{kind === 'stress' ? '7 derniers jours' : '14 derniers jours'}</strong> · {kind === 'stress' ? 10 : 5} questions · Résultat non diagnostique.</div>
    <button className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-white" onClick={() => { setQuestionIndex(0); setMode(kind === 'stress' ? 'stress-question' : 'wellbeing-question'); }}>Commencer</button>
    <button className="ml-3 min-h-12 rounded-xl border border-slate-border px-5 font-semibold" onClick={() => setMode('overview')}>Retour</button>
  </section>;

  const wizard = (kind: 'stress' | 'wellbeing') => {
    const isStressFlow = kind === 'stress'; const total = isStressFlow ? 10 : 5; const list = isStressFlow ? stressQuestions : wellBeingQuestions;
    const selected = isStressFlow ? stressDraft[STRESS_QUESTION_IDS[questionIndex]] : wellBeingDraft[WELLBEING_QUESTION_IDS[questionIndex]];
    return <section className="space-y-6 rounded-2xl border border-slate-border bg-white p-6 sm:p-9" data-decor-avoid>
      <div><p className="text-sm font-semibold text-primary">Question {questionIndex + 1} sur {total}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((questionIndex + 1) / total) * 100}%` }}/></div></div>
      <h2 className="font-serif text-2xl font-bold">{list[questionIndex]}</h2>
      <div className="grid gap-2 sm:grid-cols-2">{(isStressFlow ? stressOptions : wellBeingOptions).map((label, index) => <button key={label} aria-pressed={selected === (isStressFlow ? index : 5 - index)} onClick={() => isStressFlow ? setStressDraft((draft) => ({ ...draft, [STRESS_QUESTION_IDS[questionIndex]]: index as StressAnswerScore })) : setWellBeingDraft((draft) => ({ ...draft, [WELLBEING_QUESTION_IDS[questionIndex]]: (5 - index) as WellBeingAnswerScore }))} className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium ${selected === (isStressFlow ? index : 5 - index) ? 'border-primary bg-primary-light text-primary' : 'border-slate-border hover:border-primary/50'}`}>{label}</button>)}</div>
      <div className="flex gap-3"><button disabled={questionIndex === 0} onClick={() => setQuestionIndex((i) => i - 1)} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold disabled:opacity-40">Précédent</button><button disabled={selected === undefined} onClick={() => questionIndex < total - 1 ? setQuestionIndex((i) => i + 1) : setMode(isStressFlow ? 'stress-review' : 'wellbeing-review')} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{questionIndex === total - 1 ? 'Vérifier mes réponses' : 'Suivant'}</button></div>
    </section>;
  };

  const review = (kind: 'stress' | 'wellbeing') => {
    const isStressFlow = kind === 'stress'; const ids = isStressFlow ? STRESS_QUESTION_IDS : WELLBEING_QUESTION_IDS; const list = isStressFlow ? stressQuestions : wellBeingQuestions;
    const draft: Partial<Record<string, number>> = isStressFlow ? stressDraft : wellBeingDraft; const complete = ids.every((id) => draft[id] !== undefined);
    return <section className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-9" data-decor-avoid><header><p className="text-sm font-semibold text-primary">Vérification</p><h2 className="font-serif text-2xl font-bold">Récapitulatif des réponses</h2></header><div className="space-y-3">{ids.map((id, index) => <div key={id} className="rounded-xl bg-surface p-3 text-sm"><p className="text-slate-muted">{index + 1}. {list[index]}</p><p className="mt-1 font-semibold">{isStressFlow ? stressOptions[draft[id] ?? 0] : wellBeingOptions[5 - (draft[id] ?? 0)]}</p></div>)}</div>
      {!complete && <p role="alert" className="text-sm text-red-700">Répondez à toutes les questions avant de valider.</p>}{saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
      <div className="flex gap-3"><button onClick={() => { setQuestionIndex(ids.length - 1); setMode(isStressFlow ? 'stress-question' : 'wellbeing-question'); }} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Modifier</button><button disabled={!complete || isSaving || !(isStressFlow ? stressResult : wellBeingResult)} onClick={isStressFlow ? saveStress : saveWellBeing} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{isSaving ? 'Enregistrement…' : 'Confirmer et enregistrer'}</button></div>
    </section>;
  };

  const result = (kind: 'stress' | 'wellbeing') => {
    const isStressFlow = kind === 'stress'; const row: StressAssessment | WellBeingAssessment | undefined = isStressFlow ? latestStress : latestWellBeing; if (!row) return null;
    const category = isStressFlow ? (row as StressAssessment).stressLevel : (row as WellBeingAssessment).classification;
    const color = category === 'LOW' ? (isStressFlow ? 'green' : 'red') : category === 'MEDIUM' ? 'amber' : (isStressFlow ? 'red' : 'green');
    const scoreText = isStressFlow ? `${(row as StressAssessment).totalScore} / 40` : `${(row as WellBeingAssessment).wellBeingScore.toFixed(1)} / 10`;
    return <section data-decor-avoid className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><p className="text-sm font-semibold text-primary">Résultat enregistré · {new Date(row.completedAt).toLocaleString()}</p><div className={`rounded-2xl border p-6 ${color === 'green' ? 'border-green-200 bg-green-50 text-green-900' : color === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-900'}`}><p className="text-sm">{isStressFlow ? 'Stress perçu' : 'Bien-être déclaré'}</p><p className="mt-1 text-3xl font-bold">{scoreText} · {category}</p></div><p className="text-sm leading-6">{(isStressFlow ? stressInterpretation : wellBeingInterpretation)[category]}</p><p className="text-xs text-slate-muted">Indicateur basé sur des réponses auto-déclarées. Les seuils AstroHealth sont expérimentaux et ne constituent pas une validation clinique.</p><div className="flex flex-wrap gap-3"><button onClick={() => setMode('overview')} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-white">Retour au tableau Mental</button><button onClick={() => startFlow(kind)} className="min-h-12 rounded-xl border border-primary px-5 font-semibold text-primary">Nouvelle évaluation</button></div></section>;
  };

  const contextForm = <section data-decor-avoid className="space-y-6 rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><header><p className="text-sm font-semibold text-primary">Contexte pour la prédiction</p><h2 className="font-serif text-2xl font-bold">Complétez les données complémentaires</h2><p className="text-sm text-slate-muted">Stress et bien-être proviennent automatiquement de vos évaluations dédiées. Seuls ces éléments et le sommeil sont encore renseignés ici.</p></header>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-surface p-4"><p className="text-xs text-slate-muted">Stress perçu</p><strong>{latestStress ? `${latestStress.stressLevel} · ${latestStress.totalScore}/40` : 'À évaluer'}</strong></div><div className="rounded-xl bg-surface p-4"><p className="text-xs text-slate-muted">Bien-être</p><strong>{latestWellBeing ? `${latestWellBeing.wellBeingScore.toFixed(1)}/10 · ${latestWellBeing.classification}` : 'À évaluer'}</strong></div></div>
    <div className="space-y-5">{contextKeys.map((key) => { const options = contextOptions[key]; return <div key={key} className="space-y-2"><label className="font-semibold">{contextLabels[key]}</label>{options ? <div className="flex flex-wrap gap-2">{options.map((option) => <button type="button" aria-pressed={mentalForm[key] === option} key={option} onClick={() => setMental(key, option as never)} className={`rounded-xl border px-4 py-2.5 text-sm ${mentalForm[key] === option ? 'border-primary bg-primary-light text-primary' : 'border-slate-border'}`}>{option}</button>)}</div> : <input aria-label={contextLabels[key]} className="w-full rounded-xl border border-slate-border px-4 py-3" type="number" min={0} step={0.1} value={mentalForm[key] ?? ''} onChange={(e) => setMental(key, (e.target.value === '' ? undefined : Number(e.target.value)) as never)}/>}</div>; })}</div>
    <section className="space-y-4 rounded-2xl border border-slate-border bg-surface p-5"><div><h3 className="font-serif text-xl font-bold">Sommeil</h3><p className="text-sm text-slate-muted">Score calculé depuis les cinq paramètres du journal.</p></div><SleepLogFields values={sleepValues} onChange={setSleepValues}/><p className="text-sm font-semibold text-primary">Qualité du sommeil : {sleepScoreForTest?.toFixed(2) ?? '—'} / 62.53</p></section>
    {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}<div className="flex gap-3"><button onClick={() => setMode('overview')} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Annuler</button><button disabled={!contextComplete || isSaving} onClick={submitContext} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{isSaving ? 'Enregistrement…' : 'Enregistrer le contexte et le sommeil'}</button></div>
  </section>;

  return <div data-brain-page className="relative isolate mx-auto -mx-4 w-[calc(100%+2rem)] sm:-mx-8 sm:w-[calc(100%+4rem)] md:-mx-12 md:w-[calc(100%+6rem)]"><BrainDoodles/><div data-brain-content data-decor-content className="relative z-10 mx-auto max-w-full space-y-8 sm:max-w-xl lg:max-w-2xl">
    <section data-decor-avoid className="border-b border-slate-border pb-4"><h1 className="font-serif text-3xl font-bold">{t('mental.title')}</h1><p className="mt-1 max-w-prose text-sm text-slate-muted">{t('mental.subtitle')}</p></section>
    {mode === 'overview' && <>
      <section data-decor-avoid className="space-y-5 rounded-2xl border border-slate-border bg-surface p-6 sm:p-8"><div className="flex items-center gap-3"><Brain className="text-primary"/><div><h2 className="font-serif text-2xl font-bold">Évaluations psycho-émotionnelles</h2><p className="text-sm text-slate-muted">Deux indicateurs indépendants, sans valeur diagnostique.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-muted">Stress perçu · 7 jours</p><p className="mt-1 text-xl font-bold">{latestStress ? `${latestStress.totalScore}/40 · ${latestStress.stressLevel}` : 'À compléter'}</p><p className="text-xs text-slate-muted">{latestStress ? new Date(latestStress.completedAt).toLocaleDateString() : ''}</p><button onClick={() => startFlow('stress')} className="mt-3 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">{latestStress ? 'Nouvelle évaluation' : 'Commencer'}</button></div><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-muted">Bien-être déclaré · 14 jours</p><p className="mt-1 text-xl font-bold">{latestWellBeing ? `${latestWellBeing.wellBeingScore.toFixed(1)}/10 · ${latestWellBeing.classification}` : 'À compléter'}</p><p className="text-xs text-slate-muted">{latestWellBeing ? new Date(latestWellBeing.completedAt).toLocaleDateString() : ''}</p><button onClick={() => startFlow('wellbeing')} className="mt-3 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">{latestWellBeing ? 'Nouvelle évaluation' : 'Commencer'}</button></div></div>
      </section>
      {stressAssessments.length > 0 && <section data-decor-avoid className="rounded-2xl border border-slate-border bg-white p-5"><h3 className="font-serif text-xl font-bold">Évolution du stress perçu</h3><div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData(stressAssessments.map((item) => ({ completedAt: item.completedAt, value: item.totalScore })))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[0, 40]}/><Tooltip/><Line dataKey="score" stroke="#0b5595" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div></section>}
      {wellBeingAssessments.length > 0 && <section data-decor-avoid className="rounded-2xl border border-slate-border bg-white p-5"><h3 className="font-serif text-xl font-bold">Évolution du bien-être déclaré</h3><div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData(wellBeingAssessments.map((item) => ({ completedAt: item.completedAt, value: item.wellBeingScore })))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[0, 10]}/><Tooltip/><Line dataKey="score" stroke="#0b5595" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div></section>}
      <section data-decor-avoid className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Moon className="text-primary"/><div><h2 className="font-serif text-2xl font-bold">{t('mental.sleepSection')}</h2><p className="text-sm text-slate-muted">{todaySleepScore !== null ? `Qualité sommeil du jour : ${todaySleepScore}/62.53` : sleepScore ? `Dernier score : ${sleepScore.value}/100` : 'Aucune donnée de sommeil calculée.'}</p></div></div><button onClick={() => canStartContext ? startContext() : setSaveError('Complétez d’abord les évaluations stress et bien-être.')} className="min-h-12 rounded-xl border border-primary px-5 font-semibold text-primary">Compléter le contexte et le sommeil</button><div className="grid grid-cols-2 gap-2 sm:grid-cols-7">{sleepLogs.slice(-7).map((log) => <div key={log.id} className="rounded-lg border border-slate-border p-3 text-center"><div className="text-xs text-slate-muted">{log.date.slice(5)}</div><div className="font-semibold">{log.hours} h</div><div className="text-xs">{computePsychSleepQuality(log, sleepLogs.filter((other) => other.date !== log.date).slice(-7))}/62.53</div></div>)}</div>{saveError && <p role="alert" className="text-sm text-amber-800">{saveError}</p>}</section>
      <div data-decor-avoid><PredictionPanel kind="mental" astronautId={astronaut.id} payload={prediction.payload as unknown as Record<string, unknown>} missing={prediction.missing} total={8} onMissingField={() => canStartContext ? startContext() : !latestStress ? startFlow('stress') : startFlow('wellbeing')}/></div>
      {latestPsych && <section data-decor-avoid className="rounded-2xl border border-slate-border bg-white p-5"><h3 className="font-serif text-xl font-bold">Dernier contexte transmis</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{MENTAL_STATE_KEYS.map((key) => <div key={key} className="rounded-lg bg-surface p-3 text-sm"><span className="text-slate-muted">{key}</span><br/><strong>{String(latestPsych.mentalStateData?.[key] ?? '—')}</strong></div>)}</div></section>}
    </>}
    {mode === 'stress-intro' && intro('stress')}{mode === 'wellbeing-intro' && intro('wellbeing')}
    {mode === 'stress-question' && wizard('stress')}{mode === 'wellbeing-question' && wizard('wellbeing')}
    {mode === 'stress-review' && review('stress')}{mode === 'wellbeing-review' && review('wellbeing')}
    {mode === 'stress-result' && result('stress')}{mode === 'wellbeing-result' && result('wellbeing')}
    {mode === 'context' && contextForm}
  </div></div>;
};
