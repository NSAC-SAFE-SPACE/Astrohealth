import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Moon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAstroStore } from '../../store/useAstroStore';
import type { MentalStateData } from '../../types';
import { calculateStressAssessment, STRESS_QUESTION_IDS, STRESS_QUESTION_KEYS, STRESS_QUESTIONNAIRE_VERSION, type StressAnswerScore, type StressAnswers, type StressQuestionId } from './assessments/stress';
import { calculateWellBeingAssessment, WELLBEING_QUESTION_IDS, WELLBEING_QUESTION_KEYS, WELLBEING_QUESTIONNAIRE_VERSION, type WellBeingAnswerScore, type WellBeingAnswers, type WellBeingQuestionId } from './assessments/wellbeing';
import { MENTAL_STATE_KEYS, createMentalStateFromQuestionnaires, validate_mental_state } from './mentalState';
import { computePsychSleepQuality } from '../../engine/scores/sleep';
import { defaultSleepLogValues, SleepLogFields, type SleepLogValues } from '../../ui/SleepLogFields';
import { buildMentalPrediction } from '../../services/predictionCompleteness';
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

type FlowMode = 'overview' | 'stress-intro' | 'stress-question' | 'stress-review' | 'wellbeing-intro' | 'wellbeing-question' | 'wellbeing-review' | 'context' | 'summary';
type ContextKey = Exclude<keyof MentalStateData, 'Stress_level' | 'Happiness' | 'Sleep_Quality'>;
const contextOptions: Record<string, readonly string[]> = {
  Mood_Score: ['positive', 'neutral', 'negative'], 'Workload Perception': ['impossible', 'possible', 'easy'],
  Time_Perception: ['Slow', 'Normal', 'Fast'], Food: ['Bad', 'Good', 'Neutral']
};
const contextLabels: Record<string, string> = {
  Mood_Score: 'Humeur', 'Workload Perception': 'Charge de travail perçue', Time_Perception: 'Perception du temps', Food: 'Qualité de l’alimentation', Communication_with_Earth_mins: 'Communication avec la Terre (heures)'
};
const contextHelp: Partial<Record<ContextKey, string>> = {
  Mood_Score: 'Sélectionnez positive, neutral ou negative.',
  'Workload Perception': 'Sélectionnez impossible, possible ou easy.',
  Time_Perception: 'Sélectionnez Slow, Normal ou Fast.',
  Food: 'Sélectionnez Bad, Good ou Neutral.',
  Communication_with_Earth_mins: 'Saisissez une durée en heures, supérieure ou égale à 0 (pas de limite supérieure).'
};

