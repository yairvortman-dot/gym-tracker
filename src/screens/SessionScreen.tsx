import { useEffect, useMemo, useState } from 'react';
import type { DayState, ExerciseLog, SessionLog } from '../types';
import { db, deleteSession, saveSession, useSessions, useSettings } from '../db';
import { ExerciseCard, type Selection } from '../components/ExerciseCard';
import { useRestTimer } from '../components/RestTimer';
import { Icon, Num, Segmented, Sheet, Stepper, Toggle } from '../components/ui';
import { dayStateLabel, dayStateRule } from '../logic/day';
import { lastPerformance } from '../logic/history';
import { elapsedMin, finalizeSession, stepFor } from '../logic/session';
import { hasReps } from '../logic/sets';
import { fmtClock, fmtDate, fmtTime } from '../lib/format';
import { go } from '../lib/router';
import { useWakeLock } from '../lib/wakeLock';

type Mode = 'live' | 'edit';

const visible = (e: ExerciseLog) => e.optional !== 'available';

function firstPending(log: SessionLog, fromEx = 0, fromSet = -1): Selection | null {
  for (let i = fromEx; i < log.exercises.length; i++) {
    const e = log.exercises[i];
    if (!visible(e) || e.skipped) continue;
    const start = i === fromEx ? fromSet + 1 : 0;
    for (let k = start; k < e.sets.length; k++) if (e.sets[k].status === 'pending') return { ex: i, set: k };
  }
  return null;
}

