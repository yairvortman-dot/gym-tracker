import { describe, expect, it } from 'vitest';
import { answered, questions, toAnswers, toDraft, visibleQuestions, type Draft } from '../src/data/questions';
import { generateProgram } from '../src/logic/generator';

const ids = (d: Draft) => visibleQuestions(d).map((q) => q.id);

describe('questionnaire', () => {
  it('has 15 questions at most, each with a title and options', () => {
    expect(questions).toHaveLength(15);
    for (const q of questions) {
      expect(q.title.length).toBeGreaterThan(3);
      expect(q.options({ gear: ['all'] }).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('a beginner at home with dumbbells sees only the questions that matter', () => {
    const d: Draft = { experience: 'none', gear: ['db'], days: '2' };
    const shown = ids(d);
    expect(shown).not.toContain('recent'); // never trained
    expect(shown).not.toContain('style'); // no machines to prefer
    expect(shown).not.toContain('avoid'); // no barbell or pull-up bar
    expect(shown).not.toContain('bonus'); // only 2 days
    expect(shown).toHaveLength(11);
  });

  it('an experienced lifter with a full gym sees all 15', () => {
    expect(ids({ experience: 'gt2y', gear: ['all'], days: '4' })).toHaveLength(15);
  });

  it('multi-select needs at least one choice; exclusive choices stand alone', () => {
    const gear = questions.find((q) => q.id === 'gear')!;
    expect(answered(gear, {})).toBe(false);
    expect(answered(gear, { gear: ['none'] })).toBe(true);
  });

  it('turns a draft into answers the builder understands', () => {
    const a = toAnswers({
      goal: 'strength',
      experience: 'gt2y',
      recent: 'regular',
      age: '26_40',
      days: '4',
      minutes: '60',
      gear: ['all'],
      style: 'free',
      emphasis: ['balanced'],
      limits: ['none'],
      avoid: ['squat'],
      cardio: '1',
      abs: 'finisher',
      week: 'calm',
      bonus: 'yes',
    });
    expect(a).toMatchObject({ days: 4, minutes: 60, emphasis: [], limits: [], avoid: ['squat'], cardio: 1, bonus: true });
    expect(a.gear).toHaveLength(6);
    expect(generateProgram(a).program.sessions.length).toBeGreaterThan(4);
  });

  it('saved answers come back as the same draft choices', () => {
    const a = toAnswers({ goal: 'muscle', experience: 'none', age: 'u25', days: '3', minutes: '45', gear: ['none'], emphasis: ['glutes'], limits: ['knees'], cardio: '0', abs: 'none', week: 'busy', bonus: 'no' });
    expect(toAnswers(toDraft(a))).toEqual(a);
  });
});
