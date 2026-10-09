export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'other';
export type Equipment = 'dumbbell' | 'cable' | 'machine' | 'barbell' | 'bodyweight';
/** How the logged weight should be read. `added` = extra weight on top of bodyweight (0 = bodyweight only). */
export type WeightMode = 'perHand' | 'perSide' | 'total' | 'added';
export type DayState = 'green' | 'yellow' | 'red';
export type SessionKind = 'strength' | 'cardio';

export interface ExerciseTemplate {
  /** Stable id. History, "last time" and progress charts are linked by this id, so the same
   *  exercise in two sessions (e.g. הרמות צד) shares one id. */
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  restMinSec: number;
  restMaxSec: number;
  /** Left and right reps are logged separately. */
  unilateral: boolean;
  weightMode: WeightMode;
  equipment: Equipment;
  muscle: MuscleGroup;
  /** Short coaching cue shown under the name, e.g. "חזרות נקיות". */
  cue?: string;
}

export interface SessionTemplate {
  id: string;
  name: string;
  subtitle?: string;
  durationMin: number;
  kind: SessionKind;
  /** Bonus sessions are the first to skip in a busy week; they also define the "with bonus" weekly targets. */
  bonus: boolean;
  exercises: ExerciseTemplate[];
}

export interface Program {
  /** Array order is the rotation order. */
  sessions: SessionTemplate[];
}

export interface Settings {
  kgStep: Record<Equipment, number>;
  /** ISO date (yyyy-mm-dd). The first 14 days from this date are calibration. */
  programStart: string;
  sound: boolean;
}

export type SetStatus = 'pending' | 'done' | 'skipped';

export interface SetLog {
  weight: number | null;
  reps: number | null;
  repsL: number | null;
  repsR: number | null;
  status: SetStatus;
}

export interface Target {
  weight: number | null;
  /** One entry per planned set. */
  reps: number[];
  /** Reps in reserve to aim for. */
  rir: number;
  kind: 'override' | 'increase' | 'decrease' | 'more-reps' | 'hold' | 'calibrate' | 'none';
  note?: string;
}

export interface ExerciseLog {
  exId: string;
  name: string;
  cue?: string;
  /** Copy of the template at the time of the session, so editing the program never rewrites history. */
  plan: Pick<ExerciseTemplate, 'sets' | 'repMin' | 'repMax' | 'restMinSec' | 'restMaxSec' | 'unilateral' | 'weightMode' | 'equipment' | 'muscle'>;
  skipped: boolean;
  /** Red-day extra: hidden until picked, dropped on finish if never picked. */
  optional?: 'available' | 'picked';
  rir: number | null;
  note: string;
  sets: SetLog[];
  target: Target | null;
}

export interface SessionLog {
  id: string;
  templateId: string;
  templateName: string;
  kind: SessionKind;
  status: 'active' | 'finished';
  startedAt: number;
  finishedAt: number | null;
  /** Editable on finish; defaults to finishedAt − startedAt. */
  durationMin: number | null;
  sleepHours: number | null;
  energy: number | null;
  sick: boolean;
  backPain: boolean;
  dayState: DayState;
  dayStateAuto: DayState;
  calibration: boolean;
  exercises: ExerciseLog[];
  absDone: boolean;
  strongestExId: string | null;
  note: string;
  distanceKm: number | null;
  /** One-time targets for the next time each exercise is done (used for the seeded paper session). */
  nextTargets?: Record<string, { weight: number | null; reps: number; note?: string }>;
}
