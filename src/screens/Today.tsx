import { useState } from 'react';
import { saveSession, useMeta, useProgram, useSessions, useSettings } from '../db';
import { Num } from '../components/ui';
import { SessionScreen } from './SessionScreen';
import { calibrationWeek, nextTemplateId, templateAfter } from '../logic/day';
import { byStartDesc, finished } from '../logic/history';
import { createSession, templateById } from '../logic/session';
import { twoWorseInARow } from '../logic/trend';
import { daysAgo, fmtDate } from '../lib/format';
import { go } from '../lib/router';

export function Today() {
  const sessions = useSessions();
  const program = useProgram();
  const settings = useSettings();
  const lastExport = useMeta<number>('lastExport');
  const [chosen, setChosen] = useState<string | null>(null);

  if (!sessions || !program || !settings) return <div className="screen" />;

  const active = sessions.find((s) => s.status === 'active');
  if (active) return <SessionScreen key={active.id} id={active.id} mode="live" />;

  const suggestedId = nextTemplateId(program, sessions);
  const tpl = templateById(program, chosen ?? suggestedId ?? '') ?? program.sessions[0];
  if (!tpl) {
    return (
      <div className="screen">
        <p className="empty">אין אימונים בתוכנית. אפשר להוסיף בהגדרות.</p>
      </div>
    );
  }

  const calWeek = calibrationWeek(settings.programStart, Date.now());
  const worse = twoWorseInARow(sessions);
  const last = finished(sessions).sort(byStartDesc)[0];
  const isSuggested = tpl.id === suggestedId;
  const backupDue = finished(sessions).length >= 3 && (!lastExport || Date.now() - lastExport > 14 * 86400000);

  const start = async () => {
    if (tpl.kind === 'strength') {
      go(`/start/${tpl.id}`);
      return;
    }
    const s = createSession({
      tpl,
      settings,
      sessions,
      readiness: { sleepHours: null, energy: null, sick: false, backPain: false },
      dayState: 'green',
      dayStateAuto: 'green',
    });
    await saveSession(s);
  };

  return (
    <div className="screen today">
      <p className="today-date">{fmtDate(Date.now())}</p>

      {calWeek && tpl.kind === 'strength' && (
        <div className="banner banner-info">
          שבוע כיול <Num>{calWeek}</Num> מתוך <Num>2</Num>: עצור 2 חזרות לפני כשל. אין העלאות משקל כפויות.
        </div>
      )}
      {worse && <div className="banner banner-yellow">שני אימונים ברצף יצאו חלשים מהקודמים. בדוק קודם שינה ואוכל.</div>}

      <section className="next-card">
        <span className="next-kicker">{isSuggested ? 'הבא בתור' : 'נבחר'}</span>
        <h1 className="next-name">{tpl.name}</h1>
        <p className="next-sub">
          {tpl.subtitle && <>{tpl.subtitle} · </>}בערך <Num>{tpl.durationMin}</Num> דק׳
        </p>
        {tpl.exercises.length > 0 && (
          <ol className="next-list">
            {tpl.exercises.map((e, i) => (
              <li key={`${e.id}-${i}`}>
                <span>{e.name}</span>
                <Num>
                  {e.sets}×{e.repMin}–{e.repMax}
                </Num>
              </li>
            ))}
          </ol>
        )}
        <button type="button" className="btn btn-primary btn-block btn-xl" onClick={start}>
          {tpl.kind === 'strength' ? 'התחל אימון' : 'התחל ריצה'}
        </button>
        {tpl.bonus && (
          <button type="button" className="btn btn-quiet btn-block" onClick={() => setChosen(templateAfter(program, tpl.id))}>
            שבוע עמוס? דלג על הבונוס
          </button>
        )}
      </section>

      <section className="other-sessions">
        <h2 className="section-title">אימון אחר</h2>
        <div className="chip-list">
          {program.sessions.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${t.id === tpl.id ? 'on' : ''}`}
              aria-pressed={t.id === tpl.id}
              onClick={() => setChosen(t.id === suggestedId ? null : t.id)}
            >
              {t.name}
              {t.id === suggestedId && <span className="chip-mark"> · הבא</span>}
            </button>
          ))}
        </div>
      </section>

      {last && (
        <button type="button" className="last-line" onClick={() => go(`/history/${last.id}`)}>
          אימון אחרון: {last.templateName}, {fmtDate(last.startedAt)} ({daysAgo(last.startedAt)})
        </button>
      )}
      {backupDue && (
        <button type="button" className="banner banner-quiet" onClick={() => go('/settings')}>
          {lastExport ? `הגיבוי האחרון ${daysAgo(lastExport)}.` : 'עוד לא גיבית.'} כדאי לייצא קובץ גיבוי בהגדרות.
        </button>
      )}
    </div>
  );
}
