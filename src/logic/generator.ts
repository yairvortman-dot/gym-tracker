import type { ExerciseTemplate, MuscleGroup, Program, SessionTemplate } from '../types';
import { exerciseLibrary, type LibraryExercise } from '../data/exerciseLibrary';
import { exerciseMeta, type Gear, type Joint, type Pattern } from '../data/exerciseMeta';
import { templateFrom } from './library';

// ---------- answers ----------

export type Goal = 'muscle' | 'strength' | 'fatloss' | 'general';
export type Experience = 'none' | 'lt6m' | '6m2y' | 'gt2y';
export type Recent = 'regular' | 'onoff' | 'no';
export type AgeBand = 'u25' | '26_40' | '41_55' | '56p';
export type Style = 'machines' | 'free' | 'mix';
export type Emphasis = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes';
export type AvoidKey = 'squat' | 'deadlift' | 'pullup' | 'dips';
export type AbsChoice = 'finisher' | 'inProgram' | 'none';
export type Week = 'calm' | 'busy' | 'veryBusy';

export interface Answers {
  goal: Goal;
  experience: Experience;
  /** Only asked when the person has trained before. */
  recent?: Recent;
  age: AgeBand;
  days: 2 | 3 | 4 | 5;
  minutes: 30 | 45 | 60 | 75;
  gear: Gear[];
  /** Only asked when the person has both machines/cables and free weights. */
  style?: Style;
  /** Empty = balanced. At most two. */
  emphasis: Emphasis[];
  limits: Joint[];
  avoid: AvoidKey[];
  cardio: 0 | 1 | 2;
  abs: AbsChoice;
  week: Week;
  /** Only asked with 3+ days. */
  bonus?: boolean;
}

export const avoidIds: Record<AvoidKey, string[]> = {
  squat: ['back-squat'],
  deadlift: ['deadlift'],
  pullup: ['pull-up', 'chin-up'],
  dips: ['chest-dips', 'triceps-dips', 'chair-dips'],
};

export interface Generated {
  program: Program;
  settings: { programStart: string; calibrationDays: number; absFinisher: boolean };
  /** Plain-language reasons shown on the summary screen. */
  reasons: string[];
}

// ---------- session blueprints ----------

type Pri = 1 | 2 | 3;
interface Slot {
  pattern: Pattern;
  /** 1 = the session's main lifts, never removed. 3 = first to go when time is short. */
  pri: Pri;
}

interface DayBlueprint {
  key: string;
  name: string;
  subtitle?: string;
  slots: Slot[];
  /** Small exercises added when there's time left. */
  fillers: Pattern[];
}

const s = (pattern: Pattern, pri: Pri): Slot => ({ pattern, pri });

