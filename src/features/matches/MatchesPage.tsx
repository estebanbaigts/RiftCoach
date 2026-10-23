import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { href, navigate } from "../../app/router";
import { EmptyState, ResultBadge } from "../../components/ui";
import { QUEUES, ROLES } from "../../domain/model";
import { useI18n } from "../../i18n";
import { formatDate, formatDuration } from "../../lib/format";
import { applyFilters, DEFAULT_FILTERS, isPartial, type MatchFilters } from "./filters";

export function MatchesPage() {
  const { t, locale } = useI18n();
  const { matches } = useAppData();
  const [f, setF] = useState<MatchFilters>(DEFAULT_FILTERS);
  const search = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => applyFilters(matches, f), [matches, f]);
  const set = <K extends keyof MatchFilters>(k: K, v: MatchFilters[K]) => setF((x) => ({ ...x, [k]: v }));

  // "/" focuses search, as in most desktop list views.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === "/" && target?.tagName !== "INPUT" && target?.tagName !== "SELECT") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{t("matches.title")}</h1>
          <p aria-live="polite">{t("matches.count", { shown: shown.length, total: matches.length })}</p>
        </div>
      </header>

      <div className="toolbar" role="search">
        <label className="field grow">
          <span>
            {t("matches.search")} <kbd className="faint">/</kbd>
          </span>
          <input ref={search} className="input" type="search" value={f.query} maxLength={40} onChange={(e) => set("query", e.target.value)} />
        </label>
        <label className="field">
          <span>{t("matches.filter.result")}</span>
          <select className="select" value={f.result} onChange={(e) => set("result", e.target.value as MatchFilters["result"])}>
            <option value="all">{t("matches.filter.all")}</option>
            {(["win", "loss", "remake"] as const).map((r) => (
              <option key={r} value={r}>
                {t(`result.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("matches.filter.queue")}</span>
          <select className="select" value={f.queue} onChange={(e) => set("queue", e.target.value as MatchFilters["queue"])}>
            <option value="all">{t("matches.filter.all")}</option>
            {QUEUES.map((q) => (
              <option key={q} value={q}>
                {t(`queue.${q}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("matches.filter.role")}</span>
          <select className="select" value={f.role} onChange={(e) => set("role", e.target.value as MatchFilters["role"])}>
            <option value="all">{t("matches.filter.all")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
            <option value="none">{t("role.none")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("matches.sort")}</span>
          <select className="select" value={f.sort} onChange={(e) => set("sort", e.target.value as MatchFilters["sort"])}>
            <option value="date">{t("matches.sort.date")}</option>
            <option value="duration">{t("matches.sort.duration")}</option>
            <option value="kda">{t("matches.sort.kda")}</option>
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            action={
              <button type="button" className="btn" onClick={() => setF(DEFAULT_FILTERS)}>
                {t("matches.reset")}
              </button>
            }
          >
            {t("matches.empty")}
          </EmptyState>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="matches">
            <thead>
              <tr>
                <th scope="col">{t("matches.col.result")}</th>
                <th scope="col">{t("matches.col.champion")}</th>
                <th scope="col">{t("matches.col.mode")}</th>
                <th scope="col">{t("matches.col.kda")}</th>
                <th scope="col">{t("matches.col.cs")}</th>
                <th scope="col">{t("matches.col.duration")}</th>
                <th scope="col">{t("matches.col.date")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr
                  key={m.id}
                  tabIndex={0}
                  aria-label={`${t(`result.${m.result}`)} · ${m.champion} · ${formatDate(m.playedAt, locale)}`}
                  onClick={() => navigate({ name: "match", id: m.id })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ name: "match", id: m.id });
                    }
                  }}
                >
                  <td>
                    <span className="result-cell">
                      <span className={`result-bar ${m.result}`} aria-hidden />
                      <ResultBadge result={m.result} />
                    </span>
                  </td>
                  <td>
                    <a href={href({ name: "match", id: m.id })} tabIndex={-1} style={{ color: "inherit", textDecoration: "none", fontWeight: 560 }}>
                      {m.champion}
                    </a>{" "}
                    <span className="faint">{m.role ? t(`role.${m.role}`) : ""}</span>
                    {isPartial(m) && (
                      <>
                        {" "}
                        <span className="badge badge-warn" title={t("matches.partial.help")}>
                          {t("matches.partial")}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="muted">{t(`queue.${m.queue}`)}</td>
                  <td>
                    {m.kills} / {m.deaths} / {m.assists}
                  </td>
                  <td>{m.cs ?? "—"}</td>
                  <td>{formatDuration(m.durationSec)}</td>
                  <td className="muted">{formatDate(m.playedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
