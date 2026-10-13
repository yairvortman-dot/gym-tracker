import { describe, expect, it } from 'vitest';
import { exerciseLibrary } from '../src/data/exerciseLibrary';
import { exercisePool, pickerGroups, templateFrom } from '../src/logic/library';
import { defaultProgram } from '../src/data/defaultProgram';
import type { ExerciseTemplate } from '../src/types';

const session = (id: string) => defaultProgram.sessions.find((t) => t.id === id)!.exercises;
const relevantIds = (s: ExerciseTemplate[]) =>
  pickerGroups(exercisePool([]), s).relevant.flatMap((g) => g.items.map((x) => x.id));
const relevantMuscles = (s: ExerciseTemplate[]) => pickerGroups(exercisePool([]), s).relevant.map((g) => g.muscle);

describe('exercise library', () => {
  it('has unique ids and names, and sane ranges', () => {
    expect(new Set(exerciseLibrary.map((e) => e.id)).size).toBe(exerciseLibrary.length);
    expect(new Set(exerciseLibrary.map((e) => e.name)).size).toBe(exerciseLibrary.length);
    for (const e of exerciseLibrary) {
      expect(e.repMin).toBeLessThanOrEqual(e.repMax);
      expect(e.restMinSec).toBeLessThanOrEqual(e.restMaxSec);
    }
  });

  it('contains every exercise of the default program under the same id and name, so history links up', () => {
    const byId = new Map(exerciseLibrary.map((e) => [e.id, e]));
    for (const t of defaultProgram.sessions) {
      for (const e of t.exercises) {
        expect(byId.get(e.id)?.name).toBe(e.name);
        expect(byId.get(e.id)?.muscle).toBe(e.muscle);
      }
    }
  });
});

describe('relevant exercises for a session', () => {
  it('a chest + shoulders day suggests chest, shoulders and triceps, not biceps or legs', () => {
    const ids = relevantIds(session('upper-a'));
    expect(relevantMuscles(session('upper-a'))).toEqual(['chest', 'shoulders', 'arms']);
    expect(ids).toContain('bench-press');
    expect(ids).toContain('machine-lateral-raise');
    expect(ids).toContain('triceps-pushdown');
    expect(ids).not.toContain('barbell-curl');
    expect(ids).not.toContain('leg-press');
  });

  it('a back day suggests back, biceps and rear delts', () => {
    const ids = relevantIds([session('upper-b')[0]]); // מתח only
    expect(ids).toContain('seated-cable-row');
    expect(ids).toContain('hammer-curl');
    expect(ids).toContain('reverse-pec-deck');
    expect(ids).not.toContain('lateral-raise');
    expect(ids).not.toContain('triceps-pushdown');
  });

  it('a leg day suggests legs first, then core', () => {
    expect(relevantMuscles(session('lower'))).toEqual(['legs', 'core']);
  });

  it('an empty session has nothing "relevant" and everything else is listed', () => {
    const { relevant, others } = pickerGroups(exercisePool([]), []);
    expect(relevant).toHaveLength(0);
    expect(others.flatMap((g) => g.items)).toHaveLength(exerciseLibrary.length);
  });

  it('offers the person\'s own exercises too, once', () => {
    const own: ExerciseTemplate = { ...session('upper-a')[0], id: 'my-1', name: 'לחיצה שלי' };
    const pool = exercisePool([own, own, session('upper-a')[0]]);
    expect(pool.filter((x) => x.id === 'my-1')).toHaveLength(1);
    expect(pool.filter((x) => x.id === 'incline-db-press')).toHaveLength(1);
  });

  it('a picked exercise becomes a plain program entry', () => {
    const t = templateFrom(exerciseLibrary.find((e) => e.id === 'hammer-curl')!);
    expect('focus' in t).toBe(false);
    expect(t).toMatchObject({ id: 'hammer-curl', sets: 3, repMin: 8, repMax: 12, muscle: 'arms', weightMode: 'perHand' });
  });
});
