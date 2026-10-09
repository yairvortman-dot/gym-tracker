import type { ExerciseTemplate, Program, Settings } from '../types';

const min = (m: number) => Math.round(m * 60);

function ex(
  id: string,
  name: string,
  sets: number,
  reps: [number, number],
  rest: [number, number],
  opts: Pick<ExerciseTemplate, 'equipment' | 'weightMode' | 'muscle'> & Partial<ExerciseTemplate>,
): ExerciseTemplate {
  return {
    id,
    name,
    sets,
    repMin: reps[0],
    repMax: reps[1],
    restMinSec: min(rest[0]),
    restMaxSec: min(rest[1]),
    unilateral: false,
    ...opts,
  };
}

export const defaultProgram: Program = {
  sessions: [
    {
      id: 'upper-a',
      name: 'עליון א׳',
      subtitle: 'דגש חזה',
      durationMin: 75,
      kind: 'strength',
      bonus: false,
      exercises: [
        ex('incline-db-press', 'לחיצת משקולות בשיפוע חיובי נמוך', 4, [6, 10], [2, 3], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'chest' }),
        ex('chest-press-machine-single', 'מכונת לחיצת חזה יד יד', 3, [8, 12], [2, 2], { equipment: 'machine', weightMode: 'total', muscle: 'chest', unilateral: true }),
        ex('cable-fly-low-high', 'פרפר בכבל בשתי ידיים, מלמטה למעלה', 3, [12, 15], [1.5, 1.5], { equipment: 'cable', weightMode: 'perSide', muscle: 'chest' }),
        ex('seated-db-shoulder-press', 'לחיצת כתפיים בישיבה במשקולות', 3, [8, 12], [2, 2], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'shoulders' }),
        ex('lateral-raise', 'הרמות צד', 3, [12, 20], [1, 1], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'shoulders' }),
        ex('overhead-cable-triceps', 'פשיטת מרפקים בכבל מעל הראש', 3, [10, 15], [1.5, 1.5], { equipment: 'cable', weightMode: 'total', muscle: 'arms' }),
      ],
    },
    {
      id: 'lower',
      name: 'תחתון',
      subtitle: 'יום רגליים',
      durationMin: 70,
      kind: 'strength',
      bonus: false,
      exercises: [
        ex('goblet-squat', 'סקוואט גביע', 4, [8, 10], [2, 2], { equipment: 'dumbbell', weightMode: 'total', muscle: 'legs' }),
        ex('bulgarian-split-squat', 'בולגרי ספליט סקוואט', 3, [8, 10], [2, 2], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'legs', unilateral: true }),
        ex('db-romanian-deadlift', 'הרמה רומנית במשקולות', 3, [8, 10], [2, 2], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'legs' }),
        ex('lying-leg-curl', 'כפיפת ברכיים בשכיבה במכונה', 3, [10, 12], [1.5, 1.5], { equipment: 'machine', weightMode: 'total', muscle: 'legs' }),
        ex('standing-calf-raise', 'הרמות עקבים בעמידה', 3, [10, 15], [1, 1], { equipment: 'machine', weightMode: 'total', muscle: 'legs' }),
      ],
    },
    {
      id: 'upper-b',
      name: 'עליון ב׳',
      subtitle: 'דגש גב',
      durationMin: 75,
      kind: 'strength',
      bonus: false,
      exercises: [
        ex('pull-up', 'מתח', 4, [6, 8], [2, 3], { equipment: 'bodyweight', weightMode: 'added', muscle: 'back', cue: 'חזרות נקיות. משקל = תוספת על משקל הגוף' }),
        ex('chest-supported-cable-row', 'חתירה בכבל בישיבה עם תמיכה בחזה', 4, [8, 12], [2, 2], { equipment: 'cable', weightMode: 'total', muscle: 'back' }),
        ex('close-grip-pulldown', 'משיכת כבל מלמעלה לחזה באחיזה צרה', 3, [10, 12], [1.5, 1.5], { equipment: 'cable', weightMode: 'total', muscle: 'back' }),
        ex('flat-db-press', 'לחיצת חזה שטוחה במשקולות', 3, [8, 12], [2, 2], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'chest' }),
        ex('face-pull', 'משיכת חבל אל הפנים לכתף האחורית', 3, [12, 15], [1, 1], { equipment: 'cable', weightMode: 'total', muscle: 'shoulders' }),
        ex('seated-db-curl', 'כפיפת מרפקים במשקולות בישיבה', 3, [8, 12], [1.5, 1.5], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'arms' }),
      ],
    },
    {
      id: 'upper-c',
      name: 'עליון ג׳',
      subtitle: 'בונוס, קצר',
      durationMin: 40,
      kind: 'strength',
      bonus: true,
      exercises: [
        ex('cable-fly-high-low', 'פרפר בכבל מלמעלה למטה', 3, [12, 15], [1, 1], { equipment: 'cable', weightMode: 'perSide', muscle: 'chest' }),
        ex('one-arm-db-row', 'חתירה ביד אחת במשקולת', 3, [10, 12], [1.5, 1.5], { equipment: 'dumbbell', weightMode: 'total', muscle: 'back', unilateral: true }),
        ex('lateral-raise', 'הרמות צד', 3, [12, 20], [1, 1], { equipment: 'dumbbell', weightMode: 'perHand', muscle: 'shoulders' }),
      ],
    },
    {
      id: 'easy-run',
      name: 'ריצה קלה',
      durationMin: 30,
      kind: 'cardio',
      bonus: false,
      exercises: [],
    },
  ],
};

export const defaultSettings: Settings = {
  kgStep: { dumbbell: 2, cable: 2.5, machine: 2.5, barbell: 2.5, bodyweight: 2.5 },
  programStart: '2026-10-09',
  sound: true,
};
