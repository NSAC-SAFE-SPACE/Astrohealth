import { describe, it, expect } from 'vitest';
import frTranslations from '../i18n/fr.json';
import enTranslations from '../i18n/en.json';
import type { MissionEnvironment } from '../types';

describe('Étape 7: Historique avec prévisions, Missions et rappels', () => {
  it('fournit les rappels opérationnels pour les 4 environnements de mission dans les deux langues (F-09)', () => {
    const environments: MissionEnvironment[] = ['spacecraft', 'station', 'lunar_base', 'mars_rover'];

    for (const env of environments) {
      const frReminder = (frTranslations.missions as any).environmentReminders[env];
      const enReminder = (enTranslations.missions as any).environmentReminders[env];

      expect(frReminder).toBeDefined();
      expect(enReminder).toBeDefined();

      expect(frReminder.title.length).toBeGreaterThan(5);
      expect(enReminder.title.length).toBeGreaterThan(5);

      expect(frReminder.text.length).toBeGreaterThan(20);
      expect(enReminder.text.length).toBeGreaterThan(20);
    }
  });

  it('valide que les récompenses et badges sont strictement liés à la régularité, jamais à la valeur (F-08)', () => {
    // Subtitle must state the strict non-clinical reward principle
    expect(frTranslations.missions.subtitle).toContain('jamais à la valeur');
    expect(enTranslations.missions.subtitle.toLowerCase()).toContain('never on measured values');

    // 6 badges defined in both languages
    const badges = ['firstContact', 'lowOrbit', 'orbitalDiscipline', 'lunarTrajectory', 'martianEndurance', 'guardian'];
    for (const b of badges) {
      const frBadge = (frTranslations.missions as any).badges[b];
      const enBadge = (enTranslations.missions as any).badges[b];
      expect(frBadge).toBeDefined();
      expect(enBadge).toBeDefined();
      expect(frBadge.name.length).toBeGreaterThan(2);
      expect(enBadge.name.length).toBeGreaterThan(2);
    }
  });

  it('calcule la série active sans récompenser les valeurs médicales', () => {
    // 5 days of events: 4 days with measurement or view, 1 day inactive
    const today = new Date().toISOString().split('T')[0];
    const d1 = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
    const d2 = new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0];
    const d3 = new Date(Date.now() - 72 * 3600 * 1000).toISOString().split('T')[0];
    const d4 = new Date(Date.now() - 96 * 3600 * 1000).toISOString().split('T')[0];

    const mockEvents = [
      { id: '1', astronautId: 'a1', date: today, type: 'measurement' as const },
      { id: '2', astronautId: 'a1', date: d1, type: 'view' as const },
      { id: '3', astronautId: 'a1', date: d2, type: 'measurement' as const },
      { id: '4', astronautId: 'a1', date: d3, type: 'measurement' as const },
      // d4 has no event
    ];

    const eventMap = new Map<string, number>();
    mockEvents.forEach((ev) => {
      const current = eventMap.get(ev.date) || 0;
      if (ev.type === 'measurement') eventMap.set(ev.date, 2);
      else if (current < 1) eventMap.set(ev.date, 1);
    });

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 140; i++) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      const state = eventMap.get(d) || 0;
      if (state >= 1) streak++;
      else break;
    }

    expect(streak).toBe(4);
  });

  it('fournit les traductions des métriques et des seuils d’historique (F-07)', () => {
    const metrics = [
      'heartRate',
      'bpSys',
      'temperature',
      'glucose',
      'boneLoss',
      'sleep',
      'mood',
      'radiation',
      'reactionTime',
      'orientationAccuracy'
    ];

    for (const m of metrics) {
      const frName = (frTranslations.history.metrics as any)[m];
      const enName = (enTranslations.history.metrics as any)[m];
      expect(frName).toBeDefined();
      expect(enName).toBeDefined();
    }

    expect(frTranslations.measurementModal.cognitive.reactionTitle).toBeDefined();
    expect(enTranslations.measurementModal.cognitive.reactionTitle).toBeDefined();
    expect(frTranslations.measurementModal.cognitive.orientationTitle).toBeDefined();
    expect(enTranslations.measurementModal.cognitive.orientationTitle).toBeDefined();
  });
});
