import { describe, it, expect } from 'vitest';
import { computeDayState, computeActivitySummary } from '../services/activity';
import type { ActivityEvent } from '../types';

describe('Activity Tracking & NASA Calendar Service', () => {
  it('correctly maps daily activity state', () => {
    // State 0: no events
    expect(computeDayState([])).toBe(0);

    // State 1: login or view only
    expect(computeDayState([
      { id: '1', astronautId: 'a', date: '2026-11-14', type: 'login' }
    ])).toBe(1);

    expect(computeDayState([
      { id: '1', astronautId: 'a', date: '2026-11-14', type: 'view' }
    ])).toBe(1);

    // State 2: at least one measurement
    expect(computeDayState([
      { id: '1', astronautId: 'a', date: '2026-11-14', type: 'view' },
      { id: '2', astronautId: 'a', date: '2026-11-14', type: 'measurement' }
    ])).toBe(2);
  });

  it('generates a 20 weeks x 7 days grid (140 days total)', () => {
    const refDate = new Date('2026-11-14T12:00:00Z');
    const summary = computeActivitySummary([], refDate);

    expect(summary.allDays.length).toBe(140);
    expect(summary.gridWeeks.length).toBe(20);
    for (const week of summary.gridWeeks) {
      expect(week.length).toBe(7);
    }
    expect(summary.currentStreak).toBe(0);
    expect(summary.totalMeasurements).toBe(0);
  });

  it('accurately computes active streaks and handles breaks', () => {
    const refDate = new Date('2026-11-14T12:00:00Z');
    const events: ActivityEvent[] = [];

    // Continuous streak for 5 days: Day 0 (today) back to Day 4
    for (let d = 0; d < 5; d++) {
      const dateStr = new Date(refDate.getTime() - d * 86400000).toISOString().split('T')[0];
      events.push({
        id: `e-${d}`,
        astronautId: 'a',
        date: dateStr,
        type: d % 2 === 0 ? 'measurement' : 'login'
      });
    }

    // Day 5 is empty (missed day)

    // Day 6 and 7 had measurements
    for (let d = 6; d < 8; d++) {
      const dateStr = new Date(refDate.getTime() - d * 86400000).toISOString().split('T')[0];
      events.push({
        id: `e-${d}`,
        astronautId: 'a',
        date: dateStr,
        type: 'measurement'
      });
    }

    const summary = computeActivitySummary(events, refDate);
    // Streak is 5 (days 0, 1, 2, 3, 4 until gap at day 5)
    expect(summary.currentStreak).toBe(5);
    expect(summary.totalMeasurements).toBe(5); // 3 recent measurements + 2 older
  });

  it('generates accessible aria labels in French and English for dots', () => {
    const refDate = new Date('2026-11-14T12:00:00Z');
    const todayStr = '2026-11-14';
    const events: ActivityEvent[] = [
      { id: '1', astronautId: 'a', date: todayStr, type: 'measurement' }
    ];

    const summary = computeActivitySummary(events, refDate);
    const todayDot = summary.allDays[summary.allDays.length - 1];

    expect(todayDot.state).toBe(2);
    expect(todayDot.ariaLabelFr).toContain('mesure effectuée');
    expect(todayDot.ariaLabelEn).toContain('measurement recorded');
  });
});
