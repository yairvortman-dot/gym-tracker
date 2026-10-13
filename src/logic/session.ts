import type { DayState, ExerciseLog, ExerciseTemplate, Program, SessionLog, SessionTemplate, Settings } from '../types';
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
    const ex = buildExerciseLog(tpl.exercises[index], sets, { settings, sessions, now, calibration, dayState });
    return optional ? { ...ex, optional: 'available' } : ex;
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

/** A fresh exercise for a session: today's target from its own history, weights prefilled. */
export function buildExerciseLog(
  t: ExerciseTemplate,
  sets: number,
  ctx: { settings: Settings; sessions: SessionLog[]; now: number; calibration: boolean; dayState: DayState },
): ExerciseLog {
  const last = lastPerformance(ctx.sessions, t.id, ctx.now);
  const target = computeTarget({
    repMin: t.repMin,
    repMax: t.repMax,
    sets,
    step: stepFor(ctx.settings, t),
    minWeight: 0,
    last: last?.ex ?? null,
    override: pendingOverride(ctx.sessions, t.id, ctx.now),
    calibration: ctx.calibration,
    dayState: ctx.dayState,
  });
  const startWeight = target.weight ?? (last ? topWeight(last.ex) : null) ?? (t.weightMode === 'added' ? 0 : null);
  return {
    exId: t.id,
    name: t.name,
    cue: t.cue,
    plan: planOf(t),
    skipped: false,
    rir: null,
    note: '',
    sets: Array.from({ length: sets }, () => emptySet(startWeight)),
    target,
  };
}

/**
 * Swaps one exercise of a session for another, e.g. when the machine is taken.
 * The new exercise keeps the slot's number of sets and gets its own target; anything logged
 * on the old exercise is dropped.
 */
export function replaceExerciseInSession(
  s: SessionLog,
  index: number,
  t: ExerciseTemplate,
  ctx: { settings: Settings; sessions: SessionLog[] },
): SessionLog {
  const old = s.exercises[index];
  const ex = buildExerciseLog(t, old.sets.length, {
    ...ctx,
    // Targets look at sessions before this one, as when the session started.
    now: s.startedAt,
    calibration: s.calibration,
    dayState: s.dayState,
  });
  const next = { ...ex, optional: old.optional };
  return {
    ...s,
    exercises: s.exercises.map((e, k) => (k === index ? next : e)),
    strongestExId: s.strongestExId === old.exId ? null : s.strongestExId,
  };
}

/** The same swap in the program, so next time the session starts with the new exercise. */
export function replaceExerciseInProgram(program: Program, templateId: string, oldExId: string, t: ExerciseTemplate): Program | null {
  const tpl = program.sessions.find((x) => x.id === templateId);
  const i = tpl?.exercises.findIndex((e) => e.id === oldExId) ?? -1;
  if (!tpl || i < 0) return null;
  const exercises = tpl.exercises.map((e, k) => (k === i ? { ...t, sets: e.sets } : e));
  return { ...program, sessions: program.sessions.map((x) => (x.id === templateId ? { ...tpl, exercises } : x)) };
}

/** A session exercise in program-entry shape, for the picker's "fits this session" logic. */
export function templateOfLog(e: ExerciseLog): ExerciseTemplate {
  return { id: e.exId, name: e.name, cue: e.cue, ...e.plan, sets: e.sets.length };
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
