import { useId, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";

export function Kpi({ label, value, meta, definition }: { label: string; value: ReactNode; meta?: ReactNode; definition: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const id = useId();
  return (
    <section className="card kpi" aria-label={label}>
      <div className="kpi-label">
        <span>{label}</span>
        <button
          type="button"
          className="info-btn"
          aria-expanded={open}
          aria-controls={id}
          aria-label={t("metric.definition", { label })}
          onClick={() => setOpen((o) => !o)}
        >
          i
        </button>
      </div>
      <div className="kpi-value">{value}</div>
      {meta && <div className="kpi-meta">{meta}</div>}
      {open && (
        <p id={id} className="definition" role="note">
          {definition}
        </p>
      )}
    </section>
  );
}
