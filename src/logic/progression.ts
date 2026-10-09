import type { DayState, ExerciseLog, Target } from '../types';
import { doneSets, roundKg, setReps, topWeight } from './sets';

export interface TargetInput {
  repMin: number;
  repMax: number;
  /** Sets planned for today, after the day-state adjustment. */
  sets: number;
  step: number;
  /** Bodyweight exercises log added weight, which can't go below 0. */
  minWeight?: number;
  last: ExerciseLog | null;
  override: { weight: number | null; reps: number; note?: string } | null;
  calibration: boolean;
  dayState: DayState;
}

export function targetRir(calibration: boolean, dayState: DayState): number {
  if (dayState !== 'green') return 3;
  return calibration ? 2 : 1;
}

const fill = (n: number, v: number) => Array.from({ length: n }, () => v);

/**
 * Double progression.
 * - Every set at the top of the range with ≥1 rep in reserve → one kg step up, back to the bottom of the range.
 * - Most sets below the bottom of the range → one kg step down.
 * - Otherwise → same weight, one more rep per set.
 * No increases during calibration or on yellow/red days.
 */
export function computeTarget(i: TargetInput): Target {
  const rir = targetRir(i.calibration, i.dayState);
  const noIncrease = i.calibration || i.dayState !== 'green';

  if (i.override) {
    return { weight: i.override.weight, reps: fill(i.sets, i.override.reps), rir, kind: 'override', note: i.override.note };
  }

  const last = i.last;
  const done = last ? doneSets(last) : [];
  if (!last || done.length === 0) {
    const calRir = Math.max(rir, 2);
    return {
      weight: null,
      reps: fill(i.sets, i.repMin),
      rir: calRir,
      kind: 'calibrate',
      note: `אין נתונים קודמים. בחר משקל שמשאיר ${calRir} חזרות ברזרבה`,
    };
  }

  const uni = last.plan.unilateral;
  const reps = done.map((s) => setReps(s, uni) as number);
  const w = topWeight(last);
  const minW = i.minWeight ?? 0;

  const allSetsDone = last.sets.length > 0 && last.sets.every((s) => s.status === 'done') && done.length === last.sets.length;
  const allTop = allSetsDone && reps.every((r) => r >= i.repMax);

  if (allTop) {
    if (last.rir == null) {
      return { weight: w, reps: fill(i.sets, i.repMax), rir, kind: 'hold', note: 'הגעת לראש הטווח. סמן RIR כדי לקבל המלצה להעלות משקל' };
    }
    if (last.rir < 1) {
      return { weight: w, reps: fill(i.sets, i.repMax), rir, kind: 'hold', note: 'הגעת לראש הטווח עד כשל. אותו משקל עוד פעם' };
    }
    if (noIncrease || w == null) {
      return {
        weight: w,
        reps: fill(i.sets, i.repMax),
        rir,
        kind: 'hold',
        note: i.calibration ? 'מוכן להעלות משקל, אחרי שבועות הכיול' : 'מוכן להעלות משקל, ביום מלא',
      };
    }
    return { weight: roundKg(w + i.step), reps: fill(i.sets, i.repMin), rir, kind: 'increase', note: `+${i.step} ק״ג, חזרה לתחתית הטווח` };
  }

  const below = reps.filter((r) => r < i.repMin).length;
  if (w != null && below > reps.length / 2 && roundKg(w - i.step) >= minW) {
    return { weight: roundKg(w - i.step), reps: fill(i.sets, i.repMin), rir, kind: 'decrease', note: `רוב הסטים מתחת לטווח: −${i.step} ק״ג` };
  }

  // Same weight, one more rep on each set (capped at the top of the range).
  const lowest = Math.min(...reps);
  const perSet: number[] = [];
  for (let k = 0; k < i.sets; k++) {
    const s = last.sets[k];
    const base = s && s.status === 'done' ? (setReps(s, uni) ?? lowest) : lowest;
    perSet.push(Math.min(i.repMax, base + 1));
  }
  return { weight: w, reps: perSet, rir, kind: 'more-reps', note: 'אותו משקל, חזרה אחת יותר בכל סט' };
}
