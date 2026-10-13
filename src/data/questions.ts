import type { Answers } from '../logic/generator';
import type { Gear } from './exerciseMeta';

/**
 * The questionnaire as data. Multi-select answers are kept as string lists while answering
 * (they may hold special tokens like "all" or "none") and turned into `Answers` at the end.
 */
export type Draft = Record<string, string | string[] | undefined>;

export interface QOption {
  value: string;
  label: string;
  hint?: string;
  /** Selecting it clears the others (and the other way round), e.g. "אין". */
  exclusive?: boolean;
}

export interface Question {
  id: string;
  title: string;
  hint?: string;
  multi?: boolean;
  max?: number;
  options: (d: Draft) => QOption[];
  visible?: (d: Draft) => boolean;
}

const list = (d: Draft, id: string): string[] => {
  const v = d[id];
  return Array.isArray(v) ? v : [];
};

export const ALL_GEAR: Gear[] = ['db', 'bb', 'cable', 'machine', 'bar', 'bench'];

/** The equipment ticked, with "חדר כושר מלא" expanded. */
export function gearOf(d: Draft): Gear[] {
  const g = list(d, 'gear');
  if (g.includes('all')) return ALL_GEAR;
  return g.filter((x): x is Gear => (ALL_GEAR as string[]).includes(x));
}

export const questions: Question[] = [
  {
    id: 'goal',
    title: 'מה המטרה העיקרית שלך?',
    options: () => [
      { value: 'muscle', label: 'לבנות שריר' },
      { value: 'strength', label: 'להתחזק', hint: 'להרים יותר משקל' },
      { value: 'fatloss', label: 'לרדת בשומן ולשמור על השריר' },
      { value: 'general', label: 'כושר כללי ובריאות' },
    ],
  },
  {
    id: 'experience',
    title: 'כמה ניסיון יש לך באימוני כוח?',
    options: () => [
      { value: 'none', label: 'אין לי ניסיון' },
      { value: 'lt6m', label: 'עד חצי שנה' },
      { value: '6m2y', label: 'חצי שנה עד שנתיים' },
      { value: 'gt2y', label: 'יותר משנתיים' },
    ],
  },
  {
    id: 'recent',
    title: 'התאמנת בחודשיים האחרונים?',
    visible: (d) => d.experience !== 'none',
    options: () => [
      { value: 'regular', label: 'כן, באופן קבוע' },
      { value: 'onoff', label: 'לסירוגין' },
      { value: 'no', label: 'לא' },
    ],
  },
  {
    id: 'age',
    title: 'מה הגיל שלך?',
    options: () => [
      { value: 'u25', label: 'עד 25' },
      // Isolate marks keep the ranges left-to-right inside the RTL buttons.
      { value: '26_40', label: '⁦26–40⁩' },
      { value: '41_55', label: '⁦41–55⁩' },
      { value: '56p', label: '56 ומעלה' },
    ],
  },
  {
    id: 'days',
    title: 'כמה ימי כוח בשבוע אתה יכול להתאמן?',
    hint: 'עדיף מספר שתעמוד בו גם בשבוע עמוס.',
    options: () => [
      { value: '2', label: '2 ימים' },
      { value: '3', label: '3 ימים' },
      { value: '4', label: '4 ימים' },
      { value: '5', label: '5 ימים' },
      { value: '6', label: '6 ימים' },
    ],
  },
  {
    id: 'minutes',
    title: 'כמה זמן יש לך לכל אימון?',
    hint: 'כולל חימום.',
    options: () => [
      { value: '30', label: '30 דקות' },
      { value: '45', label: '45 דקות' },
      { value: '60', label: 'שעה' },
      { value: '75', label: '75 דקות ומעלה' },
    ],
  },
  {
    id: 'gear',
    title: 'איזה ציוד יש לך?',
    hint: 'אפשר לבחור כמה.',
    multi: true,
    options: () => [
      { value: 'all', label: 'חדר כושר מלא', hint: 'הכל מהרשימה', exclusive: true },
      { value: 'db', label: 'משקולות יד' },
      { value: 'bb', label: 'מוט ומתקן סקוואט' },
      { value: 'cable', label: 'כבלים' },
      { value: 'machine', label: 'מכונות' },
      { value: 'bar', label: 'מוט מתח' },
      { value: 'bench', label: 'ספסל' },
      { value: 'none', label: 'אין לי ציוד', hint: 'אימון במשקל גוף', exclusive: true },
    ],
  },
  {
    id: 'style',
    title: 'מה אתה מעדיף?',
    // Until gear is answered, count it as coming, so the question total only ever goes down.
    visible: (d) => {
      if (d.gear === undefined) return true;
      const g = gearOf(d);
      return (g.includes('machine') || g.includes('cable')) && (g.includes('db') || g.includes('bb'));
    },
    options: () => [
      { value: 'machines', label: 'מכונות וכבלים', hint: 'פשוט ובטוח' },
      { value: 'free', label: 'משקולות חופשיות' },
      { value: 'mix', label: 'שילוב' },
    ],
  },
  {
    id: 'emphasis',
    title: 'על מה לשים דגש?',
    hint: 'עד שניים.',
    multi: true,
    max: 2,
    options: () => [
      { value: 'balanced', label: 'מאוזן, בלי דגש', exclusive: true },
      { value: 'chest', label: 'חזה' },
      { value: 'back', label: 'גב' },
      { value: 'shoulders', label: 'כתפיים' },
      { value: 'arms', label: 'ידיים' },
      { value: 'legs', label: 'רגליים' },
      { value: 'glutes', label: 'ישבן' },
    ],
  },
  {
    id: 'limits',
    title: 'יש כאבים או מגבלות?',
    hint: 'אפשר לבחור כמה. נוציא תרגילים שמעמיסים על המקום.',
    multi: true,
    options: () => [
      { value: 'none', label: 'אין', exclusive: true },
      { value: 'lowBack', label: 'גב תחתון' },
      { value: 'knees', label: 'ברכיים' },
      { value: 'shoulders', label: 'כתפיים' },
      { value: 'elbows', label: 'מרפקים או פרקי ידיים' },
    ],
  },
  {
    id: 'avoid',
    title: 'יש תרגילים שאתה לא רוצה לעשות?',
    multi: true,
    visible: (d) => d.gear === undefined || avoidOptions(d).length > 1,
    options: (d) => avoidOptions(d),
  },
  {
    id: 'cardio',
    title: 'להוסיף אירובי קל לשבוע?',
    hint: 'ריצה, הליכה מהירה או אופניים. נכנס לסבב האימונים.',
    options: () => [
      { value: '0', label: 'בלי' },
      { value: '1', label: 'פעם בשבוע' },
      { value: '2', label: 'פעמיים בשבוע' },
    ],
  },
  {
    id: 'abs',
    title: 'מה לגבי בטן?',
    options: () => [
      { value: 'finisher', label: '10 דקות בטן אחרי כל אימון', hint: 'לפי שגרה משלך, עם סימון בסוף האימון' },
      { value: 'inProgram', label: 'תרגיל בטן בתוך התוכנית' },
      { value: 'none', label: 'בלי' },
    ],
  },
  {
    id: 'week',
    title: 'איך נראה שבוע רגיל שלך?',
    hint: 'שינה ולחץ משפיעים על ההתאוששות.',
    options: () => [
      { value: 'calm', label: 'רגוע, ואני ישן טוב' },
      { value: 'busy', label: 'עמוס, אבל מסתדר' },
      { value: 'veryBusy', label: 'עמוס מאוד, ואני ישן מעט' },
    ],
  },
  {
    id: 'bonus',
    title: 'להוסיף אימון בונוס קצר?',
    hint: 'אימון קצר שאפשר לדלג עליו בשבוע עמוס.',
    visible: (d) => d.days === undefined || Number(d.days) >= 3,
    options: () => [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' },
    ],
  },
];

