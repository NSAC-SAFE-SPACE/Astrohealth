export const WELLBEING_QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
export type WellBeingQuestionId = typeof WELLBEING_QUESTION_IDS[number];
export type WellBeingAnswerScore = 0 | 1 | 2 | 3 | 4 | 5;
export type WellBeingAnswers = Record<WellBeingQuestionId, WellBeingAnswerScore>;
export type WellBeingLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const WELLBEING_QUESTIONNAIRE_VERSION = 'astrohealth-wellbeing-v1';
export const WELLBEING_SCORE_THRESHOLDS = { mediumMin: 4, highMin: 7, totalMax: 10 } as const;
export const WELLBEING_QUESTION_KEYS = ['positiveMood', 'calmness', 'energy', 'restAndRecovery', 'dailyInterest'] as const;

export function classifyWellBeingScore(score: number): WellBeingLevel {
  if (!Number.isFinite(score) || score < 0 || score > WELLBEING_SCORE_THRESHOLDS.totalMax) throw new Error('Le score de bien-être doit être compris entre 0 et 10.');
  if (score < WELLBEING_SCORE_THRESHOLDS.mediumMin) return 'LOW';
  if (score < WELLBEING_SCORE_THRESHOLDS.highMin) return 'MEDIUM';
  return 'HIGH';
}

export function calculateWellBeingAssessment(answers: Partial<Record<WellBeingQuestionId, number>>): { rawScore: number; wellBeingScore: number; classification: WellBeingLevel } {
  if (Object.keys(answers).length !== WELLBEING_QUESTION_IDS.length || WELLBEING_QUESTION_IDS.some((id) => !Object.prototype.hasOwnProperty.call(answers, id))) {
    throw new Error('Répondez aux cinq questions avant de calculer le résultat.');
  }
  const values = WELLBEING_QUESTION_IDS.map((id) => answers[id]);
  if (values.some((value) => !Number.isInteger(value) || (value as number) < 0 || (value as number) > 5)) throw new Error('Chaque réponse doit être un score entier de 0 à 5.');
  const rawScore = values.reduce<number>((total, value) => total + (value as number), 0);
  const wellBeingScore = rawScore / 2.5;
  return { rawScore, wellBeingScore, classification: classifyWellBeingScore(wellBeingScore) };
}
