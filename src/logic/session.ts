import type { DayState, ExerciseLog, Program, SessionLog, SessionTemplate, Settings } from '../types';
import { calibrationWeek, planForDay, type Readiness } from './day';
import { lastPerformance, pendingOverride } from './history';
import { computeTarget } from './progression';
import { emptySet, hasReps, planOf, topWeight } from './sets';

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function stepFor(settings: Settings, ex: Pick<ExerciseLog['plan'], 'equipment'>): number {
  return settings.kgStep[ex.equipment] ?? 2.5;
}

export function createSession(args: {
  tpl: SessionTemplate;
  settings: Settings;
  sessions: SessionLog[];
  readiness: Readiness;
  dayState: DayState;
  dayStateAuto: DayState;
  now?: number;
}): SessionLog {
  const { tpl, settings, sessions, readiness, dayState, dayStateAuto } = args;
  const now = args.now ?? Date.now();
  const calibration = calibrationWeek(settings.programStart, now) != null;

  const exercises: ExerciseLog[] = planForDay(tpl, dayState).map(({ index, sets, optional }) => {
    const t = tpl.exercises[index];
    const last = lastPerformance(sessions, t.id, now);
    const target = computeTarget({
      repMin: t.repMin,
      repMax: t.repMax,
      sets,
      step: stepFor(settings, t),
      minWeight: 0,
      last: last?.ex ?? null,
      override: pendingOverride(sessions, t.id, now),
      calibration,
      dayState,
    });
    const startWeight = target.weight ?? (last ? topWeight(last.ex) : null) ?? (t.weightMode === 'added' ? 0 : null);
    return {
      exId: t.id,
      name: t.name,
      cue: t.cue,
      plan: planOf(t),
      skipped: false,
      optional: optional ? 'available' : undefined,
      rir: null,
      note: '',
      sets: Array.from({ length: sets }, () => emptySet(startWeight)),
      target,
    };
  });

  return {
    id: newId(),
    templateId: tpl.id,
    templateName: tpl.name,
    kind: tpl.kind,
    status: 'active',
    startedAt: now,
    finishedAt: null,
    durationMin: null,
    ...readiness,
    dayState,
    dayStateAuto,
    calibration,
    exercises,
    absDone: false,
    strongestExId: null,
    note: '',
    distanceKm: null,
  };
}

/**
 * Closes a session: unpicked red-day extras are dropped, sets with reps typed but not ticked
 * count as done, and untouched sets become "לא עשיתי" (never zero reps).
 */
export function finalizeSession(s: SessionLog, finishedAt: number, durationMin: number | null): SessionLog {
  const exercises = s.exercises
    .filter((e) => e.optional !== 'available')
    .map((e) => ({
      ...e,
      sets: e.sets.map((set) =>
        set.status !== 'pending' ? set : { ...set, status: hasReps(set, e.plan.unilateral) ? ('done' as const) : ('skipped' as const) },
      ),
    }));
  return { ...s, exercises, status: 'finished', finishedAt, durationMin };
}

export function templateById(program: Program, id: string): SessionTemplate | undefined {
  return program.sessions.find((t) => t.id === id);
}

export const elapsedMin = (from: number, to: number) => Math.max(1, Math.round((to - from) / 60000));
