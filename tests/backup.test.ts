import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeeded, getMeta, saveProgram } from '../src/db';
import { buildBackup, buildCsv, importBackup, parseBackup } from '../src/lib/backup';
import { seedSession } from '../src/data/seedSession';
import type { Program } from '../src/types';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('first run', () => {
  it('seeds the program, settings and the paper session exactly once', async () => {
    await ensureSeeded();
    await ensureSeeded();
    expect(await db.sessions.count()).toBe(1);
    const program = await getMeta<Program>('program');
    expect(program!.sessions.map((t) => t.name)).toEqual(['עליון א׳', 'תחתון', 'עליון ב׳', 'עליון ג׳', 'ריצה קלה']);
  });
});

describe('backup', () => {
  it('round-trips through JSON and replaces what is on the device', async () => {
    await ensureSeeded();
    const program = (await getMeta<Program>('program'))!;
    await saveProgram({ ...program, sessions: program.sessions.slice(0, 2) });
    const text = JSON.stringify(await buildBackup());

    // Wipe and change things, then restore.
    await db.sessions.clear();
    await saveProgram({ sessions: [] });
    await importBackup(parseBackup(text));

    expect(await db.sessions.count()).toBe(1);
    expect((await getMeta<Program>('program'))!.sessions).toHaveLength(2);
    expect((await db.sessions.get('seed-2026-10-09'))!.exercises[0].sets.map((s) => s.reps)).toEqual([8, 7, 8, 6]);
  });

  it('rejects files that are not a backup', () => {
    expect(() => parseBackup('nope')).toThrow('JSON');
    expect(() => parseBackup('{"a":1}')).toThrow('גיבוי');
  });

  it('CSV has one row per set and leaves skipped sets without reps', () => {
    const csv = buildCsv([seedSession()]);
    const lines = csv.replace(/^﻿/, '').split('\n');
    expect(lines[0]).toContain('reps_left');
    // 4 + 3 + 3 + 3 + 3 + 3 sets in the seed session.
    expect(lines).toHaveLength(1 + 19);
    const flySkipped = lines.find((l) => l.includes('מלמטה למעלה') && l.includes(',3,skipped,'))!;
    // The name contains a comma, so it is quoted and shifts a naive split by one.
    expect(flySkipped).toContain('"פרפר בכבל בשתי ידיים, מלמטה למעלה"');
    expect(flySkipped.split(',').slice(10, 14)).toEqual(['27', '', '', '']);
    const machine = lines.find((l) => l.includes('מכונת לחיצת חזה'))!;
    expect(machine.split(',').slice(10, 13)).toEqual(['6', '6', '6']);
  });
});
