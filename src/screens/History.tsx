import { useSessions } from '../db';
import { Num } from '../components/ui';
import { dayStateLabel, weekStart, addDays } from '../logic/day';
import { doneSets } from '../logic/sets';
import { fmtDate, fmtNum, fmtShortDate, fmtTime } from '../lib/format';
import { go } from '../lib/router';
import type { SessionLog } from '../types';

export function History() {
  const sessions = useSessions();
  if (!sessions) return <div className="screen" />;

  const groups = new Map<number, SessionLog[]>();
  for (const s of sessions) {
    const w = weekStart(s.startedAt);
    groups.set(w, [...(groups.get(w) ?? []), s]);
  }
  const thisWeek = weekStart(Date.now());

  return (
    <div className="screen">
      <h1 className="screen-title">היסטוריה</h1>
      {sessions.length === 0 && <p className="empty">עוד אין אימונים. התחל אחד ממסך היום.</p>}
      {[...groups.entries()].map(([w, list]) => (
        <section key={w} className="history-week">
          <h2 className="section-title">
            {w === thisWeek ? 'השבוע' : (
              <>
                שבוע <Num>{fmtShortDate(w)}–{fmtShortDate(addDays(w, 6))}</Num>
              </>
            )}
          </h2>
          <ul className="history-list">
            {list.map((s) => {
              const sets = s.exercises.reduce((n, e) => n + doneSets(e).length, 0);
              return (
                <li key={s.id}>
                  <button type="button" className="history-row" onClick={() => go(`/history/${s.id}`)}>
                    <span className={`dot dot-${s.dayState}`} aria-label={`יום ${dayStateLabel[s.dayState]}`} />
                    <span className="h-main">
                      <span className="h-name">{s.templateName}</span>
                      <span className="h-date">
                        {fmtDate(s.startedAt)} · <Num>{fmtTime(s.startedAt)}</Num>
                        {s.status === 'active' && <strong className="h-active"> · בתהליך</strong>}
                      </span>
                    </span>
                    <span className="h-stats">
                      {s.kind === 'cardio' ? (
                        s.distanceKm != null ? (
                          <span>
                            <Num>{fmtNum(s.distanceKm)}</Num> ק״מ
                          </span>
                        ) : null
                      ) : (
                        <span>
                          <Num>{sets}</Num> סטים
                        </span>
                      )}
                      {s.durationMin != null && (
                        <span className="h-dur">
                          <Num>{s.durationMin}</Num> דק׳
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
