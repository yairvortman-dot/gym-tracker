import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { beep, vibrate } from '../lib/alerts';
import { fmtClock } from '../lib/format';

interface TimerState {
  endAt: number;
  totalSec: number;
  label: string;
  fired: boolean;
}

interface TimerApi {
  timer: TimerState | null;
  start: (sec: number, label: string) => void;
  add: (sec: number) => void;
  stop: () => void;
}

const KEY = 'rest-timer';
const Ctx = createContext<TimerApi>({ timer: null, start: () => {}, add: () => {}, stop: () => {} });
export const useRestTimer = () => useContext(Ctx);

function load(): TimerState | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TimerState | null;
    // A timer that ended long ago (app was closed) is just cleared.
    return t && Date.now() - t.endAt < 60_000 ? t : null;
  } catch {
    return null;
  }
}

function persist(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function RestTimerProvider({ sound, children }: { sound: boolean; children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(load);
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState(false);

  const update = useCallback((t: TimerState | null) => {
    persist(t);
    setTimer(t);
  }, []);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.fired || now < timer.endAt) return;
    if (sound) beep();
    vibrate();
    setFlash(true);
    setTimeout(() => setFlash(false), 1600);
    update({ ...timer, fired: true });
  }, [now, timer, sound, update]);

  // Clear the "rest is over" bar after a while.
  useEffect(() => {
    if (!timer?.fired) return;
    const id = setTimeout(() => update(null), 15_000);
    return () => clearTimeout(id);
  }, [timer?.fired, update]);

  const api = useMemo<TimerApi>(
    () => ({
      timer,
      start: (sec, label) => {
        setNow(Date.now());
        update({ endAt: Date.now() + sec * 1000, totalSec: sec, label, fired: false });
      },
      add: (sec) => {
        if (!timer) return;
        const endAt = Math.max(Date.now(), timer.fired ? Date.now() : timer.endAt) + sec * 1000;
        update({ ...timer, endAt, totalSec: timer.totalSec + sec, fired: false });
      },
      stop: () => update(null),
    }),
    [timer, update],
  );

  const remaining = timer ? (timer.endAt - now) / 1000 : 0;

  return (
    <Ctx.Provider value={api}>
      {children}
      {flash && <div className="rest-flash" aria-hidden />}
      {timer && (
        <div className={`rest-bar ${timer.fired ? 'is-over' : ''}`} role="timer" aria-live="polite">
          <div
            className="rest-progress"
            style={{ inlineSize: `${timer.fired ? 100 : Math.min(100, 100 - (remaining / timer.totalSec) * 100)}%` }}
          />
          <div className="rest-main">
            <span className="rest-time num">{timer.fired ? '0:00' : fmtClock(remaining)}</span>
            <span className="rest-label">{timer.fired ? 'המנוחה נגמרה, לסט הבא' : timer.label}</span>
          </div>
          <div className="rest-actions">
            <button type="button" className="rest-btn num" aria-label="הוסף 30 שניות" onClick={() => api.add(30)}>
              <bdi dir="ltr">+30</bdi>
            </button>
            <button type="button" className="rest-btn" onClick={api.stop}>
              {timer.fired ? 'סגור' : 'דלג'}
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
