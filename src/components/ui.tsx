import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtNum } from '../lib/format';

const parse = (s: string): number | null => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function Stepper(props: {
  label?: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min?: number;
  max?: number;
  /** Used by +/− when the field is empty (e.g. today's target). */
  fallback?: number | null;
  placeholder?: string;
  decimal?: boolean;
  size?: 'l' | 'm';
  ariaLabel?: string;
}) {
  const { value, onChange, step, min = 0, max = 999, fallback, decimal, size = 'l' } = props;
  const [text, setText] = useState(value == null ? '' : fmtNum(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : fmtNum(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const bump = (dir: 1 | -1) => {
    const base = value ?? fallback;
    const next = base == null ? (dir > 0 ? step : min) : value == null ? base : base + dir * step;
    const v = clamp(next);
    setText(fmtNum(v));
    onChange(v);
  };

  return (
    <div className={`stepper stepper-${size}`}>
      {props.label && <div className="stepper-label">{props.label}</div>}
      <div className="stepper-row">
        <button type="button" className="step-btn" aria-label="הוסף" onClick={() => bump(1)}>
          <Icon name="plus" />
        </button>
        <input
          className="step-input num"
          dir="ltr"
          inputMode={decimal ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          aria-label={props.ariaLabel ?? (typeof props.label === 'string' ? props.label : undefined)}
          placeholder={props.placeholder}
          value={text}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onBlur={() => {
            focused.current = false;
            setText(value == null ? '' : fmtNum(value));
          }}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d.,]/g, '');
            setText(t);
            if (t === '') onChange(null);
            else {
              const n = parse(t);
              if (n != null) onChange(Math.min(max, Math.max(0, n)));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <button type="button" className="step-btn" aria-label="הפחת" onClick={() => bump(-1)}>
          <Icon name="minus" />
        </button>
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>(props: {
  options: { value: T; label: ReactNode; className?: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  /** Tapping the selected option clears it. */
  allowClear?: boolean;
  ariaLabel: string;
  size?: 's' | 'l';
}) {
  return (
    <div className={`segmented seg-${props.size ?? 'l'}`} role="radiogroup" aria-label={props.ariaLabel}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            className={`seg ${on ? 'on' : ''} ${o.className ?? ''}`}
            onClick={() => props.onChange(on && props.allowClear ? null : o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; big?: boolean }) {
  return (
    <label className={`toggle ${props.big ? 'toggle-big' : ''} ${props.checked ? 'on' : ''}`}>
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span className="toggle-box" aria-hidden>
        {props.checked && <Icon name="check" />}
      </span>
      <span className="toggle-text">{props.children}</span>
    </label>
  );
}

export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!props.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [props.open]);
  if (!props.open) return null;
  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden />
        <h2 className="sheet-title">{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}

const paths: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  today: (
    <>
      <rect x="2.5" y="9" width="3" height="6" rx="1" />
      <rect x="18.5" y="9" width="3" height="6" rx="1" />
      <rect x="5.5" y="6.5" width="3.5" height="11" rx="1" />
      <rect x="15" y="6.5" width="3.5" height="11" rx="1" />
      <path d="M9 12h6" />
    </>
  ),
  history: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="0.6" />
      <circle cx="4" cy="12" r="0.6" />
      <circle cx="4" cy="18" r="0.6" />
    </>
  ),
  progress: <path d="M3 19h18M5 15l4-4 3 3 6-7" />,
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  back: <path d="M9 6l6 6-6 6" />,
  forward: <path d="M15 6l-6 6 6 6" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
  note: <path d="M5 5h14v10l-4 4H5zM15 19v-4h4" />,
};

export function Icon({ name, size = 22 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

/** Numbers inside Hebrew text stay left-to-right. */
export const Num = ({ children }: { children: ReactNode }) => (
  <bdi className="num" dir="ltr">
    {children}
  </bdi>
);
