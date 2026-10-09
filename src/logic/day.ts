import type { DayState, Program, SessionLog, SessionTemplate } from '../types';
import { byStartDesc, finished } from './history';

export interface Readiness {
  sleepHours: number | null;
  energy: number | null;
  sick: boolean;
  backPain: boolean;
}

/** Green: ≥6h sleep and normal energy. Yellow: 4–6h or tired (energy 1–2). Red: <4h, sick or back pain. */
export function autoDayState(r: Readiness): DayState {
  if (r.sick || r.backPain || (r.sleepHours != null && r.sleepHours < 4)) return 'red';
  if ((r.sleepHours != null && r.sleepHours < 6) || (r.energy != null && r.energy <= 2)) return 'yellow';
  return 'green';
}

export const dayStateLabel: Record<DayState, string> = {
  green: 'ירוק',
  yellow: 'צהוב',
  red: 'אדום',
};

export const dayStateRule: Record<DayState, string> = {
  green: 'אימון מלא',
  yellow: 'סט אחד פחות בכל תרגיל, 3 חזרות ברזרבה, בלי העלאות משקל',
  red: 'גרסת 30 דקות: שני התרגילים הראשונים × 3 סטים, ועוד תרגיל אחד לבחירה',
};

export interface PlannedExercise {
  index: number;
  sets: number;
  optional: boolean;
}

export function planForDay(tpl: SessionTemplate, state: DayState): PlannedExercise[] {
  return tpl.exercises.map((e, index) => {
    if (state === 'yellow') return { index, sets: Math.max(1, e.sets - 1), optional: false };
    if (state === 'red') {
      if (index < 2) return { index, sets: 3, optional: false };
      return { index, sets: Math.min(3, e.sets), optional: true };
    }
    return { index, sets: e.sets, optional: false };
  });
}

/** Rolling rotation: the session after the last one logged, wrapping around. */
export function nextTemplateId(program: Program, sessions: SessionLog[]): string | null {
  const order = program.sessions;
  if (order.length === 0) return null;
  const last = finished(sessions).sort(byStartDesc)[0];
  if (!last) return order[0].id;
  const i = order.findIndex((t) => t.id === last.templateId);
  return order[(i + 1) % order.length].id;
}

export function templateAfter(program: Program, id: string): string {
  const order = program.sessions;
  const i = order.findIndex((t) => t.id === id);
  return order[(i + 1) % order.length].id;
}

// ---- dates ----

const DAY = 24 * 60 * 60 * 1000;

export function parseIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Calibration week (1 or 2), or null once the first 14 days from the program start are over. */
export function calibrationWeek(programStart: string, ts: number): 1 | 2 | null {
  const days = Math.round((startOfDay(ts) - parseIsoDate(programStart)) / DAY);
  if (days < 0 || days >= 14) return null;
  return days < 7 ? 1 : 2;
}

/** Weeks start on Sunday. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()).getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()).getTime();
}
