import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Program, SessionLog, Settings } from './types';
import { defaultProgram, defaultSettings } from './data/defaultProgram';
import { seedSession } from './data/seedSession';

interface Meta {
  key: string;
  value: unknown;
}

class GymDB extends Dexie {
  sessions!: Table<SessionLog, string>;
  meta!: Table<Meta, string>;
  constructor() {
    super('gym-tracker');
    this.version(1).stores({ sessions: 'id, startedAt, status, templateId', meta: 'key' });
  }
}

export const db = new GymDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });

/** First run: load the program, default settings and the paper session. */
export async function ensureSeeded() {
  await db.transaction('rw', db.sessions, db.meta, async () => {
    if (await db.meta.get('seeded')) return;
    await db.meta.bulkPut([
      { key: 'program', value: defaultProgram },
      { key: 'settings', value: defaultSettings },
      { key: 'seeded', value: true },
    ]);
    await db.sessions.put(seedSession());
  });
}

export const saveSession = (s: SessionLog) => db.sessions.put(s);
export const deleteSession = (id: string) => db.sessions.delete(id);
export const saveProgram = (p: Program) => setMeta('program', p);
export const saveSettings = (s: Settings) => setMeta('settings', s);

export function useProgram(): Program | undefined {
  return useLiveQuery(() => getMeta<Program>('program'));
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const s = await getMeta<Settings>('settings');
    return s ? { ...defaultSettings, ...s, kgStep: { ...defaultSettings.kgStep, ...s.kgStep } } : undefined;
  });
}

export function useSessions(): SessionLog[] | undefined {
  return useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray());
}

export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(() => getMeta<T>(key), [key]);
}