const DAYS: Record<string, DayBlueprint> = {
  fbA: {
    key: 'fbA',
    name: 'גוף מלא א׳',
    slots: [s('squat', 1), s('h_push', 1), s('h_pull', 1), s('side_delt', 2), s('ham_curl', 3), s('biceps', 3), s('calves', 3)],
    fillers: ['triceps', 'rear_delt'],
  },
  fbB: {
    key: 'fbB',
    name: 'גוף מלא ב׳',
    slots: [s('hinge', 1), s('v_pull', 1), s('incline_push', 1), s('lunge', 2), s('rear_delt', 3), s('triceps', 3), s('chest_iso', 3)],
    fillers: ['biceps', 'side_delt'],
  },
  fbC: {
    key: 'fbC',
    name: 'גוף מלא ג׳',
    slots: [s('squat', 1), s('v_push', 1), s('h_pull', 1), s('glute', 2), s('chest_iso', 2), s('biceps', 3), s('triceps', 3)],
    fillers: ['calves', 'side_delt'],
  },
  upA: {
    key: 'upA',
    name: 'עליון א׳',
    subtitle: 'דגש חזה',
    slots: [s('h_push', 1), s('h_pull', 1), s('incline_push', 2), s('v_pull', 2), s('side_delt', 2), s('triceps', 2), s('chest_iso', 3), s('biceps', 3)],
    fillers: ['rear_delt'],
  },
  upB: {
    key: 'upB',
    name: 'עליון ב׳',
    subtitle: 'דגש גב',
    slots: [s('v_pull', 1), s('h_pull', 1), s('h_push', 2), s('v_push', 2), s('rear_delt', 2), s('biceps', 2), s('triceps', 3), s('side_delt', 3)],
    fillers: ['back_iso'],
  },
  loA: {
    key: 'loA',
    name: 'תחתון א׳',
    subtitle: 'דגש ארבע ראשי',
    slots: [s('squat', 1), s('hinge', 2), s('lunge', 2), s('quad_iso', 3), s('ham_curl', 3), s('calves', 3)],
    fillers: [],
  },
  loB: {
    key: 'loB',
    name: 'תחתון ב׳',
    subtitle: 'דגש ירך אחורית וישבן',
    slots: [s('hinge', 1), s('squat', 2), s('glute', 2), s('ham_curl', 2), s('lunge', 3), s('calves', 3)],
    fillers: [],
  },
  upC: {
    key: 'upC',
    name: 'עליון ג׳',
    slots: [s('incline_push', 1), s('v_pull', 1), s('v_push', 2), s('h_pull', 2), s('chest_iso', 3), s('side_delt', 3)],
    fillers: ['biceps', 'triceps'],
  },
  loC: {
    key: 'loC',
    name: 'תחתון ג׳',
    subtitle: 'ישבן ורגליים',
    slots: [s('glute', 1), s('lunge', 1), s('hinge', 2), s('ham_curl', 2), s('quad_iso', 3), s('calves', 3)],
    fillers: [],
  },
  arms: {
    key: 'arms',
    name: 'כתפיים וידיים',
    slots: [s('v_push', 1), s('side_delt', 1), s('biceps', 2), s('triceps', 2), s('rear_delt', 2), s('biceps', 3), s('triceps', 3)],
    fillers: ['side_delt'],
  },
};

/** Which movements count as working each emphasis area. */
const emphasisPatterns: Record<Emphasis, Pattern[]> = {
  chest: ['h_push', 'incline_push', 'chest_iso'],
  back: ['v_pull', 'h_pull', 'back_iso'],
  shoulders: ['v_push', 'side_delt', 'rear_delt', 'front_delt'],
  arms: ['biceps', 'triceps'],
  legs: ['squat', 'lunge', 'hinge', 'ham_curl', 'quad_iso', 'calves'],
  glutes: ['glute', 'hinge', 'lunge'],
};

/** Extra exercises an emphasis adds to sessions that already train the area. */
const emphasisExtras: Record<Emphasis, Pattern[]> = {
  chest: ['chest_iso'],
  back: ['h_pull'],
  shoulders: ['side_delt', 'rear_delt'],
  arms: ['biceps', 'triceps'],
  legs: ['quad_iso'],
  glutes: ['glute'],
};

const emphasisLabel: Record<Emphasis, string> = {
  chest: 'חזה',
  back: 'גב',
  shoulders: 'כתפיים',
  arms: 'ידיים',
  legs: 'רגליים',
  glutes: 'ישבן',
};

/** If nothing fits a slot (no equipment, pain), try these movements instead. */
const fallback: Partial<Record<Pattern, Pattern[]>> = {
  ham_curl: ['hinge', 'glute'],
  quad_iso: ['lunge', 'squat'],
  glute: ['hinge', 'lunge'],
  back_iso: ['h_pull', 'v_pull'],
  front_delt: ['v_push'],
  rear_delt: ['h_pull'],
  chest_iso: ['incline_push', 'h_push'],
  incline_push: ['h_push'],
  h_push: ['incline_push'],
  v_pull: ['h_pull'],
  h_pull: ['v_pull'],
  squat: ['lunge'],
  lunge: ['squat'],
  hinge: ['glute', 'ham_curl'],
  v_push: ['incline_push'],
};

