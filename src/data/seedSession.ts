import type { ExerciseLog, SessionLog, SetLog } from '../types';
import { defaultProgram } from './defaultProgram';
import { planOf } from '../logic/sets';

const upperA = defaultProgram.sessions.find((t) => t.id === 'upper-a')!;

const done = (weight: number, reps: number): SetLog => ({ weight, reps, repsL: null, repsR: null, status: 'done' });
const doneLR = (weight: number, l: number, r: number): SetLog => ({ weight, reps: null, repsL: l, repsR: r, status: 'done' });
const skipped = (weight: number | null): SetLog => ({ weight, reps: null, repsL: null, repsR: null, status: 'skipped' });

function log(exId: string, sets: SetLog[], extra: Partial<ExerciseLog> = {}): ExerciseLog {
  const t = upperA.exercises.find((e) => e.id === exId)!;
  return { exId, name: t.name, plan: planOf(t), skipped: false, rir: null, note: '', sets, target: null, ...extra };
}

/** The first session, copied from the paper log (old version of עליון א׳). */
export function seedSession(): SessionLog {
  const startedAt = new Date(2026, 9, 9, 11, 0).getTime();
  return {
    id: 'seed-2026-10-09',
    templateId: 'upper-a',
    templateName: upperA.name,
    kind: 'strength',
    status: 'finished',
    startedAt,
    finishedAt: startedAt,
    durationMin: null,
    sleepHours: 8,
    energy: 4,
    sick: false,
    backPain: false,
    dayState: 'green',
    dayStateAuto: 'green',
    calibration: true,
    exercises: [
      log('incline-db-press', [done(22, 8), done(22, 7), done(22, 8), done(22, 6)]),
      log('chest-press-machine-single', [doneLR(27, 6, 6), doneLR(27, 6, 6), doneLR(27, 6, 6)], {
        note: 'בגרסה הישנה: פרפר בכבל ביד אחת. חזרות שוות בכוונה',
      }),
      log('cable-fly-low-high', [done(27, 6), done(27, 8), skipped(27)], { note: 'סט 3: עייף מדי' }),
      log('seated-db-shoulder-press', [done(12, 11), done(12, 10), done(12, 10)]),
      log('lateral-raise', [done(10, 10), done(10, 7), skipped(10)]),
      log('overhead-cable-triceps', [skipped(null), skipped(null), skipped(null)], { skipped: true }),
    ],
    absDone: false,
    strongestExId: null,
    note: 'הועתק מהדף הידני',
    distanceKm: null,
    nextTargets: {
      'incline-db-press': { weight: 22, reps: 8 },
      'chest-press-machine-single': { weight: 27, reps: 7, note: '7 חזרות לכל צד' },
      'cable-fly-low-high': { weight: 20, reps: 12 },
      'seated-db-shoulder-press': { weight: 12, reps: 12 },
      'lateral-raise': { weight: 8, reps: 12 },
      'overhead-cable-triceps': { weight: null, reps: 12, note: 'כיול: בערך 12 חזרות בלי להגיע לכשל' },
    },
  };
}
