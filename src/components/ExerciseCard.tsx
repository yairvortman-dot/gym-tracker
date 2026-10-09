import { useEffect, useRef, useState } from 'react';
import type { ExerciseLog, SessionLog, SetLog } from '../types';
import { fmtDate, fmtNum, fmtRest, fmtSets, fmtTargetReps, repsText, weightModeLabel } from '../lib/format';
import { emptySet, hasReps } from '../logic/sets';
import { Icon, Num, Segmented, Stepper } from './ui';

export interface Selection {
  ex: number;
  set: number;
}

const targetKindLabel: Record<string, string> = {
  increase: 'העלאה',
  decrease: 'הורדה',
  'more-reps': 'עוד חזרות',
  hold: 'שמירה',
  calibrate: 'כיול',
  override: 'יעד ידני',
};

export function ExerciseCard(props: {
  index: number;
  ex: ExerciseLog;
  last: { session: SessionLog; ex: ExerciseLog } | null;
  step: number;
  selected: number | null;
  onSelect: (set: number | null) => void;
  onChange: (ex: ExerciseLog) => void;
  /** Called after a set is ticked done or skipped (live sessions start the rest timer and move on). */
  onSetDone?: (setIndex: number, how: 'done' | 'skipped') => void;
  mode: 'live' | 'edit';
}) {
  const { ex, last, index, selected, mode } = props;
  const uni = ex.plan.unilateral;
  const [noteOpen, setNoteOpen] = useState(ex.note !== '');
  const target = ex.target;

  const setSet = (i: number, patch: Partial<SetLog>) => {
    const sets = ex.sets.map((s, k) => (k === i ? { ...s, ...patch } : s));
    // A new weight carries forward to the sets not done yet.
    if (patch.weight !== undefined) {
      for (let k = i + 1; k < sets.length; k++) if (sets[k].status === 'pending') sets[k] = { ...sets[k], weight: patch.weight };
    }
    props.onChange({ ...ex, sets });
  };

  const targetReps = (i: number) => target?.reps[i] ?? target?.reps[target.reps.length - 1] ?? ex.plan.repMin;

  const markDone = (i: number) => {
    const s = ex.sets[i];
    const t = targetReps(i);
    const patch: Partial<SetLog> = { status: 'done' };
    // Ticking with empty reps logs today's target, which stays editable.
    if (!hasReps(s, uni)) {
      if (uni) Object.assign(patch, { repsL: s.repsL ?? t, repsR: s.repsR ?? t });
      else patch.reps = t;
    } else if (uni) {
      Object.assign(patch, { repsL: s.repsL ?? s.repsR, repsR: s.repsR ?? s.repsL });
    }
    if (s.weight == null && ex.plan.weightMode === 'added') patch.weight = 0;
    props.onChange({ ...ex, sets: ex.sets.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
    props.onSetDone?.(i, 'done');
  };

  if (ex.skipped) {
    return (
      <section className="ex-card is-skipped" aria-label={ex.name}>
        <header className="ex-head">
          <span className="ex-index num">{index + 1}</span>
          <div className="ex-title">
            <h3>{ex.name}</h3>
            <p className="muted">דילגת על התרגיל</p>
          </div>
          <button type="button" className="btn-text" onClick={() => props.onChange({ ...ex, skipped: false })}>
            בטל דילוג
          </button>
        </header>
      </section>
    );
  }

  const lastLine = last ? fmtSets(last.ex) : '';
  const restText = fmtRest(ex.plan.restMinSec, ex.plan.restMaxSec);

  return (
    <section className="ex-card" aria-label={ex.name}>
      <header className="ex-head">
        <span className="ex-index num">{index + 1}</span>
        <div className="ex-title">
          <h3>{ex.name}</h3>
          <p className="ex-meta">
            <Num>
              {ex.sets.length} × {ex.plan.repMin}–{ex.plan.repMax}
            </Num>
            {uni && <span> לכל צד</span>}
            {restText && (
              <span>
                {' '}
                · מנוחה <Num>{restText}</Num> דק׳
              </span>
            )}
          </p>
          {ex.cue && <p className="ex-cue">{ex.cue}</p>}
        </div>
      </header>

      <div className="ex-ref">
        <div className="ref-col">
          <span className="ref-label">פעם קודמת{last && <> · {fmtDate(last.session.startedAt)}</>}</span>
          <span className="ref-value">{lastLine ? <Num>{lastLine}</Num> : <span className="muted">אין עדיין</span>}</span>
          {last?.ex.rir != null && <span className="ref-sub">RIR {last.ex.rir}</span>}
        </div>
        <div className={`ref-col ref-target kind-${target?.kind ?? 'none'}`}>
          <span className="ref-label">
            {mode === 'edit' ? 'היעד שהוצע' : 'יעד היום'}
            {target && targetKindLabel[target.kind] && <> · {targetKindLabel[target.kind]}</>}
          </span>
          <span className="ref-value">
            {target ? (
              <Num>
                {target.weight != null ? `${fmtNum(target.weight)} × ` : ''}
                {fmtTargetReps(target.reps)}
              </Num>
            ) : (
              '—'
            )}
          </span>
          {target && <span className="ref-sub">להשאיר {target.rir} ברזרבה</span>}
        </div>
      </div>
      {target?.note && <p className="ex-note-hint">{target.note}</p>}

      <ol className="sets">
        {ex.sets.map((s, i) => (
          <SetRow
            key={i}
            n={i + 1}
            set={s}
            ex={ex}
            open={selected === i}
            targetReps={targetReps(i)}
            targetWeight={target?.weight ?? null}
            step={props.step}
            onOpen={() => props.onSelect(selected === i ? null : i)}
            onChange={(patch) => setSet(i, patch)}
            onDone={() => markDone(i)}
            onSkip={() => {
              setSet(i, { status: 'skipped', reps: null, repsL: null, repsR: null });
              props.onSetDone?.(i, 'skipped');
            }}
            mode={mode}
          />
        ))}
      </ol>

      <div className="ex-tools">
        <div className="rir-row">
          <span className="tool-label">חזרות ברזרבה</span>
          <Segmented
            ariaLabel="חזרות ברזרבה"
            size="s"
            allowClear
            value={ex.rir}
            onChange={(v) => props.onChange({ ...ex, rir: v })}
            options={[0, 1, 2, 3].map((v) => ({ value: v, label: <span className="num">{v}</span> }))}
          />
        </div>
        {noteOpen ? (
          <input
            className="text-input"
            placeholder="הערה קצרה"
            value={ex.note}
            onChange={(e) => props.onChange({ ...ex, note: e.target.value })}
          />
        ) : null}
        <div className="tool-buttons">
          {!noteOpen && (
            <button type="button" className="btn-text" onClick={() => setNoteOpen(true)}>
              <Icon name="note" size={18} /> הערה
            </button>
          )}
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              const lastSet = ex.sets[ex.sets.length - 1];
              props.onChange({ ...ex, sets: [...ex.sets, emptySet(lastSet?.weight ?? target?.weight ?? null)] });
              props.onSelect(ex.sets.length);
            }}
          >
            <Icon name="plus" size={18} /> הוסף סט
          </button>
          {ex.sets.length > 1 && ex.sets[ex.sets.length - 1].status === 'pending' && !hasReps(ex.sets[ex.sets.length - 1], uni) && (
            <button type="button" className="btn-text" onClick={() => props.onChange({ ...ex, sets: ex.sets.slice(0, -1) })}>
              <Icon name="minus" size={18} /> הסר סט
            </button>
          )}
          <button type="button" className="btn-text danger" onClick={() => props.onChange({ ...ex, skipped: true })}>
            דלג על התרגיל
          </button>
        </div>
      </div>
    </section>
  );
}

