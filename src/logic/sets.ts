import type { ExerciseLog, ExerciseTemplate, SetLog } from '../types';

export const emptySet = (weight: number | null = null): SetLog => ({
  weight,
  reps: null,
  repsL: null,
  repsR: null,
  status: 'pending',
});

export function planOf(t: ExerciseTemplate): ExerciseLog['plan'] {
  const { sets, repMin, repMax, restMinSec, restMaxSec, unilateral, weightMode, equipment, muscle } = t;
  return { sets, repMin, repMax, restMinSec, restMaxSec, unilateral, weightMode, equipment, muscle };
}

/** Reps that count for progression. Per-side sets count the weaker side. */
export function setReps(s: SetLog, unilateral: boolean): number | null {
  if (!unilateral) return s.reps;
  if (s.repsL == null) return s.repsR;
  if (s.repsR == null) return s.repsL;
  return Math.min(s.repsL, s.repsR);
}

/** Reps actually performed in a set, counting both sides for per-side sets. */
export function setVolumeReps(s: SetLog, unilateral: boolean): number {
  if (!unilateral) return s.reps ?? 0;
  return (s.repsL ?? 0) + (s.repsR ?? 0);
}

export const hasReps = (s: SetLog, unilateral: boolean) => setReps(s, unilateral) != null;

/** Sets marked done that have reps. Skipped and pending sets never count. */
export function doneSets(ex: ExerciseLog): SetLog[] {
  if (ex.skipped) return [];
  return ex.sets.filter((s) => s.status === 'done' && hasReps(s, ex.plan.unilateral));
}

export const wasPerformed = (ex: ExerciseLog) => doneSets(ex).length > 0;

export function topWeight(ex: ExerciseLog): number | null {
  let top: number | null = null;
  for (const s of doneSets(ex)) if (s.weight != null && (top == null || s.weight > top)) top = s.weight;
  return top;
}

export function totalReps(ex: ExerciseLog): number {
  return doneSets(ex).reduce((sum, s) => sum + setVolumeReps(s, ex.plan.unilateral), 0);
}

export const roundKg = (w: number) => Math.round(w * 100) / 100;
