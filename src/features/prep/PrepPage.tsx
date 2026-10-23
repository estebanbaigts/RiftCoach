import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { EmptyState, Segmented } from "../../components/ui";
import { computeMetric } from "../../domain/metrics";
import { ROLES, type Role } from "../../domain/model";
import { byChampion } from "../../domain/stats";
import { useI18n } from "../../i18n";
import { formatDate, formatMetric, formatPercent } from "../../lib/format";
import { ROLE_PREP } from "./content";

export function PrepPage() {
  const { t, locale } = useI18n();
  const { matches } = useAppData();
  const mostPlayedRole = useMemo<Role>(() => {
    const counts = new Map<Role, number>();
    for (const m of matches) if (m.role) counts.set(m.role, (counts.get(m.role) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "MIDDLE";
  }, [matches]);
  const [role, setRole] = useState<Role>(mostPlayedRole);

  const champions = useMemo(() => byChampion(matches.filter((m) => m.role === role)), [matches, role]);
  const [champion, setChampion] = useState<string>("");
  const selected = champions.find((c) => c.key === champion) ?? champions[0];
  const games = useMemo(() => (selected ? matches.filter((m) => m.champion === selected.key && m.role === role) : []), [matches, selected, role]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{t("prep.title")}</h1>
          <p>{t("prep.intro")}</p>
        </div>
        <Segmented<Role> label={t("matches.filter.role")} value={role} onChange={(r) => (setRole(r), setChampion(""))} options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} />
      </header>

      <p className="notice">{t("prep.staticNote")}</p>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-head">
            <h2>{t("prep.yourStats")}</h2>
            {champions.length > 0 && (
              <label className="field" style={{ gridAutoFlow: "column", alignItems: "center" }}>
                <span>{t("prep.pickChampion")}</span>
                <select className="select" value={selected?.key ?? ""} onChange={(e) => setChampion(e.target.value)}>
                  {champions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.key} ({c.games})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {!selected ? (
            <EmptyState>{t("prep.noGames")}</EmptyState>
          ) : (
            <dl className="stat-list">
              <div>
                <dt>{t("metric.games")}</dt>
                <dd>{selected.games}</dd>
              </div>
              <div>
                <dt>{t("metric.winrate")}</dt>
                <dd>{selected.winrate.rate === null ? "—" : formatPercent(selected.winrate.rate, locale)}</dd>
              </div>
              <div>
                <dt>{t("metric.kda")}</dt>
                <dd>{formatMetric("kda", selected.kda, locale)}</dd>
              </div>
              <div>
                <dt>{t("metric.csPerMin")}</dt>
                <dd>{formatMetric("csPerMin", computeMetric("csPerMin", games).value, locale)}</dd>
              </div>
              <div>
                <dt>{t("metric.deathsPer10")}</dt>
                <dd>{formatMetric("deathsPer10", computeMetric("deathsPer10", games).value, locale)}</dd>
              </div>
              <div>
                <dt>{t("matches.col.date")}</dt>
                <dd style={{ fontSize: "var(--fs-14)" }}>{games[0] ? formatDate(games[0].playedAt, locale) : "—"}</dd>
              </div>
            </dl>
          )}
          {selected && selected.games < 10 && <p className="kpi-meta" style={{ marginTop: 12 }}>{t("coach.quality.insufficient")}</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>{t("prep.options")}</h2>
            <span className="muted">{t(`role.${role}`)}</span>
          </div>
          <div className="grid">
            {ROLE_PREP[role].map((o) => (
              <div key={o.title.en} className="goal-box">
                <strong>{o.title[locale]}</strong>
                <p>{o.body[locale]}</p>
                <p className="muted" style={{ fontSize: "var(--fs-13)" }}>
                  <span className="kicker">{t("prep.tradeoffs")} · </span>
                  {o.tradeoffs[locale]}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