// ---------- sets, reps, rest ----------

type Dose = { reps: [number, number]; rest: [number, number] };

/** Reps and rest (minutes) by goal, for main lifts, other compounds, isolation and small muscles. */
const doses: Record<Goal, { main: Dose; compound: Dose; iso: Dose; isoHigh: Dose }> = {
  muscle: {
    main: { reps: [6, 10], rest: [2, 3] },
    compound: { reps: [8, 12], rest: [2, 2] },
    iso: { reps: [10, 15], rest: [1.5, 1.5] },
    isoHigh: { reps: [12, 20], rest: [1, 1] },
  },
  strength: {
    main: { reps: [4, 6], rest: [3, 3] },
    compound: { reps: [6, 10], rest: [2, 3] },
    iso: { reps: [8, 12], rest: [1.5, 1.5] },
    isoHigh: { reps: [12, 15], rest: [1, 1] },
  },
  fatloss: {
    main: { reps: [8, 12], rest: [2, 2] },
    compound: { reps: [10, 12], rest: [1.5, 1.5] },
    iso: { reps: [12, 15], rest: [1, 1] },
    isoHigh: { reps: [15, 20], rest: [1, 1] },
  },
  general: {
    main: { reps: [8, 12], rest: [2, 2] },
    compound: { reps: [10, 12], rest: [1.5, 1.5] },
    iso: { reps: [12, 15], rest: [1, 1] },
    isoHigh: { reps: [12, 20], rest: [1, 1] },
  },
};

const isNew = (a: Answers) => a.experience === 'none' || a.experience === 'lt6m';

function baseSets(a: Answers, role: 'compound' | 'iso' | 'isoHigh', pri: Pri): number {
  let sets: number;
  if (isNew(a)) sets = role === 'compound' ? 3 : 2;
  else if (a.experience === '6m2y') sets = 3;
  else sets = role === 'compound' && pri === 1 ? 4 : 3;
  // Coming back after a break: start a little lighter on the main lifts.
  if (a.recent === 'no' && sets === 4) sets = 3;
  if (a.week === 'veryBusy' && role !== 'compound') sets = Math.max(2, sets - 1);
  return sets;
}

// ---------- the builder ----------

interface Pick {
  ex: LibraryExercise;
  slot: Slot;
  sets: number;
  emphasized: boolean;
}

const metaOf = (id: string) => exerciseMeta[id];

/** The exercise to drop at a priority: the last one. Emphasis is handled later, from spare time. */
const dropIndex = (picks: Pick[], pri: Pri): number => picks.map((p) => p.slot.pri).lastIndexOf(pri);

/** Order for trimming sets: least important first, bigger exercises before smaller. */
const trimFirst = (x: Pick, y: Pick) => y.slot.pri - x.slot.pri || y.sets - x.sets;

