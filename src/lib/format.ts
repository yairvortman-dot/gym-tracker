import type { ExerciseLog, SetLog, WeightMode } from '../types';

export const fmtNum = (n: number) => String(Math.round(n * 100) / 100);

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const weekday = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export function fmtDate(ts: number, withYear = false): string {
  const d = new Date(ts);
  const date = withYear ? `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}` : `${d.getDate()}.${d.getMonth() + 1}`;
  return `יום ${weekday[d.getDay()]} ${date}`;
}

export const fmtShortDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}`;
};

export const fmtTime = (ts: number) => new Date(ts).toTimeString().slice(0, 5);

/** Rest range in minutes ("2–3", "1.5"). Wrap it in <Num> so the range doesn't flip in RTL. */
export function fmtRest(minSec: number, maxSec: number): string {
  const m = (s: number) => fmtNum(s / 60);
  if (minSec <= 0) return '';
  return minSec === maxSec ? m(minSec) : `${m(minSec)}–${m(maxSec)}`;
}

export const weightModeLabel: Record<WeightMode, string> = {
  perHand: 'ק״ג לכל יד',
  perSide: 'ק״ג לכל צד',
  total: 'ק״ג',
  added: 'ק״ג תוספת',
};

/** "22 × 8, 7, 8, 6" — weights grouped, skipped sets dropped. Per-side reps are "left|right". */
export function fmtSets(ex: ExerciseLog): string {
  const parts: string[] = [];
  let curW: number | null | undefined;
  let reps: string[] = [];
  const flush = () => {
    if (reps.length) parts.push(`${curW == null ? '—' : fmtNum(curW)} × ${reps.join(', ')}`);
  };
  for (const s of ex.sets) {
    if (s.status !== 'done') continue;
    const r = repsText(s, ex.plan.unilateral);
    if (!r) continue;
    if (s.weight !== curW) {
      flush();
      curW = s.weight;
      reps = [];
    }
    reps.push(r);
  }
  flush();
  return parts.join(' · ');
}

export function repsText(s: SetLog, unilateral: boolean): string {
  if (!unilateral) return s.reps == null ? '' : String(s.reps);
  if (s.repsL == null && s.repsR == null) return '';
  return `${s.repsL ?? '—'}|${s.repsR ?? '—'}`;
}

export function fmtTargetReps(reps: number[]): string {
  if (reps.length === 0) return '';
  return reps.every((r) => r === reps[0]) ? String(reps[0]) : reps.join('/');
}

export function daysAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'היום';
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
}
