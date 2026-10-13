import type { Equipment, ExerciseTemplate, MuscleGroup, WeightMode } from '../types';

/** Finer label inside a muscle group. Used to pick relevant arm/shoulder work for a session. */
export type Focus =
  | 'biceps'
  | 'triceps'
  | 'front-delts'
  | 'side-delts'
  | 'rear-delts'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export type LibraryExercise = ExerciseTemplate & { focus?: Focus };

export const focusLabel: Record<Focus, string> = {
  biceps: 'יד קדמית',
  triceps: 'יד אחורית',
  'front-delts': 'כתף קדמית',
  'side-delts': 'כתף אמצעית',
  'rear-delts': 'כתף אחורית',
  quads: 'ארבע ראשי',
  hamstrings: 'ירך אחורית',
  glutes: 'ישבן',
  calves: 'תאומים',
};

const min = (m: number) => Math.round(m * 60);

function lib(
  id: string,
  name: string,
  muscle: MuscleGroup,
  equipment: Equipment,
  weightMode: WeightMode,
  reps: [number, number],
  rest: [number, number],
  extra: { focus?: Focus; unilateral?: boolean; sets?: number; cue?: string } = {},
): LibraryExercise {
  return {
    id,
    name,
    sets: extra.sets ?? 3,
    repMin: reps[0],
    repMax: reps[1],
    restMinSec: min(rest[0]),
    restMaxSec: min(rest[1]),
    unilateral: extra.unilateral ?? false,
    weightMode,
    equipment,
    muscle,
    focus: extra.focus,
    cue: extra.cue,
  };
}

/**
 * Exercises offered by "הוסף תרגיל". Ids that also appear in the default program are shared,
 * so picking one links to its existing history.
 */
