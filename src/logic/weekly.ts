import type { MuscleGroup, Program, SessionLog } from '../types';
import { doneSets } from './sets';
import { addDays } from './day';

export const muscleOrder: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms'];

export const muscleLabel: Record<MuscleGroup, string> = {
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'ידיים',
  other: 'אחר',
};

type Counts = Record<MuscleGroup, number>;
const zero = (): Counts => ({ chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, other: 0 });

/** Done sets per muscle group in the week starting at `start` (a Sunday). */
export function weeklySets(sessions: SessionLog[], start: number): Counts {
  const end = addDays(start, 7);
  const counts = zero();
  for (const s of sessions) {
    if (s.startedAt < start || s.startedAt >= end) continue;
    for (const ex of s.exercises) counts[ex.plan.muscle] += doneSets(ex).length;
  }
  return counts;
}

/** Targets come from the program itself, so they stay right after edits. */
export function weeklyTargets(program: Program): { base: Counts; withBonus: Counts } {
  const base = zero();
  const withBonus = zero();
  for (const t of program.sessions) {
    if (t.kind !== 'strength') continue;
    for (const e of t.exercises) {
      withBonus[e.muscle] += e.sets;
      if (!t.bonus) base[e.muscle] += e.sets;
    }
  }
  return { base, withBonus };
}
