import { describe, expect, it } from 'vitest';
import { computeTarget, type TargetInput } from '../src/logic/progression';
import { autoDayState, calibrationWeek, nextTemplateId, planForDay, templateAfter, weekStart } from '../src/logic/day';
import { createSession, finalizeSession } from '../src/logic/session';
import { weeklySets, weeklyTargets } from '../src/logic/weekly';
import { twoWorseInARow } from '../src/logic/trend';
import { doneSets, planOf, totalReps } from '../src/logic/sets';
import { defaultProgram, defaultSettings } from '../src/data/defaultProgram';
import { seedSession } from '../src/data/seedSession';
import type { ExerciseLog, SessionLog, SetLog } from '../src/types';

const upperA = defaultProgram.sessions.find((t) => t.id === 'upper-a')!;
const incline = upperA.exercises[0]; // 4 × 6–10, dumbbell

const s = (weight: number, reps: number | null, status: SetLog['status'] = 'done'): SetLog => ({ weight, reps, repsL: null, repsR: null, status });

function exLog(sets: SetLog[], rir: number | null = null, tpl = incline): ExerciseLog {
  return { exId: tpl.id, name: tpl.name, plan: planOf(tpl), skipped: false, rir, note: '', sets, target: null };
}

const base = (last: ExerciseLog | null, extra: Partial<TargetInput> = {}): TargetInput => ({
  repMin: 6,
  repMax: 10,
  sets: 4,
  step: 2,
  last,
  override: null,
  calibration: false,
  dayState: 'green',
  ...extra,
});

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();

describe('double progression', () => {
  const allTop = [s(22, 10), s(22, 10), s(22, 10), s(22, 10)];

  it('adds the smallest step and drops to the bottom of the range when every set hits the top with RIR ≥ 1', () => {
    const t = computeTarget(base(exLog(allTop, 1)));
    expect(t.kind).toBe('increase');
    expect(t.weight).toBe(24);
    expect(t.reps).toEqual([6, 6, 6, 6]);
  });

  it('does not increase at RIR 0, without RIR, during calibration, or on a yellow day', () => {
    expect(computeTarget(base(exLog(allTop, 0))).kind).toBe('hold');
    expect(computeTarget(base(exLog(allTop, null))).kind).toBe('hold');
    expect(computeTarget(base(exLog(allTop, 2), { calibration: true })).weight).toBe(22);
    expect(computeTarget(base(exLog(allTop, 2), { dayState: 'yellow' })).weight).toBe(22);
  });

  it('otherwise keeps the weight and asks for one more rep per set, capped at the top', () => {
    const t = computeTarget(base(exLog([s(22, 8), s(22, 7), s(22, 10), s(22, 6)], 2)));
    expect(t.kind).toBe('more-reps');
    expect(t.weight).toBe(22);
    expect(t.reps).toEqual([9, 8, 10, 7]);
  });

  it('a skipped set blocks the increase but is never counted as zero reps', () => {
    const t = computeTarget(base(exLog([s(22, 10), s(22, 10), s(22, 10), s(22, null, 'skipped')], 2)));
    expect(t.kind).toBe('more-reps');
    // The skipped 4th set uses the lowest done set, not 0.
    expect(t.reps).toEqual([10, 10, 10, 10]);
    expect(doneSets(exLog([s(22, 10), s(22, null, 'skipped')]))).toHaveLength(1);
    expect(totalReps(exLog([s(22, 10), s(22, null, 'skipped')]))).toBe(10);
  });

  it('suggests one step down when most sets fall below the range', () => {
    const fly = upperA.exercises[2]; // 12–15
    const t = computeTarget(base(exLog([s(27, 6), s(27, 8), s(27, null, 'skipped')], null, fly), { repMin: 12, repMax: 15, sets: 3, step: 2.5 }));
    expect(t.kind).toBe('decrease');
    expect(t.weight).toBe(24.5);
    expect(t.reps).toEqual([12, 12, 12]);
  });

  it('targets reps in reserve by day: 1 normal, 2 calibration, 3 yellow/red', () => {
    const last = exLog([s(22, 8)], 2);
    expect(computeTarget(base(last)).rir).toBe(1);
    expect(computeTarget(base(last, { calibration: true })).rir).toBe(2);
    expect(computeTarget(base(last, { dayState: 'yellow' })).rir).toBe(3);
    expect(computeTarget(base(last, { dayState: 'red' })).rir).toBe(3);
  });
});

