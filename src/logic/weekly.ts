import type { MuscleGroup, Program, SessionLog } from '../types';
import { exerciseLibrary } from '../data/exerciseLibrary';
import { doneSets } from './sets';
import { addDays } from './day';

/** Muscle groups in the order the exercise picker lists them. */
export const muscleOrder: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

export const muscleLabel: Record<MuscleGroup, string> = {
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'ידיים',
  core: 'בטן',
  other: 'אחר',
};

/**
 * Groups for weekly set counts. Legs are four muscles, so they're split: counted together they
 * look far bigger than chest or back and hide where the work actually goes.
 */
export type WeeklyGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'quads' | 'posterior' | 'calves' | 'legs' | 'core' | 'other';

export const weeklyOrder: WeeklyGroup[] = ['chest', 'back', 'shoulders', 'arms', 'quads', 'posterior', 'calves', 'legs', 'core'];

export const weeklyLabel: Record<WeeklyGroup, string> = {
  chest: 'חזה',
  back: 'גב',
  shoulders: 'כתפיים',
  arms: 'ידיים',
  quads: 'ארבע ראשי',
  posterior: 'ירך אחורית וישבן',
  calves: 'תאומים',
  legs: 'רגליים, אחר',
  core: 'בטן',
  other: 'אחר',
};

const focusById = new Map(exerciseLibrary.map((e) => [e.id, e.focus]));

/** Leg exercises go to the part of the leg they mostly work; a custom leg exercise stays "legs". */
export function groupOf(exId: string, muscle: MuscleGroup): WeeklyGroup {
  if (muscle !== 'legs') return muscle;
  const focus = focusById.get(exId);
  if (focus === 'quads') return 'quads';
  if (focus === 'hamstrings' || focus === 'glutes') return 'posterior';
  if (focus === 'calves') return 'calves';
  return 'legs';
}

export type Counts = Record<WeeklyGroup, number>;
const zero = (): Counts => ({ chest: 0, back: 0, shoulders: 0, arms: 0, quads: 0, posterior: 0, calves: 0, legs: 0, core: 0, other: 0 });

/** Done sets per group in the week starting at `start` (a Sunday). */
export function weeklySets(sessions: SessionLog[], start: number): Counts {
  const end = addDays(start, 7);
  const counts = zero();
  for (const s of sessions) {
    if (s.startedAt < start || s.startedAt >= end) continue;
    for (const ex of s.exercises) counts[groupOf(ex.exId, ex.plan.muscle)] += doneSets(ex).length;
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
      const g = groupOf(e.id, e.muscle);
      withBonus[g] += e.sets;
      if (!t.bonus) base[g] += e.sets;
    }
  }
  return { base, withBonus };
}
