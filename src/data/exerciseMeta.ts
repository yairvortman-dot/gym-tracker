/**
 * What the program builder needs to know about each library exercise.
 * Kept apart from the library so the library stays readable as a list of exercises.
 */

/** The job an exercise does in a session. Each session is built from slots of these. */
export type Pattern =
  | 'h_push' // horizontal press: bench, push-up
  | 'incline_push'
  | 'v_push' // overhead press
  | 'chest_iso' // fly
  | 'v_pull' // pull-up, pulldown
  | 'h_pull' // row
  | 'back_iso'
  | 'side_delt'
  | 'front_delt'
  | 'rear_delt'
  | 'biceps'
  | 'triceps'
  | 'squat' // knee-dominant, both legs
  | 'lunge' // knee-dominant, one leg
  | 'hinge' // hip hinge: RDL, deadlift
  | 'ham_curl'
  | 'glute'
  | 'quad_iso'
  | 'calves'
  | 'core';

/** Equipment the person ticks in the questionnaire. An exercise needs all of its tags. */
export type Gear = 'db' | 'bb' | 'cable' | 'machine' | 'bar' | 'bench';

/** compound = big multi-joint lift; iso = single joint; isoHigh = small muscles that like high reps. */
export type Role = 'compound' | 'iso' | 'isoHigh';

export type Joint = 'lowBack' | 'knees' | 'shoulders' | 'elbows';

export interface ExerciseMeta {
  pattern: Pattern;
  needs: Gear[];
  role: Role;
  /** 1 = easy to learn, 3 = needs good technique. */
  tech: 1 | 2 | 3;
  /** Load on a joint: 2 = left out for someone with pain there, 1 = used only if nothing gentler fits. */
  stress?: Partial<Record<Joint, 1 | 2>>;
  /** Hard to load heavily (held dumbbell, bodyweight), so a poor main lift for strength. */
  light?: boolean;
}

const m = (pattern: Pattern, needs: Gear[], role: Role, tech: 1 | 2 | 3, stress?: ExerciseMeta['stress']): ExerciseMeta => ({
  pattern,
  needs,
  role,
  tech,
  stress,
  // Bodyweight-only exercises can't be loaded heavily.
  light: needs.length === 0 || undefined,
});

const light = (x: ExerciseMeta): ExerciseMeta => ({ ...x, light: true });