export function generateProgram(a: Answers, today: Date = new Date()): Generated {
  const reasons: string[] = [];
  const gear = new Set(a.gear);
  const avoid = new Set(a.avoid.flatMap((k) => avoidIds[k]));
  const usedAnywhere = new Map<string, number>();

  const hasGear = (ex: LibraryExercise) => metaOf(ex.id).needs.every((g) => gear.has(g));
  const blockedByPain = (ex: LibraryExercise) => a.limits.some((j) => metaOf(ex.id).stress?.[j] === 2);
  const loadable = gear.size > 0;

  const score = (ex: LibraryExercise, slot: Slot): number => {
    const meta = metaOf(ex.id);
    let sc = 0;
    // Technique against experience.
    if (a.experience === 'none') sc -= meta.tech === 3 ? 6 : meta.tech === 2 ? 2 : 0;
    if (a.experience === 'lt6m') sc -= meta.tech === 3 ? 4 : meta.tech === 2 ? 1 : 0;
    // Strength goals with experience: barbell main lifts first.
    if (a.goal === 'strength' && !isNew(a) && slot.pri === 1 && meta.role === 'compound') sc += meta.needs.includes('bb') ? 3 : meta.light ? -3 : 0;
    // Preference.
    const machine = meta.needs.includes('machine') || meta.needs.includes('cable');
    const free = meta.needs.includes('db') || meta.needs.includes('bb');
    if (a.style === 'machines' && machine) sc += 2;
    if (a.style === 'free' && free) sc += 2;
    // Age: gentler on the joints, less technical.
    if (a.age === '41_55') sc += (machine ? 0.5 : 0) - (meta.tech === 3 ? 1 : 0);
    if (a.age === '56p') sc += (machine ? 1.5 : 0) - (meta.tech === 3 ? 3 : 0);
    // Pain: moderate load only when nothing gentler fits.
    for (const j of a.limits) if (meta.stress?.[j] === 1) sc -= 3;
    // With equipment, prefer exercises you can load over plain bodyweight.
    if (loadable && meta.needs.length === 0 && meta.pattern !== 'core') sc -= 1.5;
    // Variety across the week.
    sc -= 1.5 * (usedAnywhere.get(ex.id) ?? 0);
    return sc;
  };

  const choose = (pattern: Pattern, slot: Slot, takenToday: Set<string>): LibraryExercise | null => {
    const pool = exerciseLibrary.filter(
      (ex) => metaOf(ex.id)?.pattern === pattern && hasGear(ex) && !avoid.has(ex.id) && !blockedByPain(ex) && !takenToday.has(ex.id),
    );
    if (pool.length === 0) return null;
    // Stable: on a tie the earlier library entry wins.
    return pool.map((ex, i) => ({ ex, sc: score(ex, slot) - i * 0.001 })).sort((x, y) => y.sc - x.sc)[0].ex;
  };

  const pickFor = (slot: Slot, takenToday: Set<string>): LibraryExercise | null =>
    choose(slot.pattern, slot, takenToday) ?? (fallback[slot.pattern] ?? []).reduce<LibraryExercise | null>((got, p) => got ?? choose(p, slot, takenToday), null);

  const emphasisOf = (pattern: Pattern) => a.emphasis.filter((e) => emphasisPatterns[e].includes(pattern));

  const dose = (ex: LibraryExercise, slot: Slot): Dose => {
    const meta = metaOf(ex.id);
    const table = doses[a.goal];
    let d: Dose = meta.role === 'compound' ? (slot.pri === 1 ? table.main : table.compound) : meta.role === 'iso' ? table.iso : table.isoHigh;
    // New lifters don't go as heavy as 4–6 reps, and 4–6 only makes sense on barbell and machine lifts.
    if (a.goal === 'strength' && d === table.main && (isNew(a) || meta.light)) d = { reps: [6, 8], rest: [2, 3] };
    // An exercise that loads a painful joint is never done heavy.
    if (d === table.main && a.limits.some((j) => meta.stress?.[j])) d = table.compound;
    // Bodyweight and core work keep the ranges written for them (e.g. plank in seconds).
    if (ex.equipment === 'bodyweight' || ex.muscle === 'core') d = { reps: [ex.repMin, ex.repMax], rest: d.rest };
    if (a.age === '56p' && meta.role === 'compound') d = { reps: d.reps, rest: [d.rest[0] + 0.5, d.rest[1] + 0.5] };
    return d;
  };

  const toTemplate = (p: Pick): ExerciseTemplate => {
    const d = dose(p.ex, p.slot);
    const t = templateFrom(p.ex);
    return {
      ...t,
      sets: p.sets,
      repMin: d.reps[0],
      repMax: d.reps[1],
      restMinSec: Math.round(d.rest[0] * 60),
      restMaxSec: Math.round(d.rest[1] * 60),
    };
  };

  /** Minutes: each set is the work (~45 s) plus rest; plus a warm-up and the abs finisher. */
  const estimate = (picks: Pick[]) => {
    const work = picks.reduce((sum, p) => {
      const d = dose(p.ex, p.slot);
      return sum + p.sets * ((d.rest[0] + d.rest[1]) / 2 + 0.75);
    }, 0);
    return work + 7 + (a.abs === 'finisher' ? 10 : 0);
  };

  const buildDay = (bp: DayBlueprint, budget: number): Pick[] => {
    const slots = [...bp.slots];
    const lowerOrFull = bp.slots.some((sl) => ['squat', 'hinge', 'lunge', 'glute'].includes(sl.pattern));
    // The person asked for abs in the program, so it's never the one cut for time.
    if (a.abs === 'inProgram' && (lowerOrFull || bp.key === 'arms')) slots.push(s('core', 1));

    const taken = new Set<string>();
    let picks: Pick[] = [];
    for (const slot of slots) {
      const ex = pickFor(slot, taken);
      if (!ex) continue;
      taken.add(ex.id);
      const emph = emphasisOf(metaOf(ex.id).pattern).length > 0;
      const sets = baseSets(a, metaOf(ex.id).role, slot.pri);
      picks.push({ ex, slot, sets, emphasized: emph });
    }

    // More exercises than the time allows for focused work: drop the least important.
    const maxEx = budget >= 75 ? 7 : budget >= 60 ? 6 : budget >= 45 ? 5 : 4;
    for (const pri of [3, 2] as Pri[]) {
      while (picks.length > maxEx) {
        const i = dropIndex(picks, pri);
        if (i < 0) break;
        picks = picks.filter((_, k) => k !== i);
      }
    }

    // Too long. Like a coach: drop the extras, then trim secondary exercises to 2 sets, and only
    // then drop a secondary exercise; main lifts lose sets last.
    const over = () => estimate(picks) > budget;
    while (over() && picks.length > 3 && dropIndex(picks, 3) >= 0) picks.splice(dropIndex(picks, 3), 1);
    const trimAt = (pri: Pri) => {
      while (over()) {
        const victim = picks.filter((p) => p.slot.pri === pri && p.sets > 2).sort(trimFirst).at(-1);
        if (!victim) return;
        victim.sets -= 1;
      }
    };
    trimAt(3);
    trimAt(2);
    while (over() && picks.length > 3 && dropIndex(picks, 2) >= 0) picks.splice(dropIndex(picks, 2), 1);
    trimAt(1);

    // The emphasized area gets one more set per exercise: from spare time, or by taking a set from
    // a less important exercise of another area (never below 2 sets, never from a main lift).
    // A swap may run up to 3 minutes over, since a main-lift set rests longer than the one it replaces.
    const overForSwap = () => estimate(picks) > budget + 3;
    const emphasisSets = () => picks.filter((x) => x.emphasized).reduce((n, x) => n + x.sets, 0);
    const before = emphasisSets();
    for (const p of picks.filter((x) => x.emphasized)) {
      if (p.sets >= 5) continue;
      p.sets += 1;
      if (!over()) continue;
      const donor = picks.filter((x) => !x.emphasized && x.slot.pri > 1 && x.sets > 2).sort((x, y) => y.slot.pri - x.slot.pri)[0];
      if (donor) donor.sets -= 1;
      if (!donor || overForSwap()) {
        p.sets -= 1;
        if (donor) donor.sets += 1;
      }
    }

    // Emphasis extras only on sessions where that area is a main focus (a priority-1 slot).
    const emphasisFill = a.emphasis
      .filter((e) => bp.slots.some((sl) => sl.pri === 1 && emphasisPatterns[e].includes(sl.pattern)))
      .flatMap((e) => emphasisExtras[e]);

    // Still nothing gained on a focus day: swap a secondary exercise of a muscle that already has
    // another exercise in this session (e.g. the second back exercise on a chest day) for one in
    // the emphasized area. That muscle still gets its main work here and on its own day.
    if (emphasisSets() === before && emphasisFill.length) {
      for (let i = picks.length - 1; i >= 0; i--) {
        const p = picks[i];
        if (p.emphasized || p.slot.pri === 1 || p.ex.muscle === 'core') continue;
        if (!picks.some((q, k) => k !== i && q.ex.muscle === p.ex.muscle)) continue;
        const slot = s(emphasisFill[0], 2);
        const ex = choose(emphasisFill[0], slot, taken);
        if (!ex) break;
        picks[i] = { ex, slot, sets: p.sets, emphasized: true };
        if (overForSwap()) {
          picks[i] = p;
          break;
        }
        taken.delete(p.ex.id);
        taken.add(ex.id);
        break;
      }
    }

    const cap = a.goal === 'strength' && a.experience === 'gt2y' ? 5 : 4;
    for (const p of picks.filter((x) => x.slot.pri === 1 && metaOf(x.ex.id).role === 'compound')) {
      if (p.sets < cap && !isNew(a) && estimate(picks) + 4 <= budget) p.sets += 1;
    }
    for (const pattern of [...emphasisFill, ...bp.fillers]) {
      if (picks.length >= maxEx) break;
      const slot = s(pattern, 3);
      const ex = choose(pattern, slot, taken);
      if (!ex) continue;
      const emph = emphasisOf(metaOf(ex.id).pattern).length > 0;
      const trial: Pick = { ex, slot, sets: Math.min(5, baseSets(a, metaOf(ex.id).role, 3) + (emph ? 1 : 0)), emphasized: emph };
      if (estimate([...picks, trial]) > budget) continue;
      taken.add(ex.id);
      picks.push(trial);
    }

    for (const p of picks) usedAnywhere.set(p.ex.id, (usedAnywhere.get(p.ex.id) ?? 0) + 1);
    return picks;
  };

  // ---- weekly structure ----
  const fifthDay = (): string => {
    if (a.emphasis.some((e) => e === 'legs' || e === 'glutes')) return 'loC';
    if (a.emphasis.some((e) => e === 'chest' || e === 'back')) return 'upC';
    return gear.size > 0 ? 'arms' : 'upC';
  };
  const split: string[] =
    a.days === 2 ? ['fbA', 'fbB'] : a.days === 3 ? ['fbA', 'fbB', 'fbC'] : a.days === 4 ? ['upA', 'loA', 'upB', 'loB'] : ['upA', 'loA', 'upB', 'loB', fifthDay()];

  reasons.push(
    a.days <= 3
      ? `${a.days} ימים בשבוע: אימוני גוף מלא, כך שכל שריר עובד ${a.days} פעמים בשבוע.`
      : a.days === 4
        ? '4 ימים בשבוע: עליון ותחתון לסירוגין, כל שריר עובד פעמיים בשבוע.'
        : `5 ימים בשבוע: עליון ותחתון פעמיים, ועוד יום ${DAYS[split[4]].name}${a.emphasis.length ? ' לפי הדגש שבחרת' : ''}.`,
  );

  const sessions: SessionTemplate[] = [];
  for (const key of split) {
    const bp = DAYS[key];
    const picks = buildDay(bp, a.minutes);
    const exercises = ordered(picks).map(toTemplate);
    sessions.push({
      id: `gen-${key}`,
      name: bp.name,
      subtitle: bp.subtitle,
      durationMin: roundTo5(estimate(picks)),
      kind: 'strength',
      bonus: false,
      exercises,
    });
  }

  // ---- bonus session ----
  if (a.bonus && a.days >= 3) {
    const focus = a.emphasis[0];
    const patterns: Pattern[] =
      focus === 'chest'
        ? ['incline_push', 'chest_iso', 'side_delt']
        : focus === 'back'
          ? ['v_pull', 'h_pull', 'rear_delt']
          : focus === 'arms'
            ? ['biceps', 'triceps', 'side_delt']
            : focus === 'shoulders'
              ? ['v_push', 'side_delt', 'rear_delt']
              : focus === 'legs'
                ? ['lunge', 'ham_curl', 'calves']
                : focus === 'glutes'
                  ? ['glute', 'hinge', 'glute']
                  : ['chest_iso', 'h_pull', 'side_delt'];
    const bp: DayBlueprint = { key: 'bonus', name: 'בונוס', subtitle: 'קצר, אפשר לדלג בשבוע עמוס', slots: patterns.map((p) => s(p, 1)), fillers: [] };
    const picks = buildDay(bp, Math.min(40, a.minutes));
    sessions.push({
      id: 'gen-bonus',
      name: bp.name,
      subtitle: bp.subtitle,
      durationMin: roundTo5(estimate(picks)),
      kind: 'strength',
      bonus: true,
      exercises: ordered(picks).map(toTemplate),
    });
    reasons.push('אימון בונוס קצר בסוף הסבב. בשבוע עמוס מדלגים עליו ראשון.');
  }

  // ---- cardio in the rotation ----
  const cardio = (n: number): SessionTemplate => ({
    id: `gen-cardio-${n}`,
    name: 'אירובי קל',
    subtitle: 'ריצה, הליכה מהירה או אופניים',
    durationMin: 30,
    kind: 'cardio',
    bonus: false,
    exercises: [],
  });
  if (a.cardio === 2) {
    const mid = Math.ceil(split.length / 2);
    sessions.splice(mid, 0, cardio(1));
    sessions.push(cardio(2));
  } else if (a.cardio === 1) {
    sessions.push(cardio(1));
  }
  if (a.cardio > 0) reasons.push(`אירובי קל ${a.cardio === 1 ? 'פעם' : 'פעמיים'} בשבוע, בתוך הסבב.`);

  // ---- reasons ----
  const r = doses[a.goal];
  const goalText: Record<Goal, string> = {
    muscle: 'בניית שריר',
    strength: 'כוח',
    fatloss: 'ירידה בשומן ושמירה על השריר',
    general: 'כושר כללי',
  };
  reasons.push(
    `מטרה: ${goalText[a.goal]}. תרגילים מרכזיים ${r.main.reps[0]}–${r.main.reps[1]} חזרות, תרגילי בידוד ${r.iso.reps[0]}–${r.iso.reps[1]}.`,
  );
  if (a.goal === 'fatloss') reasons.push('לירידה בשומן: מנוחות קצרות יותר. התזונה היא שעושה את רוב העבודה.');
  if (isNew(a)) reasons.push('בתחילת הדרך: 2–3 סטים לתרגיל ותרגילים פשוטים טכנית. ההתקדמות תבוא מהר.');
  if (a.experience === 'gt2y') reasons.push('ניסיון של יותר משנתיים: 4 סטים בתרגילים המרכזיים.');
  if (a.age === '56p') reasons.push('גיל 56+: מנוחות ארוכות יותר בתרגילים המרכזיים ובחירה בתרגילים עדינים למפרקים.');
  else if (a.age === '41_55') reasons.push('גיל 41–55: עדיפות קלה למכונות ולתרגילים פחות טכניים.');

  const painText: Record<Joint, string> = { lowBack: 'גב תחתון', knees: 'ברכיים', shoulders: 'כתפיים', elbows: 'מרפקים' };
  if (a.limits.length) {
    const out = exerciseLibrary.filter((ex) => blockedByPain(ex) && hasGear(ex)).map((ex) => ex.name);
    reasons.push(
      `כאבים ב${a.limits.map((j) => painText[j]).join(' וב')}: ${out.length ? `בלי ${out.slice(0, 4).join(', ')}${out.length > 4 ? ' ועוד' : ''}.` : 'נבחרו תרגילים עדינים יותר.'} אם כואב, עוצרים ומתייעצים.`,
    );
  }
  if (a.avoid.length) {
    const names = a.avoid.flatMap((k) => avoidIds[k]).map((id) => exerciseLibrary.find((e) => e.id === id)?.name).filter(Boolean);
    reasons.push(`בלי ${names.join(', ')}, כמו שביקשת.`);
  }
  if (a.emphasis.length) {
    reasons.push(
      `דגש על ${a.emphasis.map((e) => emphasisLabel[e]).join(' ו')}: יותר סטים ותרגיל נוסף כשיש זמן, על חשבון תרגילים משניים של שרירים אחרים ולא על חשבון התרגילים המרכזיים.`,
    );
  }
  if (gear.size === 0) reasons.push('בלי ציוד: תרגילי משקל גוף. כשזה נהיה קל, מוסיפים משקל, למשל תיק גב.');
  if (a.week === 'veryBusy') reasons.push('שבוע עמוס מאוד: סט אחד פחות בתרגילי הבידוד, כדי שתתאושש.');
  // Already trimmed to the minimum and still over: say so instead of hiding it.
  const longest = Math.max(...sessions.filter((t) => t.kind === 'strength' && !t.bonus).map((t) => t.durationMin));
  if (longest > a.minutes + 5) {
    reasons.push(
      `גם אחרי קיצור למינימום, אימון אפקטיבי יוצא בערך ${longest} דקות, יותר מ-${a.minutes} שבחרת.${a.abs === 'finisher' ? ' אפשר לוותר על 10 דקות הבטן בסוף,' : ' אפשר'} לקצר את המנוחות או לבחור פחות זמן אחר כך בהגדרות.`,
    );
  }
  const counts = sessions.filter((t) => t.kind === 'strength' && !t.bonus).map((t) => t.exercises.length);
  reasons.push(`${a.minutes} דקות לאימון: ${Math.min(...counts) === Math.max(...counts) ? counts[0] : `${Math.min(...counts)}–${Math.max(...counts)}`} תרגילים בכל אימון.`);
  const calibrationDays = a.experience === 'none' || a.recent === 'no' ? 21 : 14;
  reasons.push(
    calibrationDays === 21
      ? 'שלושה שבועות ראשונים של כיול: לומדים את התרגילים ומוצאים משקלים, בלי ללכת לכשל.'
      : 'שבועיים ראשונים של כיול: מוצאים את המשקלים הנכונים, בלי ללכת לכשל.',
  );

  return {
    program: { sessions },
    settings: { programStart: isoDate(today), calibrationDays, absFinisher: a.abs === 'finisher' },
    reasons,
  };
}

/**
 * Session order: big lifts first, then isolation for big muscles (fly, leg curl), then small muscles,
 * abs last. Ties keep the blueprint's order.
 */
function ordered(picks: Pick[]): Pick[] {
  const bigIso: Pattern[] = ['chest_iso', 'back_iso', 'quad_iso', 'ham_curl', 'glute'];
  const rank = (p: Pick) => {
    const meta = metaOf(p.ex.id);
    if (meta.pattern === 'core') return 4;
    if (meta.role === 'compound') return 0;
    return bigIso.includes(meta.pattern) ? 1 : meta.role === 'iso' ? 2 : 3;
  };
  return picks.map((p, i) => ({ p, i })).sort((x, y) => rank(x.p) - rank(y.p) || x.i - y.i).map((x) => x.p);
}

const roundTo5 = (n: number) => Math.max(15, Math.round(n / 5) * 5);

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Sets per muscle group per week in a generated program (for tests and the summary). */
export function weeklySetsOf(program: Program): Record<MuscleGroup, number> {
  const out = { chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0, other: 0 } as Record<MuscleGroup, number>;
  for (const t of program.sessions) if (!t.bonus) for (const e of t.exercises) out[e.muscle] += e.sets;
  return out;
}
