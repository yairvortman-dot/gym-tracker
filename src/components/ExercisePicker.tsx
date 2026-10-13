import { useEffect, useState, type ReactNode } from 'react';
import type { ExerciseTemplate } from '../types';
import { focusLabel, type LibraryExercise } from '../data/exerciseLibrary';
import { exercisePool, pickerGroups, type PickerGroup } from '../logic/library';
import { muscleLabel } from '../logic/weekly';
import { weightModeLabel } from '../lib/format';
import { equipmentLabel } from '../screens/Settings';
import { Icon, Num, Sheet } from './ui';

export function ExercisePicker(props: {
  open: boolean;
  title: string;
  /** Exercises already in the session being edited. */
  session: ExerciseTemplate[];
  /** Every exercise in the program, so the person's own exercises can be offered too. */
  programExercises: ExerciseTemplate[];
  /** The exercise being replaced, if any. It isn't marked as "already in the session". */
  replacing?: ExerciseTemplate;
  /** Shown under the search box, e.g. the "also change it in the program" toggle. */
  extra?: ReactNode;
  onPick: (x: LibraryExercise) => void;
  onCustom: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [showOthers, setShowOthers] = useState(false);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!props.open) return;
    setQuery('');
    setCustom('');
    setShowOthers(props.session.length === 0);
  }, [props.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = exercisePool(props.programExercises);
  const inSession = new Set(props.session.filter((e) => e !== props.replacing).map((e) => e.id));
  // The exercise being replaced still counts, so replacing a chest exercise suggests chest first.
  const { relevant, others } = pickerGroups(pool, props.session);

  const q = query.trim();
  const searching = q.length > 0;
  const matches = searching ? pool.filter((x) => x.name.includes(q)) : [];

  const row = (x: LibraryExercise) => {
    const taken = inSession.has(x.id);
    return (
      <li key={x.id}>
        <button type="button" className="pick-row" disabled={taken} onClick={() => props.onPick(x)}>
          <span className="pick-name">{x.name}</span>
          <span className="pick-meta">
            <Num>
              {x.sets}×{x.repMin}–{x.repMax}
            </Num>
            {x.unilateral && ' לכל צד'} · {equipmentLabel[x.equipment]}
            {x.weightMode !== 'total' && x.weightMode !== 'added' && <> · {weightModeLabel[x.weightMode]}</>}
            {x.focus && <> · {focusLabel[x.focus]}</>}
          </span>
          {taken && <span className="pick-taken">כבר באימון</span>}
        </button>
      </li>
    );
  };

  const groups = (gs: PickerGroup[]) =>
    gs.map((g) => (
      <section key={g.muscle} className="pick-group">
        <h4 className="pick-muscle">{muscleLabel[g.muscle]}</h4>
        <ul className="pick-list">{g.items.map(row)}</ul>
      </section>
    ));

  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title}>
      <input
        className="text-input"
        type="search"
        placeholder="חיפוש תרגיל"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="חיפוש תרגיל"
      />
      {props.extra}

      {searching ? (
        matches.length > 0 ? (
          <ul className="pick-list">{matches.map(row)}</ul>
        ) : (
          <p className="muted">לא נמצא תרגיל בשם הזה. אפשר להוסיף אותו כתרגיל משלך למטה.</p>
        )
      ) : (
        <>
          {relevant.length > 0 && (
            <div className="pick-block">
              <h3 className="pick-heading">מתאים לאימון הזה</h3>
              {groups(relevant)}
            </div>
          )}
          {relevant.length > 0 && !showOthers ? (
            <button type="button" className="btn btn-outline btn-block" onClick={() => setShowOthers(true)}>
              הצג את כל שאר התרגילים
            </button>
          ) : (
            <div className="pick-block">
              {relevant.length > 0 && <h3 className="pick-heading">שאר התרגילים</h3>}
              {groups(others)}
            </div>
          )}
        </>
      )}

      <form
        className="pick-custom"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) props.onCustom(custom.trim());
        }}
      >
        <label className="field">
          <span className="field-label">תרגיל משלי</span>
          <input className="text-input" placeholder="שם התרגיל" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-outline" disabled={!custom.trim()}>
          <Icon name="plus" size={18} /> הוסף
        </button>
      </form>
    </Sheet>
  );
}
