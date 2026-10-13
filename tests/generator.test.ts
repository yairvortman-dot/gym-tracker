import { describe, expect, it } from 'vitest';
import { avoidIds, generateProgram, weeklySetsOf, type Answers } from '../src/logic/generator';
import { exerciseLibrary } from '../src/data/exerciseLibrary';
import { exerciseMeta, type Gear } from '../src/data/exerciseMeta';

const FULL_GYM: Gear[] = ['db', 'bb', 'cable', 'machine', 'bar', 'bench'];

const base: Answers = {
  goal: 'muscle',
  experience: '6m2y',
  recent: 'regular',
  age: '26_40',
  days: 4,
  minutes: 60,
  gear: FULL_GYM,
  style: 'mix',
  emphasis: [],
  limits: [],
  avoid: [],
  cardio: 0,
  abs: 'finisher',
  week: 'calm',
};

const gen = (patch: Partial<Answers> = {}) => generateProgram({ ...base, ...patch }, new Date(2026, 9, 13));
const strength = (g: ReturnType<typeof gen>) => g.program.sessions.filter((t) => t.kind === 'strength');
const allIds = (g: ReturnType<typeof gen>) => strength(g).flatMap((t) => t.exercises.map((e) => e.id));

describe('exercise metadata', () => {
  it('covers every library exercise and nothing else', () => {
    expect(Object.keys(exerciseMeta).sort()).toEqual(exerciseLibrary.map((e) => e.id).sort());
  });
});

describe('every combination of answers gives a sound program', () => {
  const goals = ['muscle', 'strength', 'fatloss', 'general'] as const;
  const exps = ['none', 'lt6m', '6m2y', 'gt2y'] as const;
  const daysList = [2, 3, 4, 5, 6] as const;
  const minutesList = [30, 45, 60, 75] as const;
  const gears: Gear[][] = [FULL_GYM, ['db', 'bench'], []];
  const limitsList: Answers['limits'][] = [[], ['lowBack', 'knees'], ['shoulders', 'elbows']];
  const emphases: Answers['emphasis'][] = [[], ['chest', 'arms'], ['glutes']];

  it('respects equipment, pain, time, structure and never repeats an exercise inside a session', () => {
    let checked = 0;
    for (const goal of goals)
      for (const experience of exps)
        for (const days of daysList)
          for (const minutes of minutesList)
            for (const gear of gears)
              for (const limits of limitsList)
                for (const emphasis of emphases) {
                  const a: Answers = { ...base, goal, experience, days, minutes, gear, limits, emphasis, bonus: true, cardio: 1 };
                  const g = generateProgram(a, new Date(2026, 9, 13));
                  const main = strength(g).filter((t) => !t.bonus);
                  const label = JSON.stringify({ goal, experience, days, minutes, gear, limits, emphasis });

                  expect(main, label).toHaveLength(days);
                  expect(g.program.sessions.filter((t) => t.bonus), label).toHaveLength(days >= 3 ? 1 : 0);
                  expect(g.program.sessions.filter((t) => t.kind === 'cardio'), label).toHaveLength(1);

                  for (const t of strength(g)) {
                    const ids = t.exercises.map((e) => e.id);
                    expect(new Set(ids).size, `${label} ${t.name} repeats`).toBe(ids.length);
                    expect(t.exercises.length, `${label} ${t.name} too few`).toBeGreaterThanOrEqual(t.bonus ? 2 : 3);
                    const limit = (t.bonus ? Math.min(40, minutes) : minutes) + 5;
                    if (t.durationMin > limit) {
                      // Allowed only when the session is already cut to the bone, and the summary says so.
                      expect(t.exercises.every((e) => e.sets === 2), `${label} ${t.name} too long but not trimmed`).toBe(true);
                      expect(t.exercises.length, `${label} ${t.name} too long but not trimmed`).toBeLessThanOrEqual(3);
                      if (!t.bonus) expect(g.reasons.some((r) => r.includes('יותר מ-')), `${label} overrun not explained`).toBe(true);
                    }
                    for (const e of t.exercises) {
                      const meta = exerciseMeta[e.id];
                      expect(meta.needs.every((n) => gear.includes(n)), `${label} ${e.name} needs gear`).toBe(true);
                      for (const j of limits) expect(meta.stress?.[j], `${label} ${e.name} hurts ${j}`).not.toBe(2);
                      expect(e.repMin).toBeLessThanOrEqual(e.repMax);
                      expect(e.restMinSec).toBeLessThanOrEqual(e.restMaxSec);
                      expect(e.sets).toBeGreaterThanOrEqual(2);
                      expect(e.sets).toBeLessThanOrEqual(5);
                    }
                  }
                  checked++;
                }
    expect(checked).toBe(4 * 4 * 5 * 4 * 3 * 3 * 3);
  }, 60_000);
});

