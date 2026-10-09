import { useState } from 'react';
import type { Equipment, ExerciseTemplate, MuscleGroup, SessionKind, SessionTemplate, WeightMode } from '../types';
import { saveProgram, useProgram, useSessions } from '../db';
import { Icon, Num, Segmented, Stepper, Toggle } from '../components/ui';
import { newId } from '../logic/session';
import { muscleLabel } from '../logic/weekly';
import { fmtRest, weightModeLabel } from '../lib/format';
import { go } from '../lib/router';
import { equipmentLabel } from './Settings';

export function ProgramEditor({ tplId }: { tplId: string }) {
  const program = useProgram();
  const sessions = useSessions();
  const [open, setOpen] = useState<number | null>(null);
  if (!program || !sessions) return <div className="screen" />;

  const tpl = program.sessions.find((t) => t.id === tplId);
  if (!tpl) {
    return (
      <div className="screen">
        <p className="empty">האימון לא נמצא.</p>
        <button type="button" className="btn btn-primary" onClick={() => go('/settings')}>
          להגדרות
        </button>
      </div>
    );
  }

  const save = (next: SessionTemplate) => void saveProgram({ ...program, sessions: program.sessions.map((t) => (t.id === tplId ? next : t)) });
  const setEx = (i: number, ex: ExerciseTemplate) => save({ ...tpl, exercises: tpl.exercises.map((e, k) => (k === i ? ex : e)) });
  const moveEx = (i: number, d: -1 | 1) => {
    const list = tpl.exercises.slice();
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    save({ ...tpl, exercises: list });
    setOpen(open === i ? j : open);
  };

  // Known exercises, so adding "הרמות צד" to another session links to the same history.
  const known = new Map<string, string>();
  for (const t of program.sessions) for (const e of t.exercises) known.set(e.name.trim(), e.id);
  for (const s of sessions) for (const e of s.exercises) if (!known.has(e.name.trim())) known.set(e.name.trim(), e.exId);
  const hasHistory = (id: string) => sessions.some((s) => s.exercises.some((e) => e.exId === id));

  const linkByName = (i: number, ex: ExerciseTemplate) => {
    const name = ex.name.trim();
    const others = [
      ...program.sessions.flatMap((t) => t.exercises.map((e) => ({ name: e.name, id: e.id }))),
      ...sessions.flatMap((s) => s.exercises.map((e) => ({ name: e.name, id: e.exId }))),
    ];
    const match = others.find((o) => o.name.trim() === name && o.id !== ex.id);
    if (match && !hasHistory(ex.id)) setEx(i, { ...ex, id: match.id });
  };

  return (
    <div className="screen editor">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="חזרה" onClick={() => go('/settings')}>
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">עריכת {tpl.name}</h1>
      </div>

      <div className="card-plain">
        <label className="field">
          <span className="field-label">שם</span>
          <input className="text-input" value={tpl.name} onChange={(e) => save({ ...tpl, name: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">תיאור קצר</span>
          <input className="text-input" value={tpl.subtitle ?? ''} onChange={(e) => save({ ...tpl, subtitle: e.target.value || undefined })} />
        </label>
        <Stepper size="m" label="משך משוער (דקות)" value={tpl.durationMin} onChange={(v) => save({ ...tpl, durationMin: v ?? 0 })} step={5} max={240} />
        <div className="field">
          <span className="field-label">סוג</span>
          <Segmented<SessionKind>
            ariaLabel="סוג אימון"
            value={tpl.kind}
            onChange={(v) => v && save({ ...tpl, kind: v })}
            options={[
              { value: 'strength', label: 'כוח' },
              { value: 'cardio', label: 'אירובי' },
            ]}
          />
        </div>
        <Toggle checked={tpl.bonus} onChange={(v) => save({ ...tpl, bonus: v })}>
          אימון בונוס (הראשון לדלג עליו בשבוע עמוס)
        </Toggle>
      </div>

      {tpl.kind === 'strength' && (
        <section>
          <h2 className="section-title">תרגילים</h2>
          <datalist id="known-exercises">
            {[...known.keys()].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <ol className="edit-ex-list">
            {tpl.exercises.map((ex, i) => (
              <li key={`${ex.id}-${i}`} className={`edit-ex ${open === i ? 'open' : ''}`}>
                <div className="edit-ex-head">
                  <div className="order-arrows">
                    <button type="button" className="icon-btn small" aria-label="הזז למעלה" disabled={i === 0} onClick={() => moveEx(i, -1)}>
                      <Icon name="up" size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn small"
                      aria-label="הזז למטה"
                      disabled={i === tpl.exercises.length - 1}
                      onClick={() => moveEx(i, 1)}
                    >
                      <Icon name="down" size={18} />
                    </button>
                  </div>
                  <button type="button" className="order-main" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                    <span className="order-name">{ex.name || 'תרגיל ללא שם'}</span>
                    <span className="muted small">
                      <Num>
                        {ex.sets}×{ex.repMin}–{ex.repMax}
                      </Num>
                      {ex.unilateral && ' לכל צד'} · {muscleLabel[ex.muscle]}
                      {fmtRest(ex.restMinSec, ex.restMaxSec) && (
                        <>
                          {' '}
                          · מנוחה <Num>{fmtRest(ex.restMinSec, ex.restMaxSec)}</Num> דק׳
                        </>
                      )}
                    </span>
                  </button>
                </div>
                {open === i && <ExerciseFields ex={ex} onChange={(next) => setEx(i, next)} onNameDone={(next) => linkByName(i, next)} onDelete={() => {
                  if (!confirm(`למחוק את "${ex.name}" מהאימון? ההיסטוריה שלו נשארת.`)) return;
                  save({ ...tpl, exercises: tpl.exercises.filter((_, k) => k !== i) });
                  setOpen(null);
                }} />}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => {
              const ex: ExerciseTemplate = {
                id: newId(),
                name: '',
                sets: 3,
                repMin: 8,
                repMax: 12,
                restMinSec: 90,
                restMaxSec: 90,
                unilateral: false,
                weightMode: 'perHand',
                equipment: 'dumbbell',
                muscle: 'chest',
              };
              save({ ...tpl, exercises: [...tpl.exercises, ex] });
              setOpen(tpl.exercises.length);
            }}
          >
            <Icon name="plus" size={18} /> הוסף תרגיל
          </button>
        </section>
      )}

      <button
        type="button"
        className="btn btn-danger btn-block"
        disabled={program.sessions.length <= 1}
        onClick={() => {
          if (!confirm(`למחוק את "${tpl.name}" מהתוכנית? אימונים שכבר נרשמו נשארים בהיסטוריה.`)) return;
          void saveProgram({ ...program, sessions: program.sessions.filter((t) => t.id !== tplId) });
          go('/settings');
        }}
      >
        <Icon name="trash" /> מחק את האימון מהתוכנית
      </button>
    </div>
  );
}

function ExerciseFields(props: {
  ex: ExerciseTemplate;
  onChange: (ex: ExerciseTemplate) => void;
  onNameDone: (ex: ExerciseTemplate) => void;
  onDelete: () => void;
}) {
  const { ex, onChange } = props;
  const set = (patch: Partial<ExerciseTemplate>) => onChange({ ...ex, ...patch });
  return (
    <div className="edit-ex-body">
      <label className="field">
        <span className="field-label">שם התרגיל</span>
        <input
          className="text-input"
          list="known-exercises"
          value={ex.name}
          placeholder="למשל: הרמות צד"
          onChange={(e) => set({ name: e.target.value })}
          onBlur={() => props.onNameDone(ex)}
        />
      </label>
      <div className="two-col">
        <Stepper size="m" label="סטים" value={ex.sets} onChange={(v) => set({ sets: Math.max(1, v ?? 1) })} step={1} min={1} max={10} />
        <div />
        <Stepper size="m" label="חזרות ממינימום" value={ex.repMin} onChange={(v) => set({ repMin: v ?? 1, repMax: Math.max(ex.repMax, v ?? 1) })} step={1} min={1} max={50} />
        <Stepper size="m" label="עד מקסימום" value={ex.repMax} onChange={(v) => set({ repMax: Math.max(v ?? 1, ex.repMin) })} step={1} min={1} max={50} />
        <Stepper
          size="m"
          label="מנוחה מ (דק׳)"
          value={ex.restMinSec / 60}
          onChange={(v) => set({ restMinSec: Math.round((v ?? 0) * 60), restMaxSec: Math.max(ex.restMaxSec, Math.round((v ?? 0) * 60)) })}
          step={0.5}
          decimal
          max={10}
        />
        <Stepper
          size="m"
          label="עד (דק׳)"
          value={ex.restMaxSec / 60}
          onChange={(v) => set({ restMaxSec: Math.max(Math.round((v ?? 0) * 60), ex.restMinSec) })}
          step={0.5}
          decimal
          max={10}
        />
      </div>
      <Toggle checked={ex.unilateral} onChange={(v) => set({ unilateral: v })}>
        יד יד / רגל רגל: חזרות נפרדות לשמאל ולימין
      </Toggle>
      <label className="field">
        <span className="field-label">איך נרשם המשקל</span>
        <select className="text-input" value={ex.weightMode} onChange={(e) => set({ weightMode: e.target.value as WeightMode })}>
          {(Object.keys(weightModeLabel) as WeightMode[]).map((m) => (
            <option key={m} value={m}>
              {weightModeLabel[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">ציוד (קובע את קפיצת המשקל)</span>
        <select className="text-input" value={ex.equipment} onChange={(e) => set({ equipment: e.target.value as Equipment })}>
          {(Object.keys(equipmentLabel) as Equipment[]).map((m) => (
            <option key={m} value={m}>
              {equipmentLabel[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">קבוצת שריר (לספירת סטים שבועית)</span>
        <select className="text-input" value={ex.muscle} onChange={(e) => set({ muscle: e.target.value as MuscleGroup })}>
          {(Object.keys(muscleLabel) as MuscleGroup[]).map((m) => (
            <option key={m} value={m}>
              {muscleLabel[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">הערת ביצוע (לא חובה)</span>
        <input className="text-input" value={ex.cue ?? ''} onChange={(e) => set({ cue: e.target.value || undefined })} />
      </label>
      <button type="button" className="btn btn-danger" onClick={props.onDelete}>
        <Icon name="trash" size={18} /> מחק תרגיל
      </button>
    </div>
  );
}
