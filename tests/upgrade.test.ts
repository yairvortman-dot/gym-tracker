import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeeded, getMeta, withDefaults } from '../src/db';
import { defaultProgram } from '../src/data/defaultProgram';
import { seedSession } from './fixtures/seedSession';
import type { Program, Settings } from '../src/types';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

/**
 * A phone set up with the first version: its own program, its history, and settings saved before
 * the questionnaire, the calibration length, the abs setting and the light/dark choice existed.
 */
async function firstVersionPhone() {
  const myProgram: Program = {
    sessions: defaultProgram.sessions.map((t) => (t.id === 'upper-a' ? { ...t, name: 'עליון א׳ שלי' } : t)),
  };
  const oldSettings = { kgStep: { dumbbell: 2, cable: 2.5, machine: 2.5, barbell: 2.5, bodyweight: 2.5 }, programStart: '2026-10-09', sound: false };
  await db.meta.bulkPut([
    { key: 'program', value: myProgram },
    { key: 'settings', value: oldSettings },
    { key: 'seeded', value: true },
  ]);
  const workouts = [seedSession(), { ...seedSession(), id: 'second', startedAt: seedSession().startedAt + 86_400_000 }];
  await db.sessions.bulkPut(workouts);
  return { myProgram, workouts };
}

describe('updating a phone that already has data', () => {
  it('keeps the program, the history and the settings exactly as they were', async () => {
    const { myProgram, workouts } = await firstVersionPhone();

    await ensureSeeded(); // what the new version runs on every start

    expect(await getMeta<Program>('program')).toEqual(myProgram);
    expect(await db.sessions.orderBy('startedAt').toArray()).toEqual(workouts);
    // No questionnaire on a phone that's already in use.
    expect(await getMeta('onboarding')).toBeUndefined();
    const s = withDefaults((await getMeta<Partial<Settings>>('settings'))!);
    expect(s.programStart).toBe('2026-10-09');
    expect(s.sound).toBe(false);
  });

  it('fills the new settings with defaults that change nothing for the user', async () => {
    await firstVersionPhone();
    const s = withDefaults((await getMeta<Partial<Settings>>('settings'))!);
    expect(s.theme).toBe('system'); // follows the phone, as before
    expect(s.calibrationDays).toBe(14); // the 2 calibration weeks the first version had
    expect(s.absFinisher).toBe(true); // the "10 דקות בטן" checkbox stays
  });
});