function SetRow(props: {
  n: number;
  set: SetLog;
  ex: ExerciseLog;
  open: boolean;
  targetReps: number;
  targetWeight: number | null;
  step: number;
  onOpen: () => void;
  onChange: (patch: Partial<SetLog>) => void;
  onDone: () => void;
  onSkip: () => void;
  mode: 'live' | 'edit';
}) {
  const { set, ex, open, n } = props;
  const uni = ex.plan.unilateral;
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (open && props.mode === 'live') ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, props.mode]);

  const reps = repsText(set, uni);
  const summary =
    set.status === 'skipped' ? (
      <span className="set-skip-label">לא עשיתי</span>
    ) : set.status === 'done' || reps ? (
      <Num>
        {set.weight != null ? `${fmtNum(set.weight)} × ` : ''}
        {reps || '—'}
      </Num>
    ) : (
      <span className="set-target">
        <Num>
          {set.weight != null ? `${fmtNum(set.weight)} × ` : ''}
          {uni ? `${props.targetReps}|${props.targetReps}` : props.targetReps}
        </Num>
      </span>
    );

  return (
    <li ref={ref} className={`set set-${set.status} ${open ? 'open' : ''}`}>
      <button type="button" className="set-line" onClick={props.onOpen} aria-expanded={open}>
        <span className="set-n">סט {n}</span>
        <span className="set-summary">{summary}</span>
        <span className="set-status" aria-hidden>
          {set.status === 'done' && <Icon name="check" size={20} />}
          {set.status === 'skipped' && <Icon name="x" size={18} />}
        </span>
      </button>

      {open && (
        <div className="set-edit">
          <Stepper
            label={<>משקל <span className="muted">({weightModeLabel[ex.plan.weightMode]})</span></>}
            ariaLabel={`משקל סט ${n}`}
            value={set.weight}
            fallback={props.targetWeight}
            onChange={(v) => props.onChange({ weight: v })}
            step={props.step}
            decimal
            placeholder="—"
          />
          {uni ? (
            <div className="lr">
              <Stepper
                label="שמאל"
                ariaLabel={`חזרות שמאל סט ${n}`}
                value={set.repsL}
                fallback={props.targetReps}
                placeholder={String(props.targetReps)}
                onChange={(v) => props.onChange({ repsL: v })}
                step={1}
              />
              <Stepper
                label="ימין"
                ariaLabel={`חזרות ימין סט ${n}`}
                value={set.repsR}
                fallback={props.targetReps}
                placeholder={String(props.targetReps)}
                onChange={(v) => props.onChange({ repsR: v })}
                step={1}
              />
            </div>
          ) : (
            <Stepper
              label={<>חזרות <span className="muted">(יעד <Num>{props.targetReps}</Num>)</span></>}
              ariaLabel={`חזרות סט ${n}`}
              value={set.reps}
              fallback={props.targetReps}
              placeholder={String(props.targetReps)}
              onChange={(v) => props.onChange({ reps: v })}
              step={1}
            />
          )}
          <div className="set-actions">
            {set.status === 'done' ? (
              <button type="button" className="btn btn-quiet" onClick={() => props.onChange({ status: 'pending' })}>
                בטל סימון ביצוע
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-done" onClick={props.onDone}>
                <Icon name="check" /> סיימתי סט
              </button>
            )}
            {set.status === 'skipped' ? (
              <button type="button" className="btn btn-quiet" onClick={() => props.onChange({ status: 'pending' })}>
                החזר סט
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={props.onSkip}
              >
                לא עשיתי
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
