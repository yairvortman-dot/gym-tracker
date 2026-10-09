import { db, getMeta, setMeta } from '../db';
import type { Program, SessionLog, Settings } from '../types';
import { setReps } from '../logic/sets';

export interface Backup {
  app: 'gym-tracker';
  version: 1;
  exportedAt: string;
  program: Program;
  settings: Settings;
  sessions: SessionLog[];
}

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** iPhone: the share sheet ("Save to Files") is the reliable path; elsewhere a normal download.
 *  Returns false if the person cancelled the share sheet. */
async function deliver(name: string, type: string, text: string): Promise<boolean> {
  const file = new File([text], name, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

export async function buildBackup(): Promise<Backup> {
  return {
    app: 'gym-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    program: (await getMeta<Program>('program'))!,
    settings: (await getMeta<Settings>('settings'))!,
    sessions: await db.sessions.orderBy('startedAt').toArray(),
  };
}

export async function exportJson() {
  const data = await buildBackup();
  const saved = await deliver(`gym-backup-${stamp()}.json`, 'application/json', JSON.stringify(data, null, 1));
  if (saved) await setMeta('lastExport', Date.now());
}

export function parseBackup(text: string): Backup {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('הקובץ אינו JSON תקין');
  }
  if (data.app !== 'gym-tracker' || !data.program || !Array.isArray(data.program.sessions) || !Array.isArray(data.sessions)) {
    throw new Error('זה לא קובץ גיבוי של יומן האימון');
  }
  return data as Backup;
}

/** Replaces everything on this device with the backup. */
export async function importBackup(b: Backup) {
  await db.transaction('rw', db.sessions, db.meta, async () => {
    await db.sessions.clear();
    await db.sessions.bulkPut(b.sessions);
    await db.meta.bulkPut([
      { key: 'program', value: b.program },
      { key: 'settings', value: b.settings },
      { key: 'seeded', value: true },
    ]);
  });
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per set. Skipped sets keep their row, marked "skipped", with no reps. */
export function buildCsv(sessions: SessionLog[]): string {
  const rows: unknown[][] = [
    ['date', 'time', 'session', 'day_state', 'sleep_h', 'energy', 'exercise', 'set', 'status', 'weight_kg', 'reps', 'reps_left', 'reps_right', 'rir', 'exercise_note', 'duration_min', 'abs_10min'],
  ];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const date = d.toLocaleDateString('en-CA');
    const time = d.toTimeString().slice(0, 5);
    const base = [date, time, s.templateName, s.dayState, s.sleepHours, s.energy];
    if (s.exercises.length === 0) {
      rows.push([...base, '', '', '', '', '', '', '', '', s.note, s.durationMin, '']);
      continue;
    }
    for (const ex of s.exercises) {
      ex.sets.forEach((set, i) => {
        const status = ex.skipped ? 'skipped' : set.status;
        const uni = ex.plan.unilateral;
        rows.push([
          ...base,
          ex.name,
          i + 1,
          status,
          set.weight,
          uni ? setReps(set, true) : set.reps,
          uni ? set.repsL : '',
          uni ? set.repsR : '',
          ex.rir,
          ex.note,
          s.durationMin,
          s.kind === 'strength' ? (s.absDone ? 1 : 0) : '',
        ]);
      });
    }
  }
  // BOM so Excel opens the Hebrew correctly.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export async function exportCsv() {
  const sessions = await db.sessions.orderBy('startedAt').toArray();
  await deliver(`gym-sets-${stamp()}.csv`, 'text/csv', buildCsv(sessions));
}
