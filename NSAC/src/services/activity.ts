import { db } from '../db';
import type { ActivityEvent } from '../types';

export type ActivityDayState = 0 | 1 | 2;

export interface ActivityDayInfo {
  date: string; // YYYY-MM-DD
  state: ActivityDayState;
  hasMeasurement: boolean;
  hasViewOrLogin: boolean;
  eventCount: number;
  measurementCount: number;
  daysAgo: number;
  ariaLabelFr: string;
  ariaLabelEn: string;
}

export interface ActivitySummary {
  totalMeasurements: number;
  currentStreak: number;
  gridWeeks: ActivityDayInfo[][]; // 20 weeks of 7 days (columns)
  allDays: ActivityDayInfo[];
}

/**
 * Logs an activity event to IndexedDB without blocking the UI.
 */
export async function logActivityEvent(
  type: 'login' | 'view' | 'measurement',
  astronautId: string = 'astro-01',
  dateStr?: string
): Promise<void> {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    await db.activityEvents.put({
      id,
      astronautId,
      date,
      type
    });
  } catch (err) {
    console.warn('Failed to persist activity event offline:', err);
  }
}

/**
 * Computes the day state (0 = none, 1 = view/login, 2 = measurement)
 */
export function computeDayState(events: ActivityEvent[]): ActivityDayState {
  if (events.length === 0) return 0;
  const hasMeasurement = events.some((e) => e.type === 'measurement');
  if (hasMeasurement) return 2;
  const hasViewOrLogin = events.some((e) => e.type === 'login' || e.type === 'view');
  return hasViewOrLogin ? 1 : 0;
}

/**
 * Computes active streak and generates a 20 weeks x 7 days matrix (140 days)
 * aligned with GitHub-style column-based rendering.
 */
export function computeActivitySummary(
  events: ActivityEvent[],
  referenceDate: Date = new Date()
): ActivitySummary {
  // Group events by date
  const eventsByDate = new Map<string, ActivityEvent[]>();
  let totalMeasurements = 0;

  for (const ev of events) {
    if (!eventsByDate.has(ev.date)) {
      eventsByDate.set(ev.date, []);
    }
    eventsByDate.get(ev.date)!.push(ev);
    if (ev.type === 'measurement') {
      totalMeasurements++;
    }
  }

  const allDays: ActivityDayInfo[] = [];
  const TOTAL_DAYS = 140; // 20 weeks * 7 days

  for (let d = TOTAL_DAYS - 1; d >= 0; d--) {
    const curDate = new Date(referenceDate.getTime() - d * 86400000);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayEvents = eventsByDate.get(dateStr) || [];
    const state = computeDayState(dayEvents);
    const mCount = dayEvents.filter((e) => e.type === 'measurement').length;

    let labelFr = `Jour ${dateStr} : aucune activité`;
    let labelEn = `Day ${dateStr}: no activity`;
    if (state === 2) {
      labelFr = d === 0 ? "Aujourd'hui : mesure effectuée" : `Il y a ${d} jours : mesure effectuée`;
      labelEn = d === 0 ? 'Today: measurement recorded' : `${d} days ago: measurement recorded`;
    } else if (state === 1) {
      labelFr = d === 0 ? "Aujourd'hui : consultation sans mesure" : `Il y a ${d} jours : consultation sans mesure`;
      labelEn = d === 0 ? 'Today: consultation without measurement' : `${d} days ago: consultation without measurement`;
    }

    allDays.push({
      date: dateStr,
      state,
      hasMeasurement: state === 2,
      hasViewOrLogin: state === 1,
      eventCount: dayEvents.length,
      measurementCount: mCount,
      daysAgo: d,
      ariaLabelFr: labelFr,
      ariaLabelEn: labelEn
    });
  }

  // Calculate current streak (consecutive days with state >= 1 leading up to today)
  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].state >= 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Group into 20 columns (weeks) of 7 days
  const gridWeeks: ActivityDayInfo[][] = [];
  for (let w = 0; w < 20; w++) {
    const week = allDays.slice(w * 7, (w + 1) * 7);
    gridWeeks.push(week);
  }

  return {
    totalMeasurements,
    currentStreak,
    gridWeeks,
    allDays
  };
}
