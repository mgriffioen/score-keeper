import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ bar -- */
export function TopBar(props: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar__slot">{props.left}</div>
      <div className="topbar__title">
        {props.title}
        {props.subtitle ? <span className="topbar__subtitle">{props.subtitle}</span> : null}
      </div>
      <div className="topbar__slot topbar__slot--end">{props.right}</div>
    </header>
  );
}

export function BarButton(props: {
  onClick: () => void;
  children: ReactNode;
  muted?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={props.muted ? 'iconbtn iconbtn--muted' : 'iconbtn'}
      onClick={props.onClick}
      aria-label={props.label}
    >
      {props.children}
    </button>
  );
}

/* --------------------------------------------------------------- fields -- */
/**
 * A label + control pair. Deliberately a <div> rather than a <label>: several
 * of the controls here are groups of buttons, and a wrapping label would
 * forward its click into one of them. Controls carry their own aria-label.
 */
export function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="label">{props.label}</span>
      {props.children}
      {props.hint ? <span className="hint">{props.hint}</span> : null}
    </div>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={props.ariaLabel}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__option"
          aria-pressed={props.value === option.value}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper(props: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, step = 1 } = props;
  // Held as text so the field can be empty mid-edit instead of snapping to 0.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    props.onChange(clamp(parsed, min, max));
  };

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={() => props.onChange(clamp(props.value - step, min, max))}
        disabled={props.value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <input
        className="input tabular"
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        aria-label={props.ariaLabel}
        value={draft ?? String(props.value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
      />
      <button
        type="button"
        className="stepper__btn"
        onClick={() => props.onChange(clamp(props.value + step, min, max))}
        disabled={props.value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export function SwitchRow(props: {
  title: string;
  sub?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="switchrow"
      aria-pressed={props.checked}
      onClick={() => props.onChange(!props.checked)}
    >
      <span className="switchrow__text">
        <span className="switchrow__title">{props.title}</span>
        {props.sub ? <span className="switchrow__sub">{props.sub}</span> : null}
      </span>
      <span className="switch" aria-hidden="true" />
    </button>
  );
}

/* --------------------------------------------------------------- sheets -- */
export function Sheet(props: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  bare?: boolean;
  /** "Close" reads as "done" — data-entry sheets should say "Cancel". */
  closeLabel?: string;
}) {
  const { open, onClose } = props;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!props.open) return null;

  return (
    <>
      <div className="backdrop" onClick={props.onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="sheet__head">
          <div>
            <div className="sheet__title">{props.title}</div>
            {props.subtitle ? <div className="sheet__sub">{props.subtitle}</div> : null}
          </div>
          <button type="button" className="iconbtn iconbtn--muted" onClick={props.onClose}>
            {props.closeLabel ?? 'Close'}
          </button>
        </div>
        {props.bare ? props.children : <div className="sheet__body">{props.children}</div>}
        {props.footer ? <div className="sheet__foot">{props.footer}</div> : null}
      </div>
    </>
  );
}

/** A yes/no sheet, so destructive taps always need a second one. */
export function ConfirmSheet(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={props.open} title={props.title} onClose={props.onCancel}>
      <p style={{ margin: 0, color: 'var(--muted)' }}>{props.message}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn--ghost btn--grow" onClick={props.onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={props.destructive ? 'btn btn--danger btn--grow' : 'btn btn--primary btn--grow'}
          onClick={props.onConfirm}
        >
          {props.confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

/* --------------------------------------------------------------- toasts -- */
type ToastListener = (message: string) => void;
const toastListeners = new Set<ToastListener>();

export function toast(message: string): void {
  for (const listener of toastListeners) listener(message);
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const listener: ToastListener = (next) => {
      setMessage(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(null), 2600);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (message === null) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

/* ---------------------------------------------------------------- misc -- */
export function EmptyState(props: { art: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden="true">
        {props.art}
      </div>
      <div className="empty__title">{props.title}</div>
      {props.children}
    </div>
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
