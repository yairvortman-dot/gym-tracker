import type { ExerciseLog, SessionLog } from '../types';
import { wasPerformed } from './sets';

export const byStartDesc = (a: SessionLog, b: SessionLog) => b.startedAt - a.startedAt;

export const finished = (sessions: SessionLog[]) => sessions.filter((s) => s.status === 'finished');

/** Most recent finished session before `before` in which the exercise was actually performed. */
export function lastPerformance(
  sessions: SessionLog[],
  exId: string,
  before: number,
): { session: SessionLog; ex: ExerciseLog } | null {
  const list = finished(sessions)
    .filter((s) => s.startedAt < before)
    .sort(byStartDesc);
  for (const session of list) {
    const ex = session.exercises.find((e) => e.exId === exId && wasPerformed(e));
    if (ex) return { session, ex };
  }
  return null;
}

/** A one-time target left by an earlier session, still valid if the exercise hasn't been done since. */
export function pendingOverride(sessions: SessionLog[], exId: string, before: number) {
  const list = finished(sessions)
    .filter((s) => s.startedAt < before)
    .sort(byStartDesc);
  for (const s of list) {
    const o = s.nextTargets?.[exId];
    if (o) return o;
    if (s.exercises.some((e) => e.exId === exId && wasPerformed(e))) return null;
  }
  return null;
}
