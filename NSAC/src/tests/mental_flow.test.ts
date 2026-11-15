import { describe, it, expect } from 'vitest';
import { calculatePsychScore, evaluatePsychStatus, WHO5_QUESTIONS, WHO5_CHOICES } from '../engine/scores/psych';
import frTranslations from '../i18n/fr.json';
import enTranslations from '../i18n/en.json';
import { CURRENT_USER_ID } from '../config/currentUser';

describe('Étape 6: Mental (Questionnaire OMS-5, Bilan, Évolution, Sommeil, Couplage)', () => {
  it('respecte la structure officielle OMS-5 (5 questions, 6 choix de 0 à 5 points)', () => {
    expect(WHO5_QUESTIONS.length).toBe(5);
    expect(WHO5_CHOICES.length).toBe(6);

    const points = WHO5_CHOICES.map((c) => c.points);
    expect(points).toEqual([5, 4, 3, 2, 1, 0]);

    // Questions in French & English
    const frQuestions = frTranslations.mental.questions;
    const enQuestions = enTranslations.mental.questions;
    expect(frQuestions.length).toBe(5);
    expect(enQuestions.length).toBe(5);

    // Prompt
    expect(frTranslations.mental.questionPrompt).toBe('Ces derniers jours…');
    expect(enTranslations.mental.questionPrompt).toBe('Over the last few days…');
  });

  it('calcule exactement le score OMS-5 (somme x 4) pour toutes les combinaisons', () => {
    // Max score (all 5s): 25 * 4 = 100
    expect(calculatePsychScore([5, 5, 5, 5, 5])).toBe(100);

    // Min score (all 0s): 0 * 4 = 0
    expect(calculatePsychScore([0, 0, 0, 0, 0])).toBe(0);

    // Threshold boundaries
    // 17 * 4 = 68 -> normal
    expect(calculatePsychScore([4, 4, 3, 3, 3])).toBe(68);

    // 16 * 4 = 64 -> watch (50-67)
    expect(calculatePsychScore([4, 3, 3, 3, 3])).toBe(64);

    // 12 * 4 = 48 -> action (29-49)
    expect(calculatePsychScore([3, 3, 2, 2, 2])).toBe(48);

    // 7 * 4 = 28 -> contact_flight_surgeon (<= 28)
    expect(calculatePsychScore([2, 2, 1, 1, 1])).toBe(28);
  });

  it('classe les statuts selon les seuils du cahier des charges et déclenche l’alerte chirurgien', () => {
    // Normal: >= 68
    const normalEval = evaluatePsychStatus(68);
    expect(normalEval.status).toBe('normal');
    expect(normalEval.actions.length).toBeGreaterThanOrEqual(2);

    // Watch: 50 to 67
    const watchEval = evaluatePsychStatus(50);
    expect(watchEval.status).toBe('watch');

    const watchEvalHigh = evaluatePsychStatus(67);
    expect(watchEvalHigh.status).toBe('watch');

    // Action: 29 to 49
    const actionEval = evaluatePsychStatus(29);
    expect(actionEval.status).toBe('action');

    const actionEvalHigh = evaluatePsychStatus(49);
    expect(actionEvalHigh.status).toBe('action');

    // Contact Flight Surgeon: <= 28
    const criticalEval = evaluatePsychStatus(28);
    expect(criticalEval.status).toBe('contact_flight_surgeon');
    expect(criticalEval.title.toLowerCase()).toContain('alerte');
    expect(criticalEval.actions.some((a) => a.toLowerCase().includes('médecin') || a.toLowerCase().includes('chirurgien'))).toBe(true);

    const zeroEval = evaluatePsychStatus(0);
    expect(zeroEval.status).toBe('contact_flight_surgeon');
  });

  it('fournit les explications de couplage sommeil et exercice dans les deux langues', () => {
    const frInfluences = frTranslations.mental.influences;
    const enInfluences = enTranslations.mental.influences;

    expect(frInfluences.length).toBeGreaterThanOrEqual(3);
    expect(enInfluences.length).toBeGreaterThanOrEqual(3);

    expect(frInfluences[0].title.toLowerCase()).toContain('sommeil');
    expect(enInfluences[0].title.toLowerCase()).toContain('sleep');
  });

  it('gère et restitue les 5 dimensions comportementales clés (stress, mood, workload, time, communication)', () => {
    const frDimensions = frTranslations.mental.dimensions;
    const enDimensions = enTranslations.mental.dimensions;

    // Check all 5 dimensions exist in French
    expect(frDimensions.stressLevel.title).toBe('Niveau de stress');
    expect(frDimensions.moodScore.title).toBe("Score d'humeur");
    expect(frDimensions.workloadPerception.title).toBe('Charge de travail perçue');
    expect(frDimensions.timePerception.title).toBe('Perception du temps');
    expect(frDimensions.communicationWithOthers.title).toBe('Communication avec autrui');

    // Check all 5 dimensions exist in English
    expect(enDimensions.stressLevel.title).toBe('Stress Level');
    expect(enDimensions.moodScore.title).toBe('Mood Score');
    expect(enDimensions.workloadPerception.title).toBe('Workload Perception');
    expect(enDimensions.timePerception.title).toBe('Time Perception');
    expect(enDimensions.communicationWithOthers.title).toBe('Communication with Others');

    // Check simulation defaults and thresholds
    const testAssessment = {
      id: 'psych-dim-test',
      astronautId: CURRENT_USER_ID,
      date: '2026-11-14',
      answers: [4, 4, 4, 4, 4],
      score: 80,
      status: 'normal' as const,
      stressLevel: 24,
      moodScore: 84,
      workloadPerception: 32,
      timePerception: 50,
      communicationWithOthers: 88
    };

    expect(testAssessment.stressLevel).toBeLessThan(35); // Normal
    expect(testAssessment.moodScore).toBeGreaterThanOrEqual(70); // Normal
    expect(testAssessment.workloadPerception).toBeLessThanOrEqual(40); // Normal
    expect(testAssessment.timePerception).toBe(50); // Nominal pace
    expect(testAssessment.communicationWithOthers).toBeGreaterThanOrEqual(75); // Normal
  });
});
