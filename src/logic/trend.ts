import type { ExerciseLog, SessionLog } from '../types';
import { byStartDesc, finished, lastPerformance } from './history';
import { doneSets, setReps, topWeight, wasPerformed } from './sets';

/** Average reps per done set at the top weight; per-side sets count the weaker side. */
function avgRepsAtTop(ex: ExerciseLog): number {
  const w = topWeight(ex);
  const sets = doneSets(ex).filter((s) => s.weight === w);
  if (sets.length === 0) return 0;
  return sets.reduce((sum, s) => sum + (setReps(s, ex.plan.unilateral) ?? 0), 0) / sets.length;
}

/** 1 better, -1 worse, 0 same. A weight drop that the target asked for is not "worse". */
export function compareExercise(cur: ExerciseLog, prev: ExerciseLog): -1 | 0 | 1 {
  const cw = topWeight(cur) ?? 0;
  const pw = topWeight(prev) ?? 0;
  if (cw > pw) return 1;
  if (cw < pw) {
    const planned = cur.target?.weight != null && cur.target.weight < pw;
    return planned ? 0 : -1;
  }
  const diff = avgRepsAtTop(cur) - avgRepsAtTop(prev);
  if (diff > 0) return 1;
  if (diff < 0) return -1;
  return 0;
}

export function sessionGotWorse(sessions: SessionLog[], s: SessionLog): boolean {
  let better = 0;
  let worse = 0;
  for (const ex of s.exercises) {
    if (!wasPerformed(ex)) continue;
    const prev = lastPerformance(sessions, ex.exId, s.startedAt);
    if (!prev) continue;
    const c = compareExercise(ex, prev.ex);
    if (c > 0) better++;
    if (c < 0) worse++;
  }
  return worse > 0 && worse > better;
}

/** True when the last two finished strength sessions were each worse than before. */
export function twoWorseInARow(sessions: SessionLog[]): boolean {
  const recent = finished(sessions)
    .filter((s) => s.kind === 'strength')
    .sort(byStartDesc)
    .slice(0, 2);
  return recent.length === 2 && recent.every((s) => sessionGotWorse(sessions, s));
}
