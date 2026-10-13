import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The app's own "are you sure?" dialog. The browser's confirm() is unreliable: some embedded
 * browsers block it and silently answer "no", which looks like a button that does nothing.
 */
export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button, for deleting things. */
  danger?: boolean;
}

type Ask = (r: ConfirmRequest) => Promise<boolean>;

const Ctx = createContext<Ask>(async () => false);

/** `if (!(await confirm({ ... }))) return;` */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<(ConfirmRequest & { resolve: (v: boolean) => void }) | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const ask = useCallback<Ask>((r) => new Promise<boolean>((resolve) => setReq({ ...r, resolve })), []);

  const answer = (v: boolean) => {
    req?.resolve(v);
    setReq(null);
  };

  useEffect(() => {
    if (!req) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        req.resolve(false);
        setReq(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      {req && (
        <div className="confirm-backdrop" onClick={() => answer(false)}>
          <div
            className="confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={req.body ? 'confirm-body' : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="confirm-title">
              {req.title}
            </h2>
            {req.body && (
              <p id="confirm-body" className="confirm-body">
                {req.body}
              </p>
            )}
            <div className="confirm-actions">
              <button
                ref={confirmRef}
                type="button"
                className={`btn btn-block ${req.danger ? 'btn-danger-solid' : 'btn-primary'}`}
                onClick={() => answer(true)}
              >
                {req.confirmLabel}
              </button>
              <button type="button" className="btn btn-quiet btn-block" onClick={() => answer(false)}>
                {req.cancelLabel ?? 'ביטול'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
