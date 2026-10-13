import { describe, expect, it } from 'vitest';
import { createSession, replaceExerciseInProgram, replaceExerciseInSession, templateOfLog } from '../src/logic/session';
import { templateFrom } from '../src/logic/library';
import { exerciseLibrary } from '../src/data/exerciseLibrary';
import { defaultProgram, defaultSettings } from '../src/data/defaultProgram';
import { seedSession } from './fixtures/seedSession';

const upperA = defaultProgram.sessions.find((t) => t.id === 'upper-a')!;
const lib = (id: string) => templateFrom(exerciseLibrary.find((e) => e.id === id)!);
const start = (dayState: 'green' | 'yellow' = 'green') =>
  createSession({
    tpl: upperA,
    settings: defaultSettings,
    sessions: [seedSession()],
    readiness: { sleepHours: 7, energy: 4, sick: false, backPain: false },
    dayState,
    dayStateAuto: dayState,
    now: new Date(2026, 9, 15, 10).getTime(),
  });

describe('swapping an exercise mid-session', () => {
  it('puts the new exercise in the same slot with the same number of sets and its own target', () => {
    const s = start('yellow'); // yellow day: the cable fly has 2 sets instead of 3
    const next = replaceExerciseInSession(s, 2, lib('pec-deck'), { settings: defaultSettings, sessions: [seedSession()] });
    const ex = next.exercises[2];
    expect(ex.exId).toBe('pec-deck');
    expect(ex.sets).toHaveLength(2);
    expect(ex.sets.every((x) => x.status === 'pending' && x.reps == null)).toBe(true);
    expect(ex.target?.kind).toBe('calibrate'); // never done before
    expect(ex.target?.rir).toBe(3); // still a yellow day
    expect(next.exercises.map((e) => e.exId).filter((id) => id !== 'pec-deck')).toEqual(
      s.exercises.map((e) => e.exId).filter((id) => id !== 'cable-fly-low-high'),
    );
  });

  it('uses the history of an exercise done before', () => {
    const s = start();
    // Swap the triceps slot for the incline press, which the paper session logged at 22 kg.
    const next = replaceExerciseInSession(s, 5, upperA.exercises[0], { settings: defaultSettings, sessions: [seedSession()] });
    expect(next.exercises[5].sets[0].weight).toBe(22);
  });

  it('clears "strongest exercise" if it pointed at the replaced one', () => {
    const s = { ...start(), strongestExId: 'cable-fly-low-high' };
    const next = replaceExerciseInSession(s, 2, lib('pec-deck'), { settings: defaultSettings, sessions: [] });
    expect(next.strongestExId).toBeNull();
  });

  it('can also change the program, keeping the sets the person chose', () => {
    const p = replaceExerciseInProgram(defaultProgram, 'upper-a', 'cable-fly-low-high', lib('pec-deck'))!;
    const ex = p.sessions.find((t) => t.id === 'upper-a')!.exercises;
    expect(ex[2].id).toBe('pec-deck');
    expect(ex[2].sets).toBe(3);
    expect(ex).toHaveLength(6);
    // Other sessions are untouched.
    expect(p.sessions.find((t) => t.id === 'lower')).toBe(defaultProgram.sessions.find((t) => t.id === 'lower'));
  });

  it('reports when the exercise is no longer in the program', () => {
    expect(replaceExerciseInProgram(defaultProgram, 'upper-a', 'not-there', lib('pec-deck'))).toBeNull();
  });

  it('turns a session exercise back into program shape for the picker', () => {
    const t = templateOfLog(start('yellow').exercises[0]);
    expect(t).toMatchObject({ id: 'incline-db-press', muscle: 'chest', sets: 3 });
  });
});
