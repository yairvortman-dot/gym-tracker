import { useState } from 'react';
import { useProgram, useSessions } from '../db';
import { LineChart } from '../components/LineChart';
import { Icon, Num } from '../components/ui';
import { addDays, weekStart } from '../logic/day';
import { topWeight, totalReps, wasPerformed } from '../logic/sets';
import { muscleLabel, muscleOrder, weeklySets, weeklyTargets } from '../logic/weekly';
import { fmtDate, fmtNum, fmtSets, fmtShortDate } from '../lib/format';
import { go } from '../lib/router';
import type { ExerciseLog, Program, SessionLog } from '../types';

export function Progress({ exId }: { exId?: string }) {
  const sessions = useSessions();
  const program = useProgram();
  if (!sessions || !program) return <div className="screen" />;
  if (exId) return <ExerciseProgress exId={exId} sessions={sessions} program={program} />;

  // Program exercises first (in program order), then anything that only exists in history.
  const seen = new Map<string, string>();
  for (const t of program.sessions) for (const e of t.exercises) if (!seen.has(e.id)) seen.set(e.id, e.name);
  for (const s of sessions) for (const e of s.exercises) if (!seen.has(e.exId)) seen.set(e.exId, e.name);

  return (
    <div className="screen">
      <h1 className="screen-title">התקדמות</h1>
      <WeeklySummary sessions={sessions} program={program} />
      <section>
        <h2 className="section-title">תרגילים</h2>
        <ul className="ex-list">
          {[...seen.entries()].map(([id, name]) => {
            const logs = performances(sessions, id);
            const last = logs[logs.length - 1];
            const w = last ? topWeight(last.ex) : null;
            return (
              <li key={id}>
                <button type="button" className="ex-list-row" onClick={() => go(`/progress/${encodeURIComponent(id)}`)}>
                  <span className="ex-list-name">{name}</span>
                  <span className="ex-list-meta">
                    {last ? (
                      <>
                        {w != null && (
                          <>
                            <Num>{fmtNum(w)}</Num> ק״ג ·{' '}
                          </>
                        )}
                        <Num>{logs.length}</Num> {logs.length === 1 ? 'אימון' : 'אימונים'}
                      </>
                    ) : (
                      <span className="muted">עוד לא בוצע</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function performances(sessions: SessionLog[], exId: string): { s: SessionLog; ex: ExerciseLog }[] {
  const out: { s: SessionLog; ex: ExerciseLog }[] = [];
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exId === exId && wasPerformed(e));
    if (ex) out.push({ s, ex });
  }
  return out.sort((a, b) => a.s.startedAt - b.s.startedAt);
}

function WeeklySummary({ sessions, program }: { sessions: SessionLog[]; program: Program }) {
  const [offset, setOffset] = useState(0);
  const start = addDays(weekStart(Date.now()), -7 * offset);
  const counts = weeklySets(sessions, start);
  const { base, withBonus } = weeklyTargets(program);
  const groups = muscleOrder.filter((m) => withBonus[m] > 0 || counts[m] > 0);

  return (
    <section className="weekly card-plain">
      <div className="weekly-head">
        <button type="button" className="icon-btn" aria-label="שבוע קודם" onClick={() => setOffset(offset + 1)}>
          <Icon name="back" />
        </button>
        <h2 className="section-title">
          {offset === 0 ? 'סטים ישירים השבוע' : (
            <>
              סטים ישירים, <Num>{fmtShortDate(start)}–{fmtShortDate(addDays(start, 6))}</Num>
            </>
          )}
        </h2>
        <button
          type="button"
          className="icon-btn flip"
          aria-label="שבוע הבא"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 1))}
        >
          <Icon name="back" />
        </button>
      </div>
      <ul className="meters">
        {groups.map((m) => {
          const scale = Math.max(withBonus[m], counts[m], 1);
          const hasBonus = withBonus[m] !== base[m];
          const reached = counts[m] >= base[m] && base[m] > 0;
          return (
            <li key={m} className="meter-row">
              <div className="meter-text">
                <span className="meter-name">{muscleLabel[m]}</span>
                <span className="meter-value">
                  <strong className="num">{counts[m]}</strong>
                  <span className="muted">
                    {' '}
                    / <Num>{base[m]}</Num>
                    {hasBonus && (
                      <>
                        {' '}
                        (<Num>{withBonus[m]}</Num> עם בונוס)
                      </>
                    )}
                  </span>
                  {reached && <Icon name="check" size={16} />}
                </span>
              </div>
              <div className="meter" role="meter" aria-valuenow={counts[m]} aria-valuemin={0} aria-valuemax={withBonus[m]} aria-label={muscleLabel[m]}>
                <div className="meter-fill" style={{ inlineSize: `${(Math.min(counts[m], scale) / scale) * 100}%` }} />
                {base[m] > 0 && <div className="meter-mark" style={{ insetInlineStart: `${(base[m] / scale) * 100}%` }} />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted small">השבוע מתחיל ביום ראשון. נספרים רק סטים שבוצעו.</p>
    </section>
  );
}

function ExerciseProgress({ exId, sessions, program }: { exId: string; sessions: SessionLog[]; program: Program }) {
  const logs = performances(sessions, exId);
  const name =
    program.sessions.flatMap((t) => t.exercises).find((e) => e.id === exId)?.name ?? logs[logs.length - 1]?.ex.name ?? exId;
  const uni = logs.some((l) => l.ex.plan.unilateral);
  const weightPts = logs.flatMap(({ s, ex }) => {
    const w = topWeight(ex);
    return w == null ? [] : [{ x: s.startedAt, y: w }];
  });
  const repPts = logs.map(({ s, ex }) => ({ x: s.startedAt, y: totalReps(ex) }));

  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="חזרה" onClick={() => go('/progress')}>
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">{name}</h1>
      </div>
      {logs.length === 0 ? (
        <p className="empty">התרגיל עוד לא בוצע. אחרי האימון הראשון יופיע כאן גרף.</p>
      ) : (
        <>
          <section className="card-plain">
            <h2 className="chart-title">משקל בסט הכבד (ק״ג)</h2>
            <LineChart points={weightPts} unit="ק״ג" label="משקל בסט הכבד" />
          </section>
          <section className="card-plain">
            <h2 className="chart-title">סה״כ חזרות{uni ? ' (שני הצדדים)' : ''}</h2>
            <LineChart points={repPts} unit="חזרות" label="סה״כ חזרות" />
          </section>
          <section>
            <h2 className="section-title">כל הפעמים</h2>
            <ul className="perf-list">
              {logs
                .slice()
                .reverse()
                .map(({ s, ex }) => (
                  <li key={s.id}>
                    <button type="button" className="perf-row" onClick={() => go(`/history/${s.id}`)}>
                      <span className="perf-date">{fmtDate(s.startedAt, true)}</span>
                      <span className="perf-sets">
                        <Num>{fmtSets(ex)}</Num>
                      </span>
                      {ex.rir != null && <span className="perf-rir">RIR {ex.rir}</span>}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