export const MentalPage: React.FC = () => {
  const { t } = useTranslation();
  const { astronaut, psychAssessments, stressAssessments, wellBeingAssessments, sleepLogs, sleepScore, addMentalAssessment, logActivityEvent } = useAstroStore();
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
  const latestPsych = [...psychAssessments].filter((item) => item.astronautId === astronaut.id && item.mentalStateData).sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date))[0];
  const latestStress = [...stressAssessments].filter((item) => item.astronautId === astronaut.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  const latestWellBeing = [...wellBeingAssessments].filter((item) => item.astronautId === astronaut.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  const prediction = useMemo(() => buildMentalPrediction(psychAssessments, sleepLogs, astronaut.id), [psychAssessments, sleepLogs, astronaut.id]);
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
  const contextComplete = contextKeys.every((key) => mentalForm[key] !== undefined) && hasSleepInputs && sleepScoreForTest !== null && stressResult !== null && wellBeingResult !== null;
  const completeMentalState = useMemo(() => {
    if (!contextComplete || !stressResult || !wellBeingResult || sleepScoreForTest === null) return null;
    try {
      return createMentalStateFromQuestionnaires(
        stressResult.stressLevel,
        wellBeingResult.wellBeingScore,
        mentalForm as Omit<MentalStateData, 'Stress_level' | 'Happiness' | 'Sleep_Quality'>,
        sleepScoreForTest
      );
    } catch { return null; }
  }, [contextComplete, stressResult, wellBeingResult, mentalForm, sleepScoreForTest]);

  useEffect(() => { logActivityEvent('view'); }, [logActivityEvent]);

  const startFlow = () => {
    setQuestionIndex(0); setStressDraft({}); setWellBeingDraft({}); setMentalForm({});
    setSleepValues(defaultSleepLogValues);
    setSaveError(''); setMode('stress-intro');
  };
  const submitContext = () => { if (contextComplete && completeMentalState) setMode('summary'); };
  const submitCompleteAssessment = async () => {
    if (!completeMentalState || !stressResult || !wellBeingResult || !contextComplete) return;
    setIsSaving(true); setSaveError('');
    try {
      validate_mental_state(completeMentalState, { sleepQualityCalculated: true });
      await addMentalAssessment(
        completeMentalState,
        { date: today, ...sleepValues, latencyBucket: sleepValues.latencyBucket as import('../../types').LatencyBucket },
        {
          stress: { answers: stressDraft as StressAnswers, ...stressResult, questionnaireVersion: STRESS_QUESTIONNAIRE_VERSION },
          wellBeing: { answers: wellBeingDraft as WellBeingAnswers, ...wellBeingResult, questionnaireVersion: WELLBEING_QUESTIONNAIRE_VERSION }
        }
      );
      setMode('overview');
    } catch (error) { setSaveError(error instanceof Error ? `Enregistrement impossible : ${error.message}` : 'Enregistrement impossible. Réessayez.'); }
    finally { setIsSaving(false); }
  };
  const chartData = (rows: { completedAt: string; value: number }[]) => rows.slice().sort((a, b) => a.completedAt.localeCompare(b.completedAt)).map((row) => ({ date: new Date(row.completedAt).toLocaleDateString(), score: row.value }));

  const intro = (kind: 'stress' | 'wellbeing') => <section className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-9" data-decor-avoid>
    <p className="text-sm font-semibold text-primary">Évaluation {kind === 'stress' ? 'du stress émotionnel' : 'du bonheur et du bien-être'}</p>
    <h2 className="font-serif text-2xl font-bold">{kind === 'stress' ? 'Stress perçu' : 'Bien-être déclaré'}</h2>
    <p className="text-sm text-slate-muted">{kind === 'stress' ? 'Répondez selon votre vécu émotionnel des 7 derniers jours. Choisissez la fréquence qui décrit le mieux chaque situation.' : 'Répondez selon votre ressenti au cours des deux dernières semaines. Cette adaptation AstroHealth est un indicateur de bien-être déclaré, pas un outil diagnostique.'}</p>
    <div className="rounded-xl bg-surface p-4 text-sm">Période : <strong>{kind === 'stress' ? '7 derniers jours' : '14 derniers jours'}</strong> · {kind === 'stress' ? 10 : 5} questions · Résultat non diagnostique.</div>
    <button className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-white" onClick={() => { setQuestionIndex(0); setMode(kind === 'stress' ? 'stress-question' : 'wellbeing-question'); }}>{kind === 'stress' ? 'Commencer la collecte' : 'Continuer'}</button>
    <button className="ml-3 min-h-12 rounded-xl border border-slate-border px-5 font-semibold" onClick={() => setMode(kind === 'stress' ? 'overview' : 'stress-review')}>{kind === 'stress' ? 'Retour' : 'Retour à Stress Level'}</button>
  </section>;

  const wizard = (kind: 'stress' | 'wellbeing') => {
    const isStressFlow = kind === 'stress'; const total = isStressFlow ? 10 : 5; const list = isStressFlow ? stressQuestions : wellBeingQuestions;
    const selected = isStressFlow ? stressDraft[STRESS_QUESTION_IDS[questionIndex]] : wellBeingDraft[WELLBEING_QUESTION_IDS[questionIndex]];
    return <section className="space-y-6 rounded-2xl border border-slate-border bg-white p-6 sm:p-9" data-decor-avoid>
      <div><p className="text-sm font-semibold text-primary">Question {questionIndex + 1} sur {total}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((questionIndex + 1) / total) * 100}%` }}/></div></div>
      <h2 className="font-serif text-2xl font-bold">{list[questionIndex]}</h2>
      <div className="grid gap-2 sm:grid-cols-2">{(isStressFlow ? stressOptions : wellBeingOptions).map((label, index) => <button key={label} aria-pressed={selected === (isStressFlow ? index : 5 - index)} onClick={() => isStressFlow ? setStressDraft((draft) => ({ ...draft, [STRESS_QUESTION_IDS[questionIndex]]: index as StressAnswerScore })) : setWellBeingDraft((draft) => ({ ...draft, [WELLBEING_QUESTION_IDS[questionIndex]]: (5 - index) as WellBeingAnswerScore }))} className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium ${selected === (isStressFlow ? index : 5 - index) ? 'border-primary bg-primary-light text-primary' : 'border-slate-border hover:border-primary/50'}`}>{label}</button>)}</div>
      <div className="flex gap-3"><button disabled={isStressFlow && questionIndex === 0} onClick={() => questionIndex > 0 ? setQuestionIndex((i) => i - 1) : setMode('stress-review')} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold disabled:opacity-40">Précédent</button><button disabled={selected === undefined} onClick={() => questionIndex < total - 1 ? setQuestionIndex((i) => i + 1) : setMode(isStressFlow ? 'stress-review' : 'wellbeing-review')} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{questionIndex === total - 1 ? 'Vérifier mes réponses' : 'Suivant'}</button></div>
    </section>;
  };

  const review = (kind: 'stress' | 'wellbeing') => {
    const isStressFlow = kind === 'stress'; const ids = isStressFlow ? STRESS_QUESTION_IDS : WELLBEING_QUESTION_IDS; const list = isStressFlow ? stressQuestions : wellBeingQuestions;
    const draft: Partial<Record<string, number>> = isStressFlow ? stressDraft : wellBeingDraft; const complete = ids.every((id) => draft[id] !== undefined);
    return <section className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-9" data-decor-avoid><header><p className="text-sm font-semibold text-primary">Vérification</p><h2 className="font-serif text-2xl font-bold">Récapitulatif des réponses</h2></header><div className="space-y-3">{ids.map((id, index) => <div key={id} className="rounded-xl bg-surface p-3 text-sm"><p className="text-slate-muted">{index + 1}. {list[index]}</p><p className="mt-1 font-semibold">{isStressFlow ? stressOptions[draft[id] ?? 0] : wellBeingOptions[5 - (draft[id] ?? 0)]}</p></div>)}</div>
      {!complete && <p role="alert" className="text-sm text-red-700">Répondez à toutes les questions avant de valider.</p>}{saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
      <div className="flex gap-3"><button onClick={() => { setQuestionIndex(ids.length - 1); setMode(isStressFlow ? 'stress-question' : 'wellbeing-question'); }} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Modifier</button><button disabled={!complete || !(isStressFlow ? stressResult : wellBeingResult)} onClick={() => setMode(isStressFlow ? 'wellbeing-intro' : 'context')} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{isStressFlow ? 'Continuer vers Happiness & Well-being' : 'Continuer vers les paramètres restants'}</button></div>
    </section>;
  };

  const contextForm = <section data-decor-avoid className="space-y-6 rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><header><p className="text-sm font-semibold text-primary">Étape 3 sur 4</p><h2 className="font-serif text-2xl font-bold">Les six autres paramètres</h2><p className="text-sm text-slate-muted">Les résultats des deux questionnaires alimentent déjà Stress_level et Happiness. Renseignez ici les autres champs du modèle.</p></header>
    <section className="grid gap-3 rounded-2xl border border-slate-border bg-surface p-4 sm:grid-cols-2"><div><h3 className="font-semibold">Stress_level pour le modèle</h3><p className="text-sm text-slate-muted">{stressResult ? `${stressResult.stressLevel} · ${stressResult.totalScore}/40` : 'À compléter'}</p></div><div><h3 className="font-semibold">Happiness pour le modèle</h3><p className="text-sm text-slate-muted">{wellBeingResult ? `${Math.round(wellBeingResult.wellBeingScore)} (score précis : ${wellBeingResult.wellBeingScore.toFixed(2)}/10)` : 'À compléter'}</p></div></section>
    <div className="space-y-5">{contextKeys.map((key) => { const options = contextOptions[key]; const fieldId = key.replaceAll(' ', '-'); return <div key={key} className="space-y-2">{options ? <fieldset aria-describedby={`mental-help-${fieldId}`} className="space-y-2"><legend className="font-semibold">{contextLabels[key]}</legend><div className="flex flex-wrap gap-2">{options.map((option) => <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${mentalForm[key] === option ? 'border-primary bg-primary-light text-primary' : 'border-slate-border'}`}><input className="accent-primary" type="radio" name={`mental-${fieldId}`} value={option} checked={mentalForm[key] === option} onChange={() => setMental(key, option as never)}/><span>{option}</span></label>)}</div><p id={`mental-help-${fieldId}`} className="text-xs text-slate-muted">{contextHelp[key]}</p></fieldset> : <div className="space-y-2"><label htmlFor={`mental-${fieldId}`} className="font-semibold">{contextLabels[key]}</label><input id={`mental-${fieldId}`} aria-describedby={`mental-help-${fieldId}`} className="w-full rounded-xl border border-slate-border px-4 py-3" type="number" min={0} step={0.1} value={mentalForm[key] ?? ''} onChange={(e) => setMental(key, (e.target.value === '' ? undefined : Number(e.target.value)) as never)}/><p id={`mental-help-${fieldId}`} className="text-xs text-slate-muted">{contextHelp[key]}</p></div>}</div>; })}</div>
    <section className="space-y-4 rounded-2xl border border-slate-border bg-surface p-5"><div><h3 className="font-serif text-xl font-bold">Sommeil</h3><p className="text-sm text-slate-muted">Renseignez les cinq paramètres bruts du journal ; la qualité est calculée par la fonction existante, entre 0 et 62,53.</p></div><SleepLogFields values={sleepValues} onChange={setSleepValues}/><p className="text-sm font-semibold text-primary">Qualité du sommeil calculée : {sleepScoreForTest?.toFixed(2) ?? '—'} / 62.53</p></section>
    {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}<div className="flex flex-wrap gap-3"><button onClick={() => setMode('wellbeing-review')} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Retour à l’étape précédente</button><button onClick={() => setMode('overview')} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Abandonner</button><button disabled={!contextComplete || !completeMentalState} onClick={submitContext} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">Voir le récapitulatif</button></div>
  </section>;

  const summaryRows = completeMentalState ? [
    ['Stress Level', completeMentalState.Stress_level],
    ['Happiness', String(completeMentalState.Happiness)],
    ['Mood Score', completeMentalState.Mood_Score],
    ['Sleep Quality', completeMentalState.Sleep_Quality.toFixed(2)],
    ['Workload Perception', completeMentalState['Workload Perception']],
    ['Time Perception', completeMentalState.Time_Perception],
    ['Food', completeMentalState.Food],
    ['Communication with Earth', `${completeMentalState.Communication_with_Earth_mins} heures`]
  ] : [];
  const summary = <section data-decor-avoid className="space-y-6 rounded-2xl border border-slate-border bg-white p-6 sm:p-9"><header><p className="text-sm font-semibold text-primary">Étape 4 sur 4</p><h2 className="font-serif text-2xl font-bold">Récapitulatif de l’évaluation</h2><p className="text-sm text-slate-muted">Vérifiez les huit paramètres qui seront enregistrés et utilisés pour la prédiction.</p></header>
    {completeMentalState && <><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-slate-border"><th className="py-3 pr-4">Paramètre</th><th className="py-3">Valeur obtenue</th></tr></thead><tbody>{summaryRows.map(([label, value]) => <tr key={label} className="border-b border-slate-border/70"><th scope="row" className="py-3 pr-4 font-medium">{label}</th><td className="py-3">{value}</td></tr>)}</tbody></table></div>
      <section className="grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-2"><div><h3 className="font-semibold">Stress Level</h3><p className="text-sm text-slate-muted">{stressResult?.totalScore}/40 · {stressResult?.stressLevel}</p></div><div><h3 className="font-semibold">Happiness & Well-being</h3><p className="text-sm text-slate-muted">{wellBeingResult?.rawScore}/25 · score précis {wellBeingResult?.wellBeingScore.toFixed(2)}/10 · valeur modèle {completeMentalState.Happiness} (arrondie à l’entier le plus proche)</p></div></section></>}
    {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
    <div className="flex flex-wrap gap-3"><button onClick={() => setMode('stress-review')} className="min-h-12 rounded-xl border border-slate-border px-4 font-semibold">Modifier Stress Level</button><button onClick={() => setMode('wellbeing-review')} className="min-h-12 rounded-xl border border-slate-border px-4 font-semibold">Modifier Happiness</button><button onClick={() => setMode('context')} className="min-h-12 rounded-xl border border-slate-border px-4 font-semibold">Modifier les six autres champs</button></div>
    <div className="flex gap-3"><button onClick={() => setMode('context')} className="min-h-12 rounded-xl border border-slate-border px-5 font-semibold">Retour</button><button disabled={!contextComplete || !completeMentalState || isSaving} onClick={submitCompleteAssessment} className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-40">{isSaving ? 'Enregistrement…' : 'Valider et enregistrer l’évaluation'}</button></div>
  </section>;

  return <div data-brain-page className="relative isolate mx-auto -mx-4 w-[calc(100%+2rem)] sm:-mx-8 sm:w-[calc(100%+4rem)] md:-mx-12 md:w-[calc(100%+6rem)]"><BrainDoodles/><div data-brain-content data-decor-content className="relative z-10 mx-auto max-w-full space-y-8 sm:max-w-xl lg:max-w-2xl">
    <section data-decor-avoid className="border-b border-slate-border pb-4"><h1 className="font-serif text-3xl font-bold">{t('mental.title')}</h1><p className="mt-1 max-w-prose text-sm text-slate-muted">{t('mental.subtitle')}</p></section>
    {mode === 'overview' && <>
      <section data-decor-avoid className="space-y-5 rounded-2xl border border-slate-border bg-surface p-6 sm:p-8"><div className="flex items-center gap-3"><Brain className="text-primary"/><div><h2 className="font-serif text-2xl font-bold">Évaluation psycho-émotionnelle</h2><p className="text-sm text-slate-muted">Parcours complet : Stress Level, Happiness & Well-being, puis les six autres paramètres du modèle.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-muted">Stress perçu · 7 jours</p><p className="mt-1 text-xl font-bold">{latestStress ? `${latestStress.totalScore}/40 · ${latestStress.stressLevel}` : 'À compléter'}</p><p className="text-xs text-slate-muted">{latestStress ? new Date(latestStress.completedAt).toLocaleDateString() : ''}</p></div><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-muted">Bien-être déclaré · 14 jours</p><p className="mt-1 text-xl font-bold">{latestWellBeing ? `${latestWellBeing.wellBeingScore.toFixed(1)}/10 · ${latestWellBeing.classification}` : 'À compléter'}</p><p className="text-xs text-slate-muted">{latestWellBeing ? new Date(latestWellBeing.completedAt).toLocaleDateString() : ''}</p></div></div><button onClick={startFlow} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-white">Nouvelle évaluation complète</button>
      </section>
      {stressAssessments.length > 0 && <section data-decor-avoid className="rounded-2xl border border-slate-border bg-white p-5"><h3 className="font-serif text-xl font-bold">Évolution du stress perçu</h3><div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData(stressAssessments.map((item) => ({ completedAt: item.completedAt, value: item.totalScore })))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[0, 40]}/><Tooltip/><Line dataKey="score" stroke="#0b5595" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div></section>}
      {wellBeingAssessments.length > 0 && <section data-decor-avoid className="rounded-2xl border border-slate-border bg-white p-5"><h3 className="font-serif text-xl font-bold">Évolution du bien-être déclaré</h3><div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData(wellBeingAssessments.map((item) => ({ completedAt: item.completedAt, value: item.wellBeingScore })))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[0, 10]}/><Tooltip/><Line dataKey="score" stroke="#0b5595" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div></section>}
      <section data-decor-avoid className="space-y-5 rounded-2xl border border-slate-border bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Moon className="text-primary"/><div><h2 className="font-serif text-2xl font-bold">{t('mental.sleepSection')}</h2><p className="text-sm text-slate-muted">{todaySleepScore !== null ? `Qualité sommeil du jour : ${todaySleepScore}/62.53` : sleepScore ? `Dernier score : ${sleepScore.value}/100` : 'Aucune donnée de sommeil calculée.'}</p></div></div><button onClick={startFlow} className="min-h-12 rounded-xl border border-primary px-5 font-semibold text-primary">Commencer une évaluation complète</button><div className="grid grid-cols-2 gap-2 sm:grid-cols-7">{sleepLogs.slice(-7).map((log) => <div key={log.id} className="rounded-lg border border-slate-border p-3 text-center"><div className="text-xs text-slate-muted">{log.date.slice(5)}</div><div className="font-semibold">{log.hours} h</div><div className="text-xs">{computePsychSleepQuality(log, sleepLogs.filter((other) => other.date !== log.date).slice(-7))}/62.53</div></div>)}</div>{saveError && <p role="alert" className="text-sm text-amber-800">{saveError}</p>}</section>
      <div data-decor-avoid><PredictionPanel kind="mental" astronautId={astronaut.id} payload={prediction.payload as unknown as Record<string, unknown>} missing={prediction.missing} total={8} onMissingField={startFlow}/></div>
      {latestPsych && <section data-decor-avoid className="rounded-2xl border border-slate-border bg-white p-5"><h3 className="font-serif text-xl font-bold">Dernier contexte transmis</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{MENTAL_STATE_KEYS.map((key) => <div key={key} className="rounded-lg bg-surface p-3 text-sm"><span className="text-slate-muted">{key}</span><br/><strong>{String(latestPsych.mentalStateData?.[key] ?? '—')}</strong></div>)}</div></section>}
    </>}
    {mode === 'stress-intro' && intro('stress')}{mode === 'wellbeing-intro' && intro('wellbeing')}
    {mode === 'stress-question' && wizard('stress')}{mode === 'wellbeing-question' && wizard('wellbeing')}
    {mode === 'stress-review' && review('stress')}{mode === 'wellbeing-review' && review('wellbeing')}
    {mode === 'context' && contextForm}{mode === 'summary' && summary}
  </div></div>;
};