describe('choices that should show up in the program', () => {
  it('beginners get no highly technical lifts', () => {
    for (const days of [2, 3, 4, 5] as const) {
      const ids = allIds(gen({ experience: 'none', days }));
      expect(ids.filter((id) => exerciseMeta[id].tech === 3)).toEqual([]);
    }
  });

  it('an experienced lifter going for strength gets barbell main lifts in the 4–6 range', () => {
    const g = gen({ goal: 'strength', experience: 'gt2y' });
    const firsts = strength(g).map((t) => t.exercises[0]);
    expect(firsts.some((e) => exerciseMeta[e.id].needs.includes('bb'))).toBe(true);
    const barbellMain = firsts.find((e) => exerciseMeta[e.id].needs.includes('bb'))!;
    expect([barbellMain.repMin, barbellMain.repMax]).toEqual([4, 6]);
  });

  it('low back pain removes deadlift, back squat and barbell rows', () => {
    const ids = allIds(gen({ limits: ['lowBack'], goal: 'strength', experience: 'gt2y' }));
    for (const id of ['deadlift', 'back-squat', 'barbell-row', 'barbell-romanian-deadlift']) expect(ids).not.toContain(id);
  });

  it('exercises the person said no to never appear', () => {
    const ids = allIds(gen({ avoid: ['squat', 'deadlift', 'pullup', 'dips'], experience: 'gt2y', goal: 'strength', days: 5 }));
    for (const id of Object.values(avoidIds).flat()) expect(ids).not.toContain(id);
  });

  it('no equipment gives a bodyweight program', () => {
    const g = gen({ gear: [], days: 3 });
    for (const id of allIds(g)) expect(exerciseMeta[id].needs).toEqual([]);
    expect(g.reasons.some((r) => r.includes('בלי ציוד'))).toBe(true);
  });

  it('emphasis adds weekly sets to the chosen area', () => {
    const balanced = weeklySetsOf(gen().program);
    const chest = weeklySetsOf(gen({ emphasis: ['chest'] }).program);
    expect(chest.chest).toBeGreaterThan(balanced.chest);
  });

  const legDays = (g: ReturnType<typeof gen>) => strength(g).filter((t) => !t.bonus && t.exercises.some((e) => e.muscle === 'legs'));

  it('one leg day a week by default for 2–5 days, whatever the goal (strength too); chest and back still twice', () => {
    for (const days of [2, 3, 4, 5] as const)
      for (const goal of ['muscle', 'strength', 'fatloss', 'general'] as const)
        for (const gear of [FULL_GYM, ['db', 'bench'], []] as Gear[][]) {
        const g = gen({ days, goal, gear });
        expect(legDays(g), JSON.stringify({ days, goal, gear })).toHaveLength(1);
        if (days >= 3) {
          const trains = (m: string) => strength(g).filter((t) => t.exercises.some((e) => e.muscle === m)).length;
          expect(trains('chest')).toBeGreaterThanOrEqual(2);
          expect(trains('back')).toBeGreaterThanOrEqual(2);
        }
      }
  });

  it('two leg days only with a legs or glutes emphasis, or with 6 days a week', () => {
    for (const days of [4, 5, 6] as const) {
      expect(legDays(gen({ days, emphasis: ['legs'] }))).toHaveLength(2);
      expect(legDays(gen({ days, emphasis: ['glutes'] }))).toHaveLength(2);
    }
    for (const goal of ['muscle', 'strength', 'fatloss', 'general'] as const) {
      const g = gen({ days: 6, goal });
      expect(legDays(g)).toHaveLength(2);
      expect(g.program.sessions.filter((t) => t.kind === 'strength' && !t.bonus).map((t) => t.name)).toEqual([
        'עליון א׳',
        'תחתון א׳',
        'עליון ב׳',
        'עליון ג׳',
        'תחתון ב׳',
        'כתפיים וידיים',
      ]);
    }
    // Full-body weeks with a leg emphasis train legs every session.
    expect(legDays(gen({ days: 3, emphasis: ['legs'] }))).toHaveLength(3);
  });

  it('calves are trained every week once there is an hour (one or two leg days)', () => {
    for (const days of [4, 5, 6] as const)
      for (const emphasis of [[], ['legs']] as Answers['emphasis'][]) {
        const w = weeklySetsOf(gen({ days, minutes: 60, emphasis }).program);
        expect(w.calves, JSON.stringify({ days, emphasis, w })).toBeGreaterThanOrEqual(2);
      }
  });

  it('with 2–3 days, the one leg session has a squat for 4 sets and a hinge', () => {
    for (const days of [2, 3] as const)
      for (const minutes of [45, 60, 75] as const) {
        const [day] = legDays(gen({ days, minutes }));
        const legs = day.exercises.filter((e) => e.muscle === 'legs');
        const label = JSON.stringify({ days, minutes, legs: legs.map((e) => e.name) });
        expect(legs.map((e) => exerciseMeta[e.id].pattern).sort(), label).toEqual(['hinge', 'squat']);
        expect(legs.find((e) => exerciseMeta[e.id].pattern === 'squat')!.sets, label).toBe(4);
      }
  });

  it('the single leg day covers the front, the back of the leg and the calves', () => {
    for (const minutes of [60, 75] as const) {
      const w = weeklySetsOf(gen({ days: 4, minutes }).program);
      expect(w.quads, JSON.stringify(w)).toBeGreaterThanOrEqual(3);
      expect(w.posterior, JSON.stringify(w)).toBeGreaterThanOrEqual(3);
      expect(w.calves, JSON.stringify(w)).toBeGreaterThanOrEqual(2);
    }
  });

  it('weekly sets land in a sensible range for an intermediate lifter (about 8–22 per big muscle)', () => {
    const w = weeklySetsOf(gen({ minutes: 75 }).program);
    for (const m of ['chest', 'back'] as const) {
      expect(w[m]).toBeGreaterThanOrEqual(8);
      expect(w[m]).toBeLessThanOrEqual(22);
    }
  });

  it('stays balanced: chest and back close, arms trained, legs not overloaded', () => {
    for (const minutes of [45, 60, 75] as const)
      for (const days of [3, 4, 5, 6] as const)
        for (const emphasis of [[], ['chest'], ['back'], ['arms']] as Answers['emphasis'][]) {
          const w = weeklySetsOf(gen({ minutes, days, emphasis }).program);
          const balanced = weeklySetsOf(gen({ minutes, days }).program);
          const label = JSON.stringify({ minutes, days, emphasis, w, balanced });
          if (emphasis.length === 0) {
            expect(w.chest / w.back, label).toBeLessThanOrEqual(1.7);
            expect(w.back / w.chest, label).toBeLessThanOrEqual(1.7);
          } else {
            // The emphasized area gains; everything else keeps at least half of its balanced volume.
            const area = emphasis[0] as 'chest' | 'back' | 'arms';
            expect(w[area], label).toBeGreaterThanOrEqual(balanced[area]);
            for (const m of ['chest', 'back'] as const) if (m !== area) expect(w[m], label).toBeGreaterThanOrEqual(balanced[m] / 2);
          }
          // Short full-body sessions are just the big lifts; split programs with an hour or more get direct arm work.
          if (days >= 4 && minutes >= 60) expect(w.arms, label).toBeGreaterThanOrEqual(minutes >= 75 ? 6 : 4);
          // One leg day: no part of the leg gets more than a chest-sized weekly volume (two leg days: 18).
          const legCap = days === 6 ? 18 : 12;
          for (const g of ['quads', 'posterior', 'calves'] as const) expect(w[g], label).toBeLessThanOrEqual(legCap);
        }
  });

  it('strength main lifts in the 4–6 range are always ones you can load heavily', () => {
    for (const limits of [[], ['lowBack'], ['lowBack', 'knees']] as Answers['limits'][]) {
      const g = gen({ goal: 'strength', experience: 'gt2y', limits });
      for (const t of strength(g))
        for (const e of t.exercises) if (e.repMin === 4) expect(exerciseMeta[e.id].light, `${e.name} ${JSON.stringify(limits)}`).toBeFalsy();
    }
  });

  it('a shorter session has fewer exercises', () => {
    const count = (minutes: Answers['minutes']) => strength(gen({ minutes }))[0].exercises.length;
    expect(count(30)).toBeLessThan(count(75));
  });

  it('a machine preference picks machines and cables where it can', () => {
    const share = (style: Answers['style']) => {
      const ids = allIds(gen({ style }));
      return ids.filter((id) => exerciseMeta[id].needs.some((n) => n === 'machine' || n === 'cable')).length / ids.length;
    };
    expect(share('machines')).toBeGreaterThan(share('free'));
  });

  it('abs: a finisher checkbox, or core exercises inside the program', () => {
    expect(gen({ abs: 'finisher' }).settings.absFinisher).toBe(true);
    const inProgram = gen({ abs: 'inProgram' });
    expect(inProgram.settings.absFinisher).toBe(false);
    expect(strength(inProgram).some((t) => t.exercises.some((e) => e.muscle === 'core'))).toBe(true);
    expect(strength(gen({ abs: 'none' })).some((t) => t.exercises.some((e) => e.muscle === 'core'))).toBe(false);
  });

  it('three weeks of calibration after a break, two otherwise; the program starts today', () => {
    expect(gen({ recent: 'no' }).settings.calibrationDays).toBe(21);
    expect(gen({ experience: 'none', recent: undefined }).settings.calibrationDays).toBe(21);
    expect(gen().settings.calibrationDays).toBe(14);
    expect(gen().settings.programStart).toBe('2026-10-13');
  });

  it('two cardio sessions are spread through the rotation', () => {
    const kinds = gen({ cardio: 2 }).program.sessions.map((t) => t.kind);
    expect(kinds.filter((k) => k === 'cardio')).toHaveLength(2);
    expect(kinds[kinds.length - 1]).toBe('cardio');
    expect(kinds.slice(0, -1)).toContain('cardio');
  });

  it('never more than two leg days, even with 5 days and a legs emphasis', () => {
    const g = gen({ days: 5, emphasis: ['legs', 'glutes'] });
    expect(legDays(g)).toHaveLength(2);
    expect(strength(g).filter((t) => !t.bonus)).toHaveLength(5);
  });

  it('the same answers always give the same program', () => {
    expect(JSON.stringify(gen({ days: 3, emphasis: ['back'] }))).toBe(JSON.stringify(gen({ days: 3, emphasis: ['back'] })));
  });

  it('explains itself', () => {
    const g = gen({ limits: ['knees'], emphasis: ['glutes'], cardio: 1, week: 'veryBusy' });
    const text = g.reasons.join('\n');
    expect(text).toContain('שני ימי רגליים');
    expect(text).toContain('ברכיים');
    expect(text).toContain('ישבן');
    expect(text).toContain('אירובי');
    expect(text).toContain('עמוס');
  });
});