export const exerciseMeta: Record<string, ExerciseMeta> = {
  // חזה
  'bench-press': m('h_push', ['bb', 'bench'], 'compound', 2, { shoulders: 1 }),
  'incline-bench-press': m('incline_push', ['bb', 'bench'], 'compound', 2, { shoulders: 1 }),
  'flat-db-press': m('h_push', ['db', 'bench'], 'compound', 1),
  'incline-db-press': m('incline_push', ['db', 'bench'], 'compound', 1),
  'chest-press-machine': m('h_push', ['machine'], 'compound', 1),
  'chest-press-machine-single': m('h_push', ['machine'], 'compound', 1),
  'smith-incline-press': m('incline_push', ['machine'], 'compound', 1),
  'pec-deck': m('chest_iso', ['machine'], 'iso', 1),
  'cable-fly-low-high': m('chest_iso', ['cable'], 'iso', 1),
  'cable-fly-high-low': m('chest_iso', ['cable'], 'iso', 1),
  'cable-fly-mid': m('chest_iso', ['cable'], 'iso', 1),
  'db-fly': m('chest_iso', ['db', 'bench'], 'iso', 1, { shoulders: 1 }),
  'chest-dips': m('h_push', ['bar'], 'compound', 2, { shoulders: 2, elbows: 1 }),
  'push-up': m('h_push', [], 'compound', 1, { elbows: 1 }),
  'feet-elevated-push-up': m('incline_push', [], 'compound', 1, { shoulders: 1, elbows: 1 }),
  'db-floor-press': light(m('h_push', ['db'], 'compound', 1)),

  // גב
  'pull-up': m('v_pull', ['bar'], 'compound', 2, { shoulders: 1, elbows: 1 }),
  'chin-up': m('v_pull', ['bar'], 'compound', 2, { elbows: 1 }),
  'wide-lat-pulldown': m('v_pull', ['cable'], 'compound', 1),
  'close-grip-pulldown': m('v_pull', ['cable'], 'compound', 1),
  'single-arm-pulldown': m('v_pull', ['cable'], 'compound', 1),
  'chest-supported-cable-row': m('h_pull', ['cable'], 'compound', 1),
  'seated-cable-row': m('h_pull', ['cable'], 'compound', 1, { lowBack: 1 }),
  'machine-row': m('h_pull', ['machine'], 'compound', 1),
  'barbell-row': m('h_pull', ['bb'], 'compound', 3, { lowBack: 2 }),
  't-bar-row': m('h_pull', ['bb'], 'compound', 2, { lowBack: 2 }),
  'one-arm-db-row': m('h_pull', ['db', 'bench'], 'compound', 1),
  'chest-supported-db-row': m('h_pull', ['db', 'bench'], 'compound', 1),
  'straight-arm-pulldown': m('back_iso', ['cable'], 'iso', 1),
  'bent-over-db-row': light(m('h_pull', ['db'], 'compound', 2, { lowBack: 1 })),
  'inverted-row': m('h_pull', [], 'compound', 1),
  'back-extension': m('back_iso', ['machine'], 'iso', 1, { lowBack: 1 }),

  // כתפיים
  'seated-db-shoulder-press': m('v_push', ['db', 'bench'], 'compound', 1, { shoulders: 1 }),
  'standing-barbell-press': m('v_push', ['bb'], 'compound', 3, { lowBack: 1, shoulders: 2 }),
  'machine-shoulder-press': m('v_push', ['machine'], 'compound', 1, { shoulders: 1 }),
  'arnold-press': m('v_push', ['db', 'bench'], 'compound', 2, { shoulders: 2 }),
  'standing-db-press': light(m('v_push', ['db'], 'compound', 1, { lowBack: 1, shoulders: 1 })),
  'pike-push-up': m('v_push', [], 'compound', 2, { shoulders: 2 }),
  'front-raise': m('front_delt', ['db'], 'iso', 1, { shoulders: 1 }),
  'lateral-raise': m('side_delt', ['db'], 'isoHigh', 1),
  'cable-lateral-raise': m('side_delt', ['cable'], 'isoHigh', 1),
  'machine-lateral-raise': m('side_delt', ['machine'], 'isoHigh', 1),
  'face-pull': m('rear_delt', ['cable'], 'isoHigh', 1),
  'reverse-pec-deck': m('rear_delt', ['machine'], 'isoHigh', 1),
  'rear-delt-db-fly': m('rear_delt', ['db'], 'isoHigh', 1, { lowBack: 1 }),

  // ידיים
  'seated-db-curl': m('biceps', ['db', 'bench'], 'iso', 1),
  'barbell-curl': m('biceps', ['bb'], 'iso', 1, { elbows: 1 }),
  'hammer-curl': m('biceps', ['db'], 'iso', 1),
  'incline-db-curl': m('biceps', ['db', 'bench'], 'iso', 1, { shoulders: 1 }),
  'cable-curl': m('biceps', ['cable'], 'iso', 1),
  'preacher-curl': m('biceps', ['machine'], 'iso', 1, { elbows: 1 }),
  'overhead-cable-triceps': m('triceps', ['cable'], 'iso', 1, { elbows: 1, shoulders: 1 }),
  'triceps-pushdown': m('triceps', ['cable'], 'iso', 1),
  'rope-pushdown': m('triceps', ['cable'], 'iso', 1),
  'db-overhead-extension': m('triceps', ['db'], 'iso', 1, { elbows: 1, shoulders: 1 }),
  'skull-crusher': m('triceps', ['bb', 'bench'], 'iso', 2, { elbows: 2 }),
  'close-grip-bench': m('triceps', ['bb', 'bench'], 'compound', 2, { elbows: 1 }),
  'triceps-dips': m('triceps', ['bar'], 'compound', 2, { shoulders: 2, elbows: 1 }),
  'close-push-up': m('triceps', [], 'compound', 1, { elbows: 1 }),
  'chair-dips': m('triceps', [], 'compound', 1, { shoulders: 2, elbows: 1 }),

  // רגליים
  'back-squat': m('squat', ['bb'], 'compound', 3, { lowBack: 2, knees: 1 }),
  'goblet-squat': light(m('squat', ['db'], 'compound', 1, { knees: 1 })),
  'leg-press': m('squat', ['machine'], 'compound', 1, { lowBack: 1, knees: 1 }),
  'hack-squat': m('squat', ['machine'], 'compound', 2, { knees: 2 }),
  'bodyweight-squat': m('squat', [], 'compound', 1, { knees: 1 }),
  'bulgarian-split-squat': m('lunge', ['db', 'bench'], 'compound', 2, { knees: 1 }),
  'walking-lunge': light(m('lunge', ['db'], 'compound', 2, { knees: 2 })),
  'step-up': light(m('lunge', ['db', 'bench'], 'compound', 1, { knees: 1 })),
  'reverse-lunge': m('lunge', [], 'compound', 1, { knees: 1 }),
  'leg-extension': m('quad_iso', ['machine'], 'iso', 1, { knees: 1 }),
  'db-romanian-deadlift': light(m('hinge', ['db'], 'compound', 2, { lowBack: 1 })),
  'barbell-romanian-deadlift': m('hinge', ['bb'], 'compound', 2, { lowBack: 2 }),
  deadlift: m('hinge', ['bb'], 'compound', 3, { lowBack: 2 }),
  'single-leg-rdl': m('hinge', [], 'compound', 2, { lowBack: 1 }),
  'lying-leg-curl': m('ham_curl', ['machine'], 'iso', 1),
  'seated-leg-curl': m('ham_curl', ['machine'], 'iso', 1),
  'hip-thrust': m('glute', ['bb', 'bench'], 'compound', 2),
  'glute-bridge': m('glute', [], 'compound', 1),
  'hip-abduction': m('glute', ['machine'], 'isoHigh', 1),
  'standing-calf-raise': m('calves', ['machine'], 'isoHigh', 1),
  'seated-calf-raise': m('calves', ['machine'], 'isoHigh', 1),
  'db-calf-raise': m('calves', ['db'], 'isoHigh', 1),
  'single-leg-calf-raise': m('calves', [], 'isoHigh', 1),

  // בטן
  'hanging-knee-raise': m('core', ['bar'], 'isoHigh', 1, { shoulders: 1 }),
  'cable-crunch': m('core', ['cable'], 'isoHigh', 1),
  'decline-crunch': m('core', ['bench'], 'isoHigh', 1, { lowBack: 1 }),
  'ab-wheel': m('core', [], 'isoHigh', 2, { lowBack: 2, shoulders: 1 }),
  'pallof-press': m('core', ['cable'], 'isoHigh', 1),
  plank: m('core', [], 'isoHigh', 1),
  'dead-bug': m('core', [], 'isoHigh', 1),
};
