import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { saveProgram, saveSettings, setMeta, useMeta, useSettings } from '../db';
import { Icon, Num } from '../components/ui';
import { useConfirm } from '../components/Confirm';
import { answered, toAnswers, toDraft, visibleQuestions, type Draft, type Question } from '../data/questions';
import { generateProgram, type Answers } from '../logic/generator';
import { importBackup, parseBackup } from '../lib/backup';
import { go } from '../lib/router';

/**
 * First-run questionnaire that builds a personal program.
 * `first`: shown on a new device before anything else. `redo`: opened from Settings.
 */
export function Onboarding({ mode }: { mode: 'first' | 'redo' }) {
  const settings = useSettings();
  const confirm = useConfirm();
  const saved = useMeta<Answers>('answers');
  const [draft, setDraft] = useState<Draft>({});
  const [step, setStep] = useState(-1); // -1 = welcome, questions.length = summary
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<number | null>(null);

  // "Build a new program" starts from the last answers.
  useEffect(() => {
    if (mode === 'redo' && saved) setDraft(toDraft(saved));
  }, [mode, saved]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const qs = visibleQuestions(draft);
  const onSummary = step >= qs.length;
  const result = useMemo(() => (onSummary ? generateProgram(toAnswers(draft)) : null), [onSummary, draft]);

  const finish = async () => {
    if (!result || !settings) return;
    if (
      mode === 'redo' &&
      !(await confirm({
        title: 'להחליף את התוכנית?',
        body: 'התוכנית הנוכחית תוחלף בתוכנית החדשה. ההיסטוריה שלך נשארת.',
        confirmLabel: 'כן, החלף את התוכנית',
      }))
    )
      return;
    await saveProgram(result.program);
    await saveSettings({ ...settings, ...result.settings });
    await setMeta('answers', toAnswers(draft));
    await setMeta('onboarding', 'done');
    go('/');
  };

  const skip = async () => {
    await setMeta('onboarding', 'done');
    go('/');
  };

  // ---------- welcome ----------
  if (step < 0) {
    return (
      <div className="onb onb-welcome">
        {mode === 'redo' && (
          <button type="button" className="btn btn-small btn-outline onb-cancel" onClick={() => go('/settings')}>
            ביטול
          </button>
        )}
        <div className="onb-hero">
          <span className="onb-mark" aria-hidden>
            <Icon name="today" size={44} />
          </span>
          <h1 className="onb-title">{mode === 'first' ? 'ברוכים הבאים ליומן אימון' : 'תוכנית אימונים חדשה'}</h1>
          <p className="onb-lead">
            נשאל אותך עד <Num>15</Num> שאלות קצרות, בערך <Num>3</Num> דקות, ונבנה לך תוכנית אימונים שמתאימה למטרה, לזמן ולציוד שלך.
            כל דבר אפשר לשנות אחר כך.
          </p>
          <p className="onb-note">התוכנית לא מחליפה ייעוץ רפואי. אם יש כאב או בעיה רפואית, כדאי להתייעץ עם איש מקצוע.</p>
        </div>
        <div className="onb-actions">
          <button type="button" className="btn btn-primary btn-block btn-xl" onClick={() => setStep(0)}>
            המשך
          </button>
          {mode === 'first' && (
            <div className="onb-secondary">
              <button type="button" className="btn-text" onClick={() => fileRef.current?.click()}>
                יש לי קובץ גיבוי
              </button>
              <button type="button" className="btn-text" onClick={skip}>
                דלג, אבנה תוכנית לבד
              </button>
            </div>
          )}
          {msg && (
            <p className="notice" role="status">
              {msg}
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const b = parseBackup(await f.text());
              const ok = await confirm({
                title: 'לייבא את הגיבוי?',
                body: `${b.sessions.length} אימונים והתוכנית מהגיבוי ייכנסו למכשיר הזה.`,
                confirmLabel: 'ייבא',
              });
              if (!ok) return;
              await importBackup(b);
              go('/');
            } catch (err) {
              setMsg((err as Error).message);
            }
          }}
        />
      </div>
    );
  }

  // ---------- summary ----------
  if (onSummary && result) {
    const strength = result.program.sessions.filter((t) => t.kind === 'strength');
    return (
      <div className="onb onb-summary">
        <div className="onb-top">
          <button type="button" className="icon-btn" aria-label="חזרה" onClick={() => setStep(qs.length - 1)}>
            <Icon name="back" />
          </button>
          <div className="onb-progress" aria-hidden>
            <div className="onb-progress-fill" style={{ inlineSize: '100%' }} />
          </div>
        </div>
        <h1 className="onb-title">התוכנית שלך</h1>
        <p className="onb-lead">
          <Num>{strength.filter((t) => !t.bonus).length}</Num> אימוני כוח בסבב
          {result.program.sessions.some((t) => t.kind === 'cardio') && <> ועוד אירובי</>}. האימונים מתחלפים לפי הסדר, ואם מפספסים יום פשוט ממשיכים לאימון הבא.
        </p>

        <section className="card-plain onb-why">
          <h2 className="section-title">למה ככה</h2>
          <ul>
            {result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        {result.program.sessions.map((t) => (
          <section key={t.id} className="card-plain onb-session">
            <div className="onb-session-head">
              <h2>{t.name}</h2>
              <span className="muted small">
                {t.subtitle && <>{t.subtitle} · </>}
                בערך <Num>{t.durationMin}</Num> דק׳
              </span>
            </div>
            {t.exercises.length > 0 && (
              <ol className="next-list">
                {t.exercises.map((e) => (
                  <li key={e.id}>
                    <span>{e.name}</span>
                    <span className="onb-dose">
                      <Num>
                        {e.sets}×{e.repMin}–{e.repMax}
                      </Num>
                      {e.unilateral && ' לכל צד'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}

        <div className="onb-actions">
          <button type="button" className="btn btn-primary btn-block btn-xl" onClick={finish}>
            התחל עם התוכנית
          </button>
          <button type="button" className="btn btn-quiet btn-block" onClick={() => setStep(0)}>
            לשנות תשובות
          </button>
          <p className="muted small">אחר כך אפשר להחליף כל תרגיל, להוסיף ולשנות סטים בהגדרות.</p>
        </div>
      </div>
    );
  }

  // ---------- a question ----------
  const q = qs[step];
  return <QuestionScreen key={q.id} q={q} index={step} total={qs.length} draft={draft} onChange={setDraft} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)} advanceTimer={advanceTimer} />;
}

function QuestionScreen(props: {
  q: Question;
  index: number;
  total: number;
  draft: Draft;
  onChange: (d: Draft) => void;
  onBack: () => void;
  onNext: () => void;
  advanceTimer: MutableRefObject<number | null>;
}) {
  const { q, draft } = props;
  const options = q.options(draft);
  const value = draft[q.id];
  const selected = (v: string) => (q.multi ? Array.isArray(value) && value.includes(v) : value === v);

  const choose = (v: string) => {
    if (!q.multi) {
      props.onChange({ ...draft, [q.id]: v });
      // A short beat so the tap registers visually, then move on.
      if (props.advanceTimer.current) clearTimeout(props.advanceTimer.current);
      props.advanceTimer.current = window.setTimeout(props.onNext, 220);
      return;
    }
    const opt = options.find((o) => o.value === v)!;
    const cur = Array.isArray(value) ? value : [];
    let next: string[];
    if (cur.includes(v)) next = cur.filter((x) => x !== v);
    else if (opt.exclusive) next = [v];
    else {
      next = [...cur.filter((x) => !options.find((o) => o.value === x)?.exclusive), v];
      if (q.max && next.length > q.max) next = next.slice(next.length - q.max);
    }
    props.onChange({ ...draft, [q.id]: next });
  };

  return (
    <div className="onb onb-question">
      <div className="onb-top">
        <button type="button" className="icon-btn" aria-label="חזרה" onClick={props.onBack}>
          <Icon name="back" />
        </button>
        <div
          className="onb-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={props.total}
          aria-valuenow={props.index + 1}
          aria-label={`שאלה ${props.index + 1} מתוך ${props.total}`}
        >
          <div className="onb-progress-fill" style={{ inlineSize: `${((props.index + 1) / props.total) * 100}%` }} />
        </div>
        <span className="onb-count num">
          {props.index + 1}/{props.total}
        </span>
      </div>

      <h1 className="onb-q">{q.title}</h1>
      {q.hint && <p className="onb-hint">{q.hint}</p>}

      <div className="onb-options" role={q.multi ? 'group' : 'radiogroup'} aria-label={q.title}>
        {options.map((o) => {
          const on = selected(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={q.multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              className={`onb-option ${on ? 'on' : ''}`}
              onClick={() => choose(o.value)}
            >
              <span className="onb-option-text">
                <span className="onb-option-label">{o.label}</span>
                {o.hint && <span className="onb-option-hint">{o.hint}</span>}
              </span>
              <span className={`onb-check ${q.multi ? 'box' : 'dot'}`} aria-hidden>
                {on && <Icon name="check" size={18} />}
              </span>
            </button>
          );
        })}
      </div>

      {q.multi && (
        <div className="onb-actions onb-sticky">
          <button type="button" className="btn btn-primary btn-block btn-xl" disabled={!answered(q, draft)} onClick={props.onNext}>
            המשך
          </button>
        </div>
      )}
    </div>
  );
}
