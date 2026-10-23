import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Confidence } from "../domain/coach/engine";
import type { MatchResult } from "../domain/model";
import { useI18n } from "../i18n";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ResultBadge({ result }: { result: MatchResult }) {
  const { t } = useI18n();
  const cls = result === "win" ? "badge badge-win" : result === "loss" ? "badge badge-loss" : "badge";
  return (
    <span className={cls}>
      <span className="dot" aria-hidden />
      {t(`result.${result}`)}
    </span>
  );
}

export function ConfidenceMeter({ level }: { level: Confidence }) {
  const { t } = useI18n();
  const on = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className="badge" title={t("coach.confidence")}>
      <span className="conf" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= on ? "on" : ""} />
        ))}
      </span>
      {t("coach.confidence.label", { level: t(`coach.confidence.${level}`) })}
    </span>
  );
}

export function BarList({ items }: { items: readonly { key: string; label: ReactNode; value: number; max: number; meta: ReactNode }[] }) {
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li key={it.key}>
          <div className="barlist-head">
            <span>{it.label}</span>
            <span className="muted num">{it.meta}</span>
          </div>
          <div className="bar" aria-hidden>
            <span style={{ width: `${Math.round((it.value / Math.max(1, it.max)) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <p>{children}</p>
      {action}
    </div>
  );
}

/* ---------- Toasts: immediate, polite feedback for actions ---------- */

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="visually-hidden">
        {msg}
      </div>
      {msg && (
        <div className="toast" aria-hidden>
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
