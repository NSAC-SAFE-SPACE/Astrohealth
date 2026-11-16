export const STRESS_QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;
export type StressQuestionId = typeof STRESS_QUESTION_IDS[number];
export type StressAnswerScore = 0 | 1 | 2 | 3 | 4;
export type StressAnswers = Record<StressQuestionId, StressAnswerScore>;
export type StressLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const STRESS_QUESTIONNAIRE_VERSION = 'astrohealth-stress-v1';
export const STRESS_SCORE_THRESHOLDS = { lowMax: 13, mediumMax: 26, totalMax: 40 } as const;
export const STRESS_QUESTION_KEYS = [
  'emotionalTension', 'mentalWorkload', 'missionAnxiety', 'relaxation', 'emotionalStability',
  'emotionalIsolation', 'concentration', 'senseOfControl', 'resilience', 'socialSupport'
] as const;

export function classifyStressScore(score: number): StressLevel {
  if (!Number.isInteger(score) || score < 0 || score > STRESS_SCORE_THRESHOLDS.totalMax) throw new Error('Le score de stress doit être un entier compris entre 0 et 40.');
  if (score <= STRESS_SCORE_THRESHOLDS.lowMax) return 'LOW';
  if (score <= STRESS_SCORE_THRESHOLDS.mediumMax) return 'MEDIUM';
  return 'HIGH';
}

export function calculateStressAssessment(answers: Partial<Record<StressQuestionId, number>>): { totalScore: number; stressLevel: StressLevel } {
  if (Object.keys(answers).length !== STRESS_QUESTION_IDS.length || STRESS_QUESTION_IDS.some((id) => !Object.prototype.hasOwnProperty.call(answers, id))) {
    throw new Error('Répondez aux dix questions avant de calculer le résultat.');
  }
  const values = STRESS_QUESTION_IDS.map((id) => answers[id]);
  if (values.some((value) => !Number.isInteger(value) || (value as number) < 0 || (value as number) > 4)) throw new Error('Chaque réponse doit être un score entier de 0 à 4.');
  const totalScore = values.reduce<number>((total, value, index) => total + (index >= 8 ? 4 - (value as number) : value as number), 0);
  return { totalScore, stressLevel: classifyStressScore(totalScore) };
}
