import { useEffect, useState } from 'react';
import { ensureSeeded, useSessions, useSettings } from './db';
import { RestTimerProvider } from './components/RestTimer';
import { Icon } from './components/ui';
import { go, useRoute } from './lib/router';
import { unlockAudio } from './lib/alerts';
import { Today } from './screens/Today';
import { StartScreen } from './screens/StartScreen';
import { SessionScreen } from './screens/SessionScreen';
import { History } from './screens/History';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { ProgramEditor } from './screens/ProgramEditor';

const tabs = [
  { key: '', label: 'היום', icon: 'today' },
  { key: 'history', label: 'היסטוריה', icon: 'history' },
  { key: 'progress', label: 'התקדמות', icon: 'progress' },
  { key: 'settings', label: 'הגדרות', icon: 'settings' },
] as const;

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();
  const settings = useSettings();
  const sessions = useSessions();

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message));
    void navigator.storage?.persist?.();
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  if (error) return <p className="empty">לא הצלחתי לפתוח את מסד הנתונים במכשיר: {error}</p>;
  if (!ready || !settings) return null;

  const [section = '', a, b] = route;
  const activeId = sessions?.find((s) => s.status === 'active')?.id;

  let screen;
  if (section === 'start' && a) screen = <StartScreen tplId={a} />;
  else if (section === 'history' && a) screen = <SessionScreen key={a} id={a} mode={a === activeId ? 'live' : 'edit'} />;
  else if (section === 'history') screen = <History />;
  else if (section === 'progress') screen = <Progress exId={a} />;
  else if (section === 'settings' && a === 'session' && b) screen = <ProgramEditor tplId={b} />;
  else if (section === 'settings') screen = <Settings />;
  else screen = <Today />;

  const tabKey = section === 'start' ? '' : section;

  return (
    <RestTimerProvider sound={settings.sound}>
      <main className="app">{screen}</main>
      <nav className="tabbar" aria-label="ניווט ראשי">
        {tabs.map((t) => {
          const on = tabKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`tab ${on ? 'on' : ''}`}
              aria-current={on ? 'page' : undefined}
              onClick={() => go(`/${t.key}`)}
            >
              <Icon name={t.icon} size={24} />
              <span>{t.label}</span>
              {t.key === '' && activeId && <span className="tab-live" aria-label="אימון פעיל" />}
            </button>
          );
        })}
      </nav>
    </RestTimerProvider>
  );
}