function avoidOptions(d: Draft): QOption[] {
  const g = gearOf(d);
  const opts: QOption[] = [{ value: 'none', label: 'אין, הכל בסדר', exclusive: true }];
  if (g.includes('bb')) opts.push({ value: 'squat', label: 'סקוואט במוט' }, { value: 'deadlift', label: 'דדליפט' });
  if (g.includes('bar')) opts.push({ value: 'pullup', label: 'מתח' }, { value: 'dips', label: 'מקבילים' });
  return opts;
}

export const visibleQuestions = (d: Draft) => questions.filter((q) => !q.visible || q.visible(d));

/** Whether a question has an answer that lets the person continue. */
export function answered(q: Question, d: Draft): boolean {
  const v = d[q.id];
  return q.multi ? Array.isArray(v) && v.length > 0 : typeof v === 'string';
}

export function toAnswers(d: Draft): Answers {
  const pick = (id: string, fallback: string) => (typeof d[id] === 'string' ? (d[id] as string) : fallback);
  const multi = (id: string) => list(d, id).filter((v) => v !== 'none' && v !== 'balanced' && v !== 'all');
  const experience = pick('experience', '6m2y') as Answers['experience'];
  const gear = gearOf(d);
  const days = Number(pick('days', '3')) as Answers['days'];
  return {
    goal: pick('goal', 'muscle') as Answers['goal'],
    experience,
    recent: experience === 'none' ? undefined : (pick('recent', 'regular') as Answers['recent']),
    age: pick('age', '26_40') as Answers['age'],
    days,
    minutes: Number(pick('minutes', '60')) as Answers['minutes'],
    gear,
    style: (typeof d.style === 'string' ? d.style : 'mix') as Answers['style'],
    emphasis: multi('emphasis') as Answers['emphasis'],
    limits: multi('limits') as Answers['limits'],
    avoid: multi('avoid') as Answers['avoid'],
    cardio: Number(pick('cardio', '0')) as Answers['cardio'],
    abs: pick('abs', 'finisher') as Answers['abs'],
    week: pick('week', 'calm') as Answers['week'],
    bonus: days >= 3 ? pick('bonus', 'no') === 'yes' : undefined,
  };
}

/** Back from saved answers to a draft, so "build a new program" starts from the last answers. */
export function toDraft(a: Answers): Draft {
  return {
    goal: a.goal,
    experience: a.experience,
    recent: a.recent,
    age: a.age,
    days: String(a.days),
    minutes: String(a.minutes),
    gear: a.gear.length === 0 ? ['none'] : a.gear.length === ALL_GEAR.length ? ['all'] : [...a.gear],
    style: a.style,
    emphasis: a.emphasis.length ? [...a.emphasis] : ['balanced'],
    limits: a.limits.length ? [...a.limits] : ['none'],
    avoid: a.avoid.length ? [...a.avoid] : ['none'],
    cardio: String(a.cardio),
    abs: a.abs,
    week: a.week,
    bonus: a.bonus == null ? undefined : a.bonus ? 'yes' : 'no',
  };
}
