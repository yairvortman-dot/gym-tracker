import { useEffect, useRef, useState } from 'react';
import type { Equipment, Settings as SettingsT } from '../types';
import { saveProgram, saveSettings, useMeta, useProgram, useSettings } from '../db';
import { defaultProgram } from '../data/defaultProgram';
import { Icon, Num, Stepper, Toggle } from '../components/ui';
import { exportCsv, exportJson, importBackup, parseBackup } from '../lib/backup';
import { daysAgo } from '../lib/format';
import { go } from '../lib/router';
import { wakeLockSupported } from '../lib/wakeLock';
import { newId } from '../logic/session';
import { weeklyTargets, muscleLabel, muscleOrder } from '../logic/weekly';

export const equipmentLabel: Record<Equipment, string> = {
  dumbbell: 'משקולות יד',
  cable: 'כבל',
  machine: 'מכונה',
  barbell: 'מוט',
  bodyweight: 'תוספת למשקל גוף',
};

export function Settings() {
  const program = useProgram();
  const settings = useSettings();
  const lastExport = useMeta<number>('lastExport');
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  if (!program || !settings) return <div className="screen" />;

  const setS = (patch: Partial<SettingsT>) => void saveSettings({ ...settings, ...patch });
  const move = (i: number, d: -1 | 1) => {
    const list = program.sessions.slice();
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    void saveProgram({ ...program, sessions: list });
  };
  const targets = weeklyTargets(program);

  return (
    <div className="screen settings">
      <h1 className="screen-title">הגדרות</h1>

      <section>
        <h2 className="section-title">התוכנית, לפי סדר הסבב</h2>
        <ul className="order-list">
          {program.sessions.map((t, i) => (
            <li key={t.id} className="order-row">
              <div className="order-arrows">
                <button type="button" className="icon-btn small" aria-label="הזז למעלה" disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="up" size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  aria-label="הזז למטה"
                  disabled={i === program.sessions.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <Icon name="down" size={18} />
                </button>
              </div>
              <button type="button" className="order-main" onClick={() => go(`/settings/session/${t.id}`)}>
                <span className="order-name">
                  {t.name}
                  {t.bonus && <span className="tag">בונוס</span>}
                </span>
                <span className="muted small">
                  {t.kind === 'cardio' ? 'אירובי' : <><Num>{t.exercises.length}</Num> תרגילים</>} · <Num>{t.durationMin}</Num> דק׳
                </span>
              </button>
              <span className="row-chevron" aria-hidden>
                <Icon name="forward" size={20} />
              </span>
            </li>
          ))}
        </ul>
        <div className="row-buttons">
          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              const id = newId();
              await saveProgram({
                ...program,
                sessions: [...program.sessions, { id, name: 'אימון חדש', durationMin: 60, kind: 'strength', bonus: false, exercises: [] }],
              });
              go(`/settings/session/${id}`);
            }}
          >
            <Icon name="plus" size={18} /> הוסף אימון
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              if (confirm('להחזיר את התוכנית המקורית? השינויים שעשית בתוכנית יימחקו. ההיסטוריה נשארת.')) void saveProgram(defaultProgram);
            }}
          >
            שחזר תוכנית מקורית
          </button>
        </div>
        <p className="muted small">
          יעדי סטים שבועיים לפי התוכנית:{' '}
          {muscleOrder
            .filter((m) => targets.withBonus[m] > 0)
            .map((m) => `${muscleLabel[m]} ${targets.base[m]}${targets.withBonus[m] !== targets.base[m] ? ` (${targets.withBonus[m]})` : ''}`)
            .join(', ')}
          . בסוגריים: עם הבונוס.
        </p>
      </section>

      <section className="card-plain">
        <h2 className="section-title">קפיצת משקל הכי קטנה (ק״ג)</h2>
        <div className="steps-grid">
          {(Object.keys(equipmentLabel) as Equipment[]).map((eq) => (
            <Stepper
              key={eq}
              size="m"
              label={equipmentLabel[eq]}
              value={settings.kgStep[eq]}
              onChange={(v) => v != null && v > 0 && setS({ kgStep: { ...settings.kgStep, [eq]: v } })}
              step={0.25}
              decimal
              min={0.25}
              max={20}
            />
          ))}
        </div>
      </section>

      <section className="card-plain">
        <h2 className="section-title">כיול</h2>
        <label className="field">
          <span className="field-label">תאריך תחילת התוכנית. 14 הימים הראשונים הם שבועות כיול.</span>
          <input
            className="text-input"
            type="date"
            dir="ltr"
            value={settings.programStart}
            onChange={(e) => e.target.value && setS({ programStart: e.target.value })}
          />
        </label>
        <Toggle checked={settings.sound} onChange={(v) => setS({ sound: v })}>
          צפצוף בסוף זמן המנוחה
        </Toggle>
      </section>

      <section className="card-plain">
        <h2 className="section-title">גיבוי והעברה לטלפון אחר</h2>
        <p className="muted small">
          הנתונים נשמרים רק במכשיר הזה. {lastExport ? `גיבוי אחרון: ${daysAgo(lastExport)}.` : 'עוד לא נוצר גיבוי.'}
        </p>
        <div className="row-buttons">
          <button type="button" className="btn btn-primary" onClick={() => void exportJson()}>
            ייצוא גיבוי (JSON)
          </button>
          <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
            ייבוא גיבוי
          </button>
          <button type="button" className="btn btn-outline" onClick={() => void exportCsv()}>
            ייצוא CSV
          </button>
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
              if (!confirm(`לייבא ${b.sessions.length} אימונים מ-${b.exportedAt.slice(0, 10)}? כל מה שיש עכשיו במכשיר יוחלף.`)) return;
              await importBackup(b);
              setMsg(`יובאו ${b.sessions.length} אימונים.`);
            } catch (err) {
              setMsg((err as Error).message);
            }
          }}
        />
        {msg && (
          <p className="notice" role="status">
            {msg}
          </p>
        )}
      </section>

      <section className="card-plain device">
        <h2 className="section-title">המכשיר הזה</h2>
        <p className="small">מסך דלוק בזמן אימון: {wakeLockSupported ? 'נתמך' : 'לא נתמך בדפדפן הזה'}</p>
        <p className="small">
          אחסון קבוע:{' '}
          {persisted == null ? 'לא ידוע' : persisted ? 'כן' : (
            <button
              type="button"
              className="btn-text"
              onClick={async () => setPersisted((await navigator.storage?.persist?.()) ?? false)}
            >
              לא. בקש אחסון קבוע
            </button>
          )}
        </p>
      </section>
    </div>
  );
}