describe('seeded paper session', () => {
  const seed = seedSession();

  it('produces the suggested targets for the next upper A', () => {
    const next = createSession({
      tpl: upperA,
      settings: defaultSettings,
      sessions: [seed],
      readiness: { sleepHours: 7, energy: 4, sick: false, backPain: false },
      dayState: 'green',
      dayStateAuto: 'green',
      now: at(2026, 10, 15),
    });
    const t = Object.fromEntries(next.exercises.map((e) => [e.exId, e.target!]));
    expect([t['incline-db-press'].weight, t['incline-db-press'].reps[0]]).toEqual([22, 8]);
    expect([t['chest-press-machine-single'].weight, t['chest-press-machine-single'].reps[0]]).toEqual([27, 7]);
    expect([t['cable-fly-low-high'].weight, t['cable-fly-low-high'].reps[0]]).toEqual([20, 12]);
    expect([t['seated-db-shoulder-press'].weight, t['seated-db-shoulder-press'].reps[0]]).toEqual([12, 12]);
    expect([t['lateral-raise'].weight, t['lateral-raise'].reps[0]]).toEqual([8, 12]);
    expect([t['overhead-cable-triceps'].weight, t['overhead-cable-triceps'].reps[0]]).toEqual([null, 12]);
    // Weight fields start at the target weight.
    expect(next.exercises[2].sets.map((x) => x.weight)).toEqual([20, 20, 20]);
    expect(next.calibration).toBe(true);
  });

  it('stops using a one-time target once the exercise has been done again', () => {
    const later: SessionLog = {
      ...seed,
      id: 'later',
      startedAt: at(2026, 10, 12),
      nextTargets: undefined,
      exercises: [exLog([s(8, 14), s(8, 13), s(8, 12)], 2, upperA.exercises[4])],
    };
    const next = createSession({
      tpl: upperA,
      settings: defaultSettings,
      sessions: [seed, later],
      readiness: { sleepHours: 7, energy: 4, sick: false, backPain: false },
      dayState: 'green',
      dayStateAuto: 'green',
      now: at(2026, 10, 30),
    });
    const lat = next.exercises.find((e) => e.exId === 'lateral-raise')!.target!;
    expect(lat.kind).toBe('more-reps');
    expect(lat.reps).toEqual([15, 14, 13]);
    // The incline press was not repeated, so its paper target still applies.
    expect(next.exercises[0].target!.kind).toBe('override');
  });

  it('counts the seed week: chest 9, shoulders 5, arms 0 (skipped sets excluded)', () => {
    const w = weeklySets([seed], weekStart(seed.startedAt));
    expect(w.chest).toBe(9);
    expect(w.shoulders).toBe(5);
    expect(w.arms).toBe(0);
  });
});

describe('day state', () => {
  const r = (sleepHours: number | null, energy: number | null, sick = false, backPain = false) => ({ sleepHours, energy, sick, backPain });

  it('green / yellow / red', () => {
    expect(autoDayState(r(8, 4))).toBe('green');
    expect(autoDayState(r(6, 3))).toBe('green');
    expect(autoDayState(r(5, 4))).toBe('yellow');
    expect(autoDayState(r(4, 4))).toBe('yellow');
    expect(autoDayState(r(8, 2))).toBe('yellow');
    expect(autoDayState(r(3.5, 5))).toBe('red');
    expect(autoDayState(r(8, 5, true))).toBe('red');
    expect(autoDayState(r(8, 5, false, true))).toBe('red');
  });

  it('yellow drops one set; red keeps the first two at 3 sets and makes the rest optional', () => {
    expect(planForDay(upperA, 'yellow').map((p) => p.sets)).toEqual([3, 2, 2, 2, 2, 2]);
    const red = planForDay(upperA, 'red');
    expect(red.filter((p) => !p.optional).map((p) => [p.index, p.sets])).toEqual([
      [0, 3],
      [1, 3],
    ]);
    expect(red.filter((p) => p.optional)).toHaveLength(4);
  });
});

