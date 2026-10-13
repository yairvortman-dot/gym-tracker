import type { ExerciseTemplate, MuscleGroup } from '../types';
import { exerciseLibrary, type Focus, type LibraryExercise } from '../data/exerciseLibrary';
import { muscleOrder } from './weekly';

const libById = new Map(exerciseLibrary.map((e) => [e.id, e]));

export const focusOf = (ex: Pick<ExerciseTemplate, 'id'>): Focus | undefined => libById.get(ex.id)?.focus;

/** Muscles that usually share a day with another muscle, e.g. triceps work on a pressing day. */
const related: Partial<Record<MuscleGroup, { muscle: MuscleGroup; focus?: Focus[] }[]>> = {
  chest: [
    { muscle: 'shoulders', focus: ['front-delts', 'side-delts'] },
    { muscle: 'arms', focus: ['triceps'] },
  ],
  shoulders: [{ muscle: 'arms', focus: ['triceps'] }],
  back: [
    { muscle: 'arms', focus: ['biceps'] },
    { muscle: 'shoulders', focus: ['rear-delts'] },
  ],
  legs: [{ muscle: 'core' }],
};

export interface PickerGroup {
  muscle: MuscleGroup;
  items: LibraryExercise[];
}

/**
 * Everything the picker can offer: the library plus the person's own exercises from the program
 * that aren't in it (matched by id or exact name).
 */
export function exercisePool(programExercises: ExerciseTemplate[]): LibraryExercise[] {
  const names = new Set(exerciseLibrary.map((e) => e.name.trim()));
  const ids = new Set(exerciseLibrary.map((e) => e.id));
  const own: LibraryExercise[] = [];
  for (const e of programExercises) {
    if (!e.name.trim() || ids.has(e.id) || names.has(e.name.trim())) continue;
    ids.add(e.id);
    names.add(e.name.trim());
    own.push(e);
  }
  return [...exerciseLibrary, ...own];
}

/**
 * Splits the pool into exercises that fit the session (same muscles, plus the usual partners)
 * and the rest. Arms are matched by focus, so a pressing day suggests triceps, not biceps.
 */
export function pickerGroups(pool: LibraryExercise[], session: ExerciseTemplate[]): { relevant: PickerGroup[]; others: PickerGroup[] } {
  const sessionMuscles: MuscleGroup[] = [];
  const armFocus = new Set<Focus | undefined>();
  for (const e of session) {
    if (e.muscle === 'other') continue;
    if (!sessionMuscles.includes(e.muscle)) sessionMuscles.push(e.muscle);
    if (e.muscle === 'arms') armFocus.add(focusOf(e));
  }

  const isRelevant = (x: LibraryExercise): boolean => {
    if (sessionMuscles.includes(x.muscle)) {
      // An arm exercise without a known focus (a custom one) matches any arm day.
      if (x.muscle !== 'arms' || armFocus.has(undefined) || !x.focus) return true;
      if (armFocus.has(x.focus)) return true;
    }
    return sessionMuscles.some((m) =>
      (related[m] ?? []).some((r) => r.muscle === x.muscle && (!r.focus || (x.focus != null && r.focus.includes(x.focus)))),
    );
  };

  const order = [...sessionMuscles, ...muscleOrder.filter((m) => !sessionMuscles.includes(m)), 'other' as MuscleGroup];
  const group = (items: LibraryExercise[]): PickerGroup[] =>
    order.map((muscle) => ({ muscle, items: items.filter((x) => x.muscle === muscle) })).filter((g) => g.items.length > 0);

  const relevant = pool.filter(isRelevant);
  const others = pool.filter((x) => !isRelevant(x));
  return { relevant: group(relevant), others: group(others) };
}

/** A program entry built from a library pick. The library's finer focus tag isn't stored. */
export function templateFrom(x: LibraryExercise): ExerciseTemplate {
  const t: LibraryExercise = { ...x };
  delete t.focus;
  return t;
}