export const exerciseLibrary: LibraryExercise[] = [
  // ---- חזה ----
  lib('bench-press', 'לחיצת חזה במוט', 'chest', 'barbell', 'total', [6, 10], [2, 3]),
  lib('incline-bench-press', 'לחיצת חזה בשיפוע חיובי במוט', 'chest', 'barbell', 'total', [6, 10], [2, 3]),
  lib('flat-db-press', 'לחיצת חזה שטוחה במשקולות', 'chest', 'dumbbell', 'perHand', [8, 12], [2, 2]),
  lib('incline-db-press', 'לחיצת משקולות בשיפוע חיובי נמוך', 'chest', 'dumbbell', 'perHand', [6, 10], [2, 3]),
  lib('chest-press-machine', 'מכונת לחיצת חזה', 'chest', 'machine', 'total', [8, 12], [2, 2]),
  lib('chest-press-machine-single', 'מכונת לחיצת חזה יד יד', 'chest', 'machine', 'total', [8, 12], [2, 2], { unilateral: true }),
  lib('smith-incline-press', 'לחיצה בשיפוע במכונת סמית׳', 'chest', 'machine', 'total', [8, 12], [2, 2]),
  lib('pec-deck', 'פרפר במכונה', 'chest', 'machine', 'total', [12, 15], [1, 1.5]),
  lib('cable-fly-low-high', 'פרפר בכבל בשתי ידיים, מלמטה למעלה', 'chest', 'cable', 'perSide', [12, 15], [1.5, 1.5]),
  lib('cable-fly-high-low', 'פרפר בכבל מלמעלה למטה', 'chest', 'cable', 'perSide', [12, 15], [1, 1]),
  lib('cable-fly-mid', 'פרפר בכבל בגובה החזה', 'chest', 'cable', 'perSide', [12, 15], [1, 1]),
  lib('db-fly', 'פרפר במשקולות על ספסל', 'chest', 'dumbbell', 'perHand', [10, 15], [1.5, 1.5]),
  lib('chest-dips', 'מקבילים, דגש חזה', 'chest', 'bodyweight', 'added', [6, 12], [2, 2], { cue: 'גוף נוטה קדימה. משקל = תוספת על משקל הגוף' }),
  lib('push-up', 'שכיבות סמיכה', 'chest', 'bodyweight', 'added', [8, 20], [1.5, 1.5], { cue: 'משקל = תוספת על משקל הגוף' }),
  lib('feet-elevated-push-up', 'שכיבות סמיכה עם רגליים על כיסא', 'chest', 'bodyweight', 'added', [6, 15], [1.5, 1.5], { cue: 'עובד על החזה העליון. משקל = תוספת על משקל הגוף' }),
  lib('db-floor-press', 'לחיצת משקולות מהרצפה', 'chest', 'dumbbell', 'perHand', [8, 12], [2, 2], { cue: 'בשכיבה על הרצפה, מרפקים נוגעים קלות ברצפה' }),

  // ---- גב ----
  lib('pull-up', 'מתח', 'back', 'bodyweight', 'added', [6, 8], [2, 3], { sets: 4, cue: 'חזרות נקיות. משקל = תוספת על משקל הגוף' }),
  lib('chin-up', 'מתח באחיזה הפוכה', 'back', 'bodyweight', 'added', [6, 10], [2, 3], { cue: 'משקל = תוספת על משקל הגוף' }),
  lib('wide-lat-pulldown', 'משיכת כבל מלמעלה באחיזה רחבה', 'back', 'cable', 'total', [8, 12], [2, 2]),
  lib('close-grip-pulldown', 'משיכת כבל מלמעלה לחזה באחיזה צרה', 'back', 'cable', 'total', [10, 12], [1.5, 1.5]),
  lib('single-arm-pulldown', 'משיכת כבל מלמעלה ביד אחת', 'back', 'cable', 'total', [10, 12], [1.5, 1.5], { unilateral: true }),
  lib('chest-supported-cable-row', 'חתירה בכבל בישיבה עם תמיכה בחזה', 'back', 'cable', 'total', [8, 12], [2, 2]),
  lib('seated-cable-row', 'חתירה בכבל בישיבה', 'back', 'cable', 'total', [8, 12], [2, 2]),
  lib('machine-row', 'מכונת חתירה', 'back', 'machine', 'total', [8, 12], [2, 2]),
  lib('barbell-row', 'חתירה במוט בהטיה', 'back', 'barbell', 'total', [6, 10], [2, 2]),
  lib('t-bar-row', 'חתירת T-בר', 'back', 'barbell', 'total', [8, 12], [2, 2]),
  lib('one-arm-db-row', 'חתירה ביד אחת במשקולת', 'back', 'dumbbell', 'total', [10, 12], [1.5, 1.5], { unilateral: true }),
  lib('chest-supported-db-row', 'חתירה במשקולות על ספסל משופע', 'back', 'dumbbell', 'perHand', [8, 12], [2, 2]),
  lib('straight-arm-pulldown', 'פולאובר בכבל בידיים ישרות', 'back', 'cable', 'total', [12, 15], [1, 1]),
  lib('bent-over-db-row', 'חתירה בהטיה במשקולות', 'back', 'dumbbell', 'perHand', [8, 12], [2, 2]),
  lib('inverted-row', 'חתירה הפוכה מתחת לשולחן יציב', 'back', 'bodyweight', 'added', [6, 15], [1.5, 1.5], { cue: 'גוף ישר, מושכים את החזה לשולחן' }),
  lib('back-extension', 'פשיטת גב במתקן', 'back', 'machine', 'total', [10, 15], [1.5, 1.5]),

  // ---- כתפיים ----
  lib('seated-db-shoulder-press', 'לחיצת כתפיים בישיבה במשקולות', 'shoulders', 'dumbbell', 'perHand', [8, 12], [2, 2], { focus: 'front-delts' }),
  lib('standing-barbell-press', 'לחיצת כתפיים בעמידה במוט', 'shoulders', 'barbell', 'total', [6, 10], [2, 3], { focus: 'front-delts' }),
  lib('machine-shoulder-press', 'מכונת לחיצת כתפיים', 'shoulders', 'machine', 'total', [8, 12], [2, 2], { focus: 'front-delts' }),
  lib('arnold-press', 'לחיצת ארנולד', 'shoulders', 'dumbbell', 'perHand', [8, 12], [2, 2], { focus: 'front-delts' }),
  lib('standing-db-press', 'לחיצת כתפיים בעמידה במשקולות', 'shoulders', 'dumbbell', 'perHand', [8, 12], [2, 2], { focus: 'front-delts' }),
  lib('pike-push-up', 'שכיבות סמיכה בפייק לכתפיים', 'shoulders', 'bodyweight', 'added', [6, 12], [1.5, 1.5], { focus: 'front-delts', cue: 'אגן גבוה, ראש יורד בין הידיים' }),
  lib('front-raise', 'הרמות קדמיות', 'shoulders', 'dumbbell', 'perHand', [10, 15], [1, 1], { focus: 'front-delts' }),
  lib('lateral-raise', 'הרמות צד', 'shoulders', 'dumbbell', 'perHand', [12, 20], [1, 1], { focus: 'side-delts' }),
  lib('cable-lateral-raise', 'הרמות צד בכבל ביד אחת', 'shoulders', 'cable', 'total', [12, 20], [1, 1], { focus: 'side-delts', unilateral: true }),
  lib('machine-lateral-raise', 'מכונת הרמות צד', 'shoulders', 'machine', 'total', [12, 20], [1, 1], { focus: 'side-delts' }),
  lib('face-pull', 'משיכת חבל אל הפנים לכתף האחורית', 'shoulders', 'cable', 'total', [12, 15], [1, 1], { focus: 'rear-delts' }),
  lib('reverse-pec-deck', 'פרפר הפוך במכונה', 'shoulders', 'machine', 'total', [12, 20], [1, 1], { focus: 'rear-delts' }),
  lib('rear-delt-db-fly', 'הרחקות לכתף אחורית בהטיה', 'shoulders', 'dumbbell', 'perHand', [12, 20], [1, 1], { focus: 'rear-delts' }),

  // ---- ידיים ----
  lib('seated-db-curl', 'כפיפת מרפקים במשקולות בישיבה', 'arms', 'dumbbell', 'perHand', [8, 12], [1.5, 1.5], { focus: 'biceps' }),
  lib('barbell-curl', 'כפיפת מרפקים במוט', 'arms', 'barbell', 'total', [8, 12], [1.5, 1.5], { focus: 'biceps' }),
  lib('hammer-curl', 'כפיפת פטישים', 'arms', 'dumbbell', 'perHand', [8, 12], [1.5, 1.5], { focus: 'biceps' }),
  lib('incline-db-curl', 'כפיפת מרפקים על ספסל משופע', 'arms', 'dumbbell', 'perHand', [10, 12], [1.5, 1.5], { focus: 'biceps' }),
  lib('cable-curl', 'כפיפת מרפקים בכבל', 'arms', 'cable', 'total', [10, 15], [1, 1], { focus: 'biceps' }),
  lib('preacher-curl', 'כפיפת מרפקים בספסל סקוט', 'arms', 'machine', 'total', [8, 12], [1.5, 1.5], { focus: 'biceps' }),
  lib('overhead-cable-triceps', 'פשיטת מרפקים בכבל מעל הראש', 'arms', 'cable', 'total', [10, 15], [1.5, 1.5], { focus: 'triceps' }),
  lib('triceps-pushdown', 'פשיטת מרפקים בכבל בעמידה', 'arms', 'cable', 'total', [10, 15], [1, 1], { focus: 'triceps' }),
  lib('rope-pushdown', 'פשיטת מרפקים בכבל עם חבל', 'arms', 'cable', 'total', [10, 15], [1, 1], { focus: 'triceps' }),
  lib('db-overhead-extension', 'פשיטת מרפקים מעל הראש במשקולת', 'arms', 'dumbbell', 'total', [10, 15], [1.5, 1.5], { focus: 'triceps' }),
  lib('skull-crusher', 'פשיטת מרפקים בשכיבה במוט', 'arms', 'barbell', 'total', [8, 12], [1.5, 1.5], { focus: 'triceps' }),
  lib('close-grip-bench', 'לחיצת חזה באחיזה צרה', 'arms', 'barbell', 'total', [6, 10], [2, 2], { focus: 'triceps' }),
  lib('triceps-dips', 'מקבילים, דגש יד אחורית', 'arms', 'bodyweight', 'added', [6, 12], [2, 2], { focus: 'triceps', cue: 'גוף זקוף. משקל = תוספת על משקל הגוף' }),
  lib('close-push-up', 'שכיבות סמיכה צרות', 'arms', 'bodyweight', 'added', [6, 15], [1.5, 1.5], { focus: 'triceps', cue: 'ידיים צמודות, מרפקים צמודים לגוף' }),
  lib('chair-dips', 'מקבילים על כיסא', 'arms', 'bodyweight', 'added', [8, 15], [1.5, 1.5], { focus: 'triceps', cue: 'ידיים על קצה כיסא יציב מאחורי הגב' }),

  // ---- רגליים ----
  lib('back-squat', 'סקוואט במוט', 'legs', 'barbell', 'total', [5, 8], [2, 3], { focus: 'quads' }),
  lib('goblet-squat', 'סקוואט גביע', 'legs', 'dumbbell', 'total', [8, 10], [2, 2], { sets: 4, focus: 'quads' }),
  lib('leg-press', 'לחיצת רגליים', 'legs', 'machine', 'total', [8, 12], [2, 2], { focus: 'quads' }),
  lib('hack-squat', 'מכונת האק סקוואט', 'legs', 'machine', 'total', [8, 12], [2, 2], { focus: 'quads' }),
  lib('bulgarian-split-squat', 'בולגרי ספליט סקוואט', 'legs', 'dumbbell', 'perHand', [8, 10], [2, 2], { focus: 'quads', unilateral: true }),
  lib('walking-lunge', 'מכרעים בהליכה', 'legs', 'dumbbell', 'perHand', [8, 12], [1.5, 1.5], { focus: 'quads', unilateral: true }),
  lib('step-up', 'עלייה על ספסל במשקולות', 'legs', 'dumbbell', 'perHand', [8, 12], [1.5, 1.5], { focus: 'quads', unilateral: true }),
  lib('leg-extension', 'פשיטת ברכיים במכונה', 'legs', 'machine', 'total', [10, 15], [1, 1], { focus: 'quads' }),
  lib('db-romanian-deadlift', 'הרמה רומנית במשקולות', 'legs', 'dumbbell', 'perHand', [8, 10], [2, 2], { focus: 'hamstrings' }),
  lib('barbell-romanian-deadlift', 'הרמה רומנית במוט', 'legs', 'barbell', 'total', [6, 10], [2, 2], { focus: 'hamstrings' }),
  lib('deadlift', 'דדליפט', 'legs', 'barbell', 'total', [3, 6], [3, 3], { focus: 'hamstrings' }),
  lib('lying-leg-curl', 'כפיפת ברכיים בשכיבה במכונה', 'legs', 'machine', 'total', [10, 12], [1.5, 1.5], { focus: 'hamstrings' }),
  lib('seated-leg-curl', 'כפיפת ברכיים בישיבה במכונה', 'legs', 'machine', 'total', [10, 12], [1.5, 1.5], { focus: 'hamstrings' }),
  lib('hip-thrust', 'היפ תראסט במוט', 'legs', 'barbell', 'total', [8, 12], [2, 2], { focus: 'glutes' }),
  lib('hip-abduction', 'מכונת הרחקת ירכיים', 'legs', 'machine', 'total', [12, 20], [1, 1], { focus: 'glutes' }),
  lib('standing-calf-raise', 'הרמות עקבים בעמידה', 'legs', 'machine', 'total', [10, 15], [1, 1], { focus: 'calves' }),
  lib('seated-calf-raise', 'הרמות עקבים בישיבה', 'legs', 'machine', 'total', [12, 20], [1, 1], { focus: 'calves' }),
  lib('bodyweight-squat', 'סקוואט במשקל גוף', 'legs', 'bodyweight', 'added', [12, 20], [1.5, 1.5], { focus: 'quads', cue: 'משקל = תוספת, למשל תיק גב' }),
  lib('reverse-lunge', 'מכרע לאחור', 'legs', 'bodyweight', 'added', [8, 12], [1.5, 1.5], { focus: 'quads', unilateral: true, cue: 'משקל = תוספת, למשל תיק גב' }),
  lib('single-leg-rdl', 'הרמה רומנית ברגל אחת', 'legs', 'bodyweight', 'added', [8, 12], [1.5, 1.5], { focus: 'hamstrings', unilateral: true }),
  lib('glute-bridge', 'גשר ישבן', 'legs', 'bodyweight', 'added', [10, 20], [1.5, 1.5], { focus: 'glutes', cue: 'אפשר להניח משקולת על האגן. משקל = תוספת' }),
  lib('db-calf-raise', 'הרמות עקבים עם משקולות', 'legs', 'dumbbell', 'perHand', [12, 20], [1, 1], { focus: 'calves' }),
  lib('single-leg-calf-raise', 'הרמות עקבים ברגל אחת', 'legs', 'bodyweight', 'added', [10, 20], [1, 1], { focus: 'calves', unilateral: true }),

  // ---- בטן ----
  lib('hanging-knee-raise', 'הרמות ברכיים בתלייה', 'core', 'bodyweight', 'added', [10, 15], [1, 1]),
  lib('cable-crunch', 'כפיפות בטן בכבל', 'core', 'cable', 'total', [10, 15], [1, 1]),
  lib('decline-crunch', 'כפיפות בטן על ספסל שלילי', 'core', 'bodyweight', 'added', [10, 15], [1, 1]),
  lib('ab-wheel', 'גלגלת בטן', 'core', 'bodyweight', 'added', [8, 12], [1, 1]),
  lib('pallof-press', 'פאלוף פרס בכבל', 'core', 'cable', 'total', [10, 12], [1, 1], { unilateral: true }),
  lib('plank', 'פלאנק', 'core', 'bodyweight', 'added', [30, 60], [1, 1], { cue: 'החזרות הן שניות' }),
  lib('dead-bug', 'דד באג', 'core', 'bodyweight', 'added', [8, 12], [1, 1], { unilateral: true, cue: 'גב תחתון צמוד לרצפה לאורך כל התרגיל' }),
];