describe('rotation and calendar', () => {
  it('continues from the last logged session and wraps around', () => {
    const seed = seedSession();
    expect(nextTemplateId(defaultProgram, [])).toBe('upper-a');
    expect(nextTemplateId(defaultProgram, [seed])).toBe('lower');
    expect(nextTemplateId(defaultProgram, [{ ...seed, templateId: 'easy-run' }])).toBe('upper-a');
    expect(templateAfter(defaultProgram, 'upper-c')).toBe('easy-run');
  });

  it('ignores an unfinished session when picking the next one', () => {
    const seed = seedSession();
    const active = { ...seed, id: 'x', templateId: 'lower', status: 'active' as const, startedAt: seed.startedAt + 1000 };
    expect(nextTemplateId(defaultProgram, [seed, active])).toBe('lower');
  });

  it('weeks start on Sunday', () => {
    expect(new Date(weekStart(at(2026, 10, 9))).getDay()).toBe(0);
    expect(new Date(weekStart(at(2026, 10, 9))).getDate()).toBe(4);
    expect(new Date(weekStart(at(2026, 10, 4))).getDate()).toBe(4);
  });

  it('calibration covers the first 14 days from the program start', () => {
    expect(calibrationWeek('2026-10-09', at(2026, 10, 9))).toBe(1);
    expect(calibrationWeek('2026-10-09', at(2026, 10, 16))).toBe(2);
    expect(calibrationWeek('2026-10-09', at(2026, 10, 22, 23))).toBe(2);
    expect(calibrationWeek('2026-10-09', at(2026, 10, 23))).toBeNull();
  });

  it('weekly targets come from the program: chest 13/16, back 11/14', () => {
    const t = weeklyTargets(defaultProgram);
    expect([t.base.chest, t.withBonus.chest]).toEqual([13, 16]);
    expect([t.base.back, t.withBonus.back]).toEqual([11, 14]);
  });
});

describe('finishing a session', () => {
  it('turns untouched sets into skipped, typed-but-unticked into done, and drops unpicked extras', () => {
    const seed = seedSession();
    const sess = createSession({
      tpl: upperA,
      settings: defaultSettings,
      sessions: [seed],
      readiness: { sleepHours: 3, energy: 2, sick: false, backPain: false },
      dayState: 'red',
      dayStateAuto: 'red',
      now: at(2026, 10, 15),
    });
    sess.exercises[0].sets[0] = { ...sess.exercises[0].sets[0], reps: 8, status: 'done' };
    sess.exercises[0].sets[1] = { ...sess.exercises[0].sets[1], reps: 7 };
    sess.exercises[3].optional = 'picked';
    const done = finalizeSession(sess, at(2026, 10, 15, 11), 30);
    expect(done.exercises.map((e) => e.exId)).toEqual(['incline-db-press', 'chest-press-machine-single', 'seated-db-shoulder-press']);
    expect(done.exercises[0].sets.map((x) => x.status)).toEqual(['done', 'done', 'skipped']);
    expect(done.status).toBe('finished');
  });
});

describe('trend hint', () => {
  it('fires after two sessions in a row that got worse', () => {
    const tpl = upperA.exercises[3];
    const mk = (id: string, day: number, reps: number[]): SessionLog => ({
      ...seedSession(),
      id,
      nextTargets: undefined,
      startedAt: at(2026, 10, day),
      exercises: [exLog(reps.map((r) => s(12, r)), 2, tpl)],
    });
    const a = mk('a', 1, [12, 12, 12]);
    const b = mk('b', 5, [11, 10, 10]);
    const c = mk('c', 9, [10, 9, 9]);
    expect(twoWorseInARow([a, b])).toBe(false);
    expect(twoWorseInARow([a, b, c])).toBe(true);
    expect(twoWorseInARow([a, b, c, mk('d', 12, [12, 12, 12])])).toBe(false);
  });
});
