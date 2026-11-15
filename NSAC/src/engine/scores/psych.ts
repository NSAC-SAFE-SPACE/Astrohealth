import type { Status, PsychAssessment } from '../../types';
import thresholdsConfig from '../config/thresholds.json';

export interface PsychEvaluationResult {
  score: number; // 0-100
  status: Status;
  title: string;
  explanation: string;
  actions: string[];
}

export const WHO5_QUESTIONS = [
  'Je me suis senti(e) bien et de bonne humeur.',
  'Je me suis senti(e) calme et tranquille.',
  'Je me suis senti(e) plein(e) d’énergie.',
  'Je me suis réveillé(e) en me sentant frais et dispos.',
  'Ma vie quotidienne a été remplie de choses intéressantes.'
];

export const WHO5_CHOICES = [
  { label: 'Tout le temps', points: 5 },
  { label: 'La plupart du temps', points: 4 },
  { label: 'Plus de la moitié du temps', points: 3 },
  { label: 'Moins de la moitié du temps', points: 2 },
  { label: 'De temps en temps', points: 1 },
  { label: 'Jamais', points: 0 }
];

export function calculatePsychScore(answers: number[]): number {
  if (answers.length !== 5) {
    throw new Error('Le questionnaire OMS-5 requiert exactement 5 réponses.');
  }
  const sum = answers.reduce((acc, ans) => acc + Math.min(Math.max(ans, 0), 5), 0);
  return sum * 4;
}

export function evaluatePsychStatus(score: number): PsychEvaluationResult {
  const config = thresholdsConfig.psych.status;

  let status: Status = 'normal';
  let title = '';
  let explanation = '';
  const actions: string[] = [];

  if (score >= config.normalMin) {
    status = 'normal';
    title = 'Bien-être psychologique optimal';
    explanation = `Votre score est de ${score}/100. Vous témoignez d'un niveau satisfaisant de vitalité, de sérénité et d'intérêt pour vos activités.`;
    actions.push('Maintenir vos routines positives de détente et de cohésion.');
    actions.push('Poursuivre la communication avec vos proches et vos coéquipiers.');
  } else if (score >= config.watchMin) {
    status = 'watch';
    title = 'Bien-être à surveiller';
    explanation = `Votre score est de ${score}/100. Une baisse modérée d'énergie ou d'humeur est constatée ces derniers jours.`;
    actions.push('Favoriser des moments de pause calme et de sommeil réparateur.');
    actions.push('Partager vos ressentis avec un coéquipier de confiance.');
    actions.push('Refaire le bilan dans 3 à 4 jours.');
  } else if (score >= config.actionMin) {
    status = 'action';
    title = 'Baisse notable du moral ou de la motivation';
    explanation = `Votre score est de ${score}/100. Vous traversez une période de charge mentale ou de fatigue émotionnelle importante.`;
    actions.push('Aménager des temps d’intimité et de loisirs audio/visuels personnels.');
    actions.push('Discuter d’un aménagement du planning avec le commandant de bord.');
    actions.push('Utiliser les exercices de respiration et de relaxation de bord.');
  } else {
    status = 'contact_flight_surgeon';
    title = 'Alerte bien-être psychologique';
    explanation = `Votre score est de ${score}/100. Cet état de détresse ou d’épuisement nécessite un soutien immédiat.`;
    actions.push('Prendre contact immédiatement avec le médecin ou le soutien psychologique de mission.');
    actions.push('Cette alerte est automatiquement consignée dans le rapport de vol confidentiel.');
    actions.push('Vous reposer sans délai dans votre sas de sommeil.');
  }

  return {
    score,
    status,
    title,
    explanation,
    actions
  };
}