export function SessionScreen({ id, mode }: { id: string; mode: Mode }) {
  const [log, setLog] = useState<SessionLog | null | undefined>(undefined);
  const sessions = useSessions();
  const settings = useSettings();
  const timer = useRestTimer();
  const [sel, setSel] = useState<Selection | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void db.sessions.get(id).then((s) => {
      if (!alive) return;
      setLog(s ?? null);
      if (s && mode === 'live') setSel(firstPending(s));
    });
    return () => {
      alive = false;
    };
  }, [id, mode]);

  const live = mode === 'live' && log?.status === 'active';
  useWakeLock(live);

  const update = (next: SessionLog) => {
    setLog(next);
    void saveSession(next);
  };

  const lastByEx = useMemo(() => {
    const map = new Map<string, ReturnType<typeof lastPerformance>>();
    if (!log || !sessions) return map;
    for (const e of log.exercises) map.set(e.exId, lastPerformance(sessions, e.exId, log.startedAt));
    return map;
  }, [log?.startedAt, log?.exercises.length, sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (log === undefined || !settings) return <div className="screen" />;
  if (log === null) {
    return (
      <div className="screen">
        <p className="empty">האימון הזה לא קיים יותר.</p>
        <button type="button" className="btn btn-primary" onClick={() => go('/history')}>
          להיסטוריה
        </button>
      </div>
    );
  }

  const setExercise = (i: number, ex: ExerciseLog) => update({ ...log, exercises: log.exercises.map((e, k) => (k === i ? ex : e)) });

  const onSetDone = (exIdx: number, setIdx: number, how: 'done' | 'skipped') => {
    if (mode !== 'live') return;
    const ex = log.exercises[exIdx];
    if (how === 'done' && ex.plan.restMinSec > 0) timer.start(ex.plan.restMinSec, `${ex.name} · סט ${setIdx + 1}`);
    setSel(firstPending(log, exIdx, setIdx) ?? firstPending(log));
  };

  const optionals = log.exercises.map((e, i) => ({ e, i })).filter(({ e }) => e.optional);
  const pickedOptional = optionals.some(({ e }) => e.optional === 'picked');

  const header =
    mode === 'live' ? (
      <LiveHeader log={log} onFinish={() => setFinishOpen(true)} />
    ) : (
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="חזרה" onClick={() => go('/history')}>
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">{log.templateName}</h1>
        {log.status === 'active' && (
          <button type="button" className="btn btn-small btn-primary" onClick={() => go('/')}>
            להמשך האימון
          </button>
        )}
      </div>
    );

  return (
    <div className="screen session-screen">
      {header}

      {mode === 'edit' && <EditDetails log={log} onChange={update} />}

      {mode === 'live' && log.calibration && log.kind === 'strength' && (
        <div className="banner banner-info">שבועות כיול: עצור 2 חזרות לפני כשל, בלי לרדוף אחרי משקל.</div>
      )}
      {mode === 'live' && log.dayState !== 'green' && (
        <div className={`banner banner-${log.dayState}`}>
          יום {dayStateLabel[log.dayState]}. {dayStateRule[log.dayState]}
        </div>
      )}

      {log.kind === 'cardio' ? (
        <RunBody log={log} onChange={update} mode={mode} onFinish={() => setFinishOpen(true)} />
      ) : (
        <>
          {log.exercises.map((ex, i) =>
            visible(ex) ? (
              <div key={`${ex.exId}-${i}`}>
                {ex.optional === 'picked' && (
                  <div className="optional-tag">
                    תרגיל אופציונלי
                    {!ex.sets.some((s) => s.status !== 'pending' || hasReps(s, ex.plan.unilateral)) && (
                      <button type="button" className="btn-text" onClick={() => setExercise(i, { ...ex, optional: 'available' })}>
                        בטל בחירה
                      </button>
                    )}
                  </div>
                )}
                <ExerciseCard
                  index={i}
                  ex={ex}
                  last={lastByEx.get(ex.exId) ?? null}
                  step={stepFor(settings, ex.plan)}
                  selected={sel?.ex === i ? sel.set : null}
                  onSelect={(s) => setSel(s == null ? null : { ex: i, set: s })}
                  onChange={(next) => setExercise(i, next)}
                  onSetDone={(s, how) => onSetDone(i, s, how)}
                  mode={mode}
                />
              </div>
            ) : null,
          )}

          {optionals.length > 0 && !pickedOptional && (
            <section className="optional-pick">
              <h3>תרגיל אופציונלי, בחר אחד אם יש כוח</h3>
              <div className="chip-list">
                {optionals.map(({ e, i }) => (
                  <button
                    key={i}
                    type="button"
                    className="chip"
                    onClick={() => {
                      setExercise(i, { ...e, optional: 'picked' });
                      setSel({ ex: i, set: 0 });
                    }}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {mode === 'live' ? (
            <button type="button" className="btn btn-primary btn-block btn-finish" onClick={() => setFinishOpen(true)}>
              סיום אימון
            </button>
          ) : (
            <FinishFields log={log} onChange={update} inline />
          )}
        </>
      )}

      {mode === 'edit' && (
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={async () => {
            if (!confirm(`למחוק את האימון "${log.templateName}" מ${fmtDate(log.startedAt)}? אי אפשר לבטל.`)) return;
            await deleteSession(log.id);
            go('/history');
          }}
        >
          <Icon name="trash" /> מחק אימון
        </button>
      )}

      {mode === 'live' && (
        <FinishSheet
          open={finishOpen}
          log={log}
          onClose={() => setFinishOpen(false)}
          onSave={async (draft) => {
            const now = Date.now();
            const done = finalizeSession(draft, now, draft.durationMin ?? elapsedMin(draft.startedAt, now));
            await saveSession(done);
            timer.stop();
            setFinishOpen(false);
            go(`/history/${done.id}`);
          }}
          onDiscard={async () => {
            if (!confirm('לבטל את האימון בלי לשמור? כל מה שנרשם בו יימחק.')) return;
            await deleteSession(log.id);
            timer.stop();
            setFinishOpen(false);
            go('/');
          }}
        />
      )}
    </div>
  );
}

function LiveHeader({ log, onFinish }: { log: SessionLog; onFinish: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = (now - log.startedAt) / 1000;
  const h = Math.floor(elapsed / 3600);
  return (
    <div className="topbar topbar-live">
      <div className="live-title">
        <h1 className="topbar-title">{log.templateName}</h1>
        <span className="live-sub">
          <span className={`dot dot-${log.dayState}`} aria-hidden /> התחלת ב-<Num>{fmtTime(log.startedAt)}</Num>
        </span>
      </div>
      <span className="live-clock num" aria-label="זמן אימון">
        {h > 0 ? `${h}:${fmtClock(elapsed - h * 3600).padStart(5, '0')}` : fmtClock(elapsed)}
      </span>
      <button type="button" className="btn btn-small btn-outline" onClick={onFinish}>
        סיום
      </button>
    </div>
  );
}

function RunBody({ log, onChange, mode, onFinish }: { log: SessionLog; onChange: (s: SessionLog) => void; mode: Mode; onFinish: () => void }) {
  if (mode === 'edit') return <FinishFields log={log} onChange={onChange} inline />;
  return (
    <section className="ex-card run-card">
      <p>ריצה קלה בקצב שיחה. כשתסיים, רשום זמן ומרחק.</p>
      <button type="button" className="btn btn-primary btn-block" onClick={onFinish}>
        סיום ריצה
      </button>
    </section>
  );
}

function FinishFields({ log, onChange, inline }: { log: SessionLog; onChange: (s: SessionLog) => void; inline?: boolean }) {
  const performed = log.exercises.filter((e) => visible(e) && !e.skipped);
  return (
    <div className={inline ? 'finish-fields card-plain' : 'finish-fields'}>
      <Stepper
        label="משך האימון (דקות)"
        value={log.durationMin}
        onChange={(v) => onChange({ ...log, durationMin: v })}
        step={5}
        max={600}
        placeholder="—"
      />
      {log.kind === 'cardio' ? (
        <Stepper
          label="מרחק (ק״מ, לא חובה)"
          value={log.distanceKm}
          onChange={(v) => onChange({ ...log, distanceKm: v })}
          step={0.5}
          decimal
          max={100}
          placeholder="—"
        />
      ) : (
        <>
          <Toggle big checked={log.absDone} onChange={(v) => onChange({ ...log, absDone: v })}>
            10 דקות בטן
          </Toggle>
          <div className="field">
            <span className="field-label">איזה תרגיל הרגיש הכי חזק בשריר?</span>
            <div className="chip-list">
              {performed.map((e) => (
                <button
                  key={e.exId}
                  type="button"
                  className={`chip ${log.strongestExId === e.exId ? 'on' : ''}`}
                  aria-pressed={log.strongestExId === e.exId}
                  onClick={() => onChange({ ...log, strongestExId: log.strongestExId === e.exId ? null : e.exId })}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <label className="field">
        <span className="field-label">הערה</span>
        <textarea className="text-input" rows={3} value={log.note} onChange={(e) => onChange({ ...log, note: e.target.value })} />
      </label>
    </div>
  );
}

function FinishSheet(props: {
  open: boolean;
  log: SessionLog;
  onClose: () => void;
  onSave: (draft: SessionLog) => void;
  onDiscard: () => void;
}) {
  const [draft, setDraft] = useState(props.log);
  useEffect(() => {
    if (props.open) setDraft({ ...props.log, durationMin: props.log.durationMin ?? elapsedMin(props.log.startedAt, Date.now()) });
  }, [props.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = props.log.exercises
    .filter((e) => visible(e) && !e.skipped)
    .reduce((n, e) => n + e.sets.filter((s) => s.status === 'pending' && !hasReps(s, e.plan.unilateral)).length, 0);

  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.log.kind === 'cardio' ? 'סיום ריצה' : 'סיום אימון'}>
      {pending > 0 && (
        <p className="sheet-warn">
          <Num>{pending}</Num> סטים לא סומנו. הם יישמרו כ"לא עשיתי".
        </p>
      )}
      <FinishFields log={draft} onChange={setDraft} />
      <div className="sheet-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={() => props.onSave(draft)}>
          שמור וסיים
        </button>
        <button type="button" className="btn btn-quiet btn-block" onClick={props.onClose}>
          חזרה לאימון
        </button>
        <button type="button" className="btn-text danger discard" onClick={props.onDiscard}>
          בטל אימון בלי לשמור
        </button>
      </div>
    </Sheet>
  );
}

function toLocalInput(ts: number) {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function EditDetails({ log, onChange }: { log: SessionLog; onChange: (s: SessionLog) => void }) {
  return (
    <div className="card-plain edit-details">
      <label className="field">
        <span className="field-label">תאריך ושעה</span>
        <input
          className="text-input"
          type="datetime-local"
          dir="ltr"
          value={toLocalInput(log.startedAt)}
          onChange={(e) => {
            const ts = new Date(e.target.value).getTime();
            if (!Number.isFinite(ts)) return;
            const shift = ts - log.startedAt;
            onChange({ ...log, startedAt: ts, finishedAt: log.finishedAt == null ? null : log.finishedAt + shift });
          }}
        />
      </label>
      {log.kind === 'strength' && (
        <>
          <Stepper
            size="m"
            label="שעות שינה"
            value={log.sleepHours}
            onChange={(v) => onChange({ ...log, sleepHours: v })}
            step={0.5}
            decimal
            max={14}
            placeholder="—"
          />
          <div className="field">
            <span className="field-label">אנרגיה</span>
            <Segmented
              ariaLabel="אנרגיה"
              allowClear
              value={log.energy}
              onChange={(v) => onChange({ ...log, energy: v })}
              options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: <span className="num">{v}</span> }))}
            />
          </div>
          <div className="field">
            <span className="field-label">מצב היום</span>
            <Segmented<DayState>
              ariaLabel="מצב היום"
              value={log.dayState}
              onChange={(v) => v && onChange({ ...log, dayState: v })}
              options={(['green', 'yellow', 'red'] as DayState[]).map((v) => ({
                value: v,
                label: dayStateLabel[v],
                className: `seg-${v}`,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
