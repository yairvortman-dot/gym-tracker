import { useState } from 'react';
import type { DayState } from '../types';
import { saveSession, useProgram, useSessions, useSettings } from '../db';
import { Icon, Segmented, Stepper, Toggle } from '../components/ui';
import { autoDayState, dayStateLabel, dayStateRule } from '../logic/day';
import { byStartDesc } from '../logic/history';
import { createSession, templateById } from '../logic/session';
import { go } from '../lib/router';

export function StartScreen({ tplId }: { tplId: string }) {
  const program = useProgram();
  const settings = useSettings();
  const sessions = useSessions();
  const [sleep, setSleep] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sick, setSick] = useState(false);
  const [backPain, setBackPain] = useState(false);
  const [override, setOverride] = useState<DayState | null>(null);
  const [busy, setBusy] = useState(false);

  if (!program || !settings || !sessions) return <div className="screen" />;
  const tpl = templateById(program, tplId);
  if (!tpl) {
    go('/');
    return null;
  }

  const readiness = { sleepHours: sleep, energy, sick, backPain };
  const auto = autoDayState(readiness);
  const state = override ?? auto;
  const lastSleep = sessions.slice().sort(byStartDesc).find((s) => s.sleepHours != null)?.sleepHours ?? 7;

  const start = async () => {
    if (busy) return;
    setBusy(true);
    const s = createSession({ tpl, settings, sessions, readiness, dayState: state, dayStateAuto: auto });
    await saveSession(s);
    go('/');
  };

  return (
    <div className="screen start-screen">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="חזרה" onClick={() => go('/')}>
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">לפני {tpl.name}</h1>
      </div>

      <div className="card-plain">
        <Stepper label="כמה שעות ישנת בלילה?" value={sleep} onChange={setSleep} fallback={lastSleep} step={0.5} decimal max={14} placeholder="—" />
        <div className="field">
          <span className="field-label">אנרגיה עכשיו (1 נמוכה, 5 גבוהה)</span>
          <Segmented
            ariaLabel="אנרגיה"
            value={energy}
            onChange={setEnergy}
            options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: <span className="num">{v}</span> }))}
          />
        </div>
        <div className="toggle-row">
          <Toggle checked={sick} onChange={setSick}>
            חולה
          </Toggle>
          <Toggle checked={backPain} onChange={setBackPain}>
            כאב גב
          </Toggle>
        </div>
      </div>

      <div className={`day-state day-${state}`}>
        <div className="field">
          <span className="field-label">
            מצב היום{override && override !== auto ? ` (המלצה: ${dayStateLabel[auto]})` : ''}
          </span>
          <Segmented<DayState>
            ariaLabel="מצב היום"
            value={state}
            onChange={(v) => v && setOverride(v === auto ? null : v)}
            options={(['green', 'yellow', 'red'] as DayState[]).map((v) => ({ value: v, label: dayStateLabel[v], className: `seg-${v}` }))}
          />
        </div>
        <p className="day-rule">{dayStateRule[state]}</p>
      </div>

      <button type="button" className="btn btn-primary btn-block btn-xl" onClick={start} disabled={busy}>
        התחל אימון
      </button>
    </div>
  );
}
