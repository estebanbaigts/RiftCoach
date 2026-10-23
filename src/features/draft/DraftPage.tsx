import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { EmptyState, Segmented } from "../../components/ui";
import { generateDemoAggregates } from "../../domain/demo/aggregates";
import { championsForRole, countersOf, recommendPicks, type CounterEntry, type PickOption, type SortMode } from "../../domain/draft/recommend";
import { ROLES, type Role } from "../../domain/model";
import { useI18n, type MessageKey } from "../../i18n";
import { formatMetricDelta, formatPercent } from "../../lib/format";

// Demo mode only: synthetic, deterministic population statistics (docs/RIOT_COMPLIANCE.md F17).
const DATASET = generateDemoAggregates();

export function DraftPage() {
  const { t, locale } = useI18n();
  const { matches } = useAppData();
  const mainRole = useMemo<Role>(() => {
    const counts = new Map<Role, number>();
    for (const m of matches) if (m.role) counts.set(m.role, (counts.get(m.role) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "MIDDLE";
  }, [matches]);

  const [role, setRole] = useState<Role>(mainRole);
  const [opponent, setOpponent] = useState<string>("");
  const [bans, setBans] = useState<string[]>([]);
  const [mode, setMode] = useState<SortMode>("balanced");

  const pool = useMemo(() => championsForRole(DATASET, role), [role]);
  const options = useMemo(
    () => recommendPicks({ dataset: DATASET, role, opponent: opponent || null, bans, history: matches, mode }),
    [role, opponent, bans, matches, mode],
  );
  const counters = useMemo(() => (opponent ? countersOf(DATASET, role, opponent, 4) : null), [role, opponent]);

  const changeRole = (r: Role) => {
    setRole(r);
    setOpponent("");
    setBans([]);
  };
  const toggleBan = (c: string) => setBans((b) => (b.includes(c) ? b.filter((x) => x !== c) : [...b, c]));
  const pct = (v: number) => formatPercent(v, locale, 1);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{t("draft.title")}</h1>
          <p>{t("draft.intro")}</p>
        </div>
        <span className="badge badge-warn">{t("draft.demoData")}</span>
      </header>

      <p className="notice notice-warn">
        <strong>{t("draft.demoData")}.</strong> {t("draft.demoData.detail")} {t("draft.simulated")}
      </p>

      <section className="card grid" style={{ gap: 16 }} aria-label={t("draft.title")}>
        <div className="form-row" style={{ justifyContent: "space-between" }}>
          <div className="field">
            <span>{t("draft.role")}</span>
            <Segmented<Role> label={t("draft.role")} value={role} onChange={changeRole} options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} />
          </div>
          <label className="field">
            <span>{t("draft.opponent")}</span>
            <select className="select" value={opponent} onChange={(e) => setOpponent(e.target.value)}>
              <option value="">{t("draft.opponent.unknown")}</option>
              {pool
                .filter((c) => !bans.includes(c))
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </label>
          <div className="field">
            <span>{t("draft.sort")}</span>
            <Segmented<SortMode>
              label={t("draft.sort")}
              value={mode}
              onChange={setMode}
              options={(["balanced", "matchup", "comfort"] as const).map((m) => ({ value: m, label: t(`draft.sort.${m}`) }))}
            />
          </div>
        </div>
        <div className="field">
          <span>
            {t("draft.bans")} <span className="faint">· {t("draft.bans.help")}</span>
          </span>
          <div className="chips" role="group" aria-label={t("draft.bans")}>
            {pool
              .filter((c) => c !== opponent)
              .map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={bans.includes(c)} onClick={() => toggleBan(c)}>
                  {c}
                </button>
              ))}
          </div>
        </div>
      </section>

      <div className="draft-layout">
        <section aria-labelledby="opts-title" className="grid">
          <h2 id="opts-title" className="section-title">
            {t("draft.options")} {opponent && <span className="faint">· {t("draft.vs", { opponent })}</span>}
          </h2>
          {options.length === 0 ? (
            <div className="card">
              <EmptyState>{t("draft.options.none")}</EmptyState>
            </div>
          ) : (
            options.map((o, i) => <PickCard key={o.champion} option={o} rank={i + 1} pct={pct} />)
          )}
        </section>

        <aside className="grid" aria-labelledby="counters-title" style={{ alignContent: "start" }}>
          <h2 id="counters-title" className="section-title">
            {opponent ? t("draft.counters", { opponent }) : t("draft.counters", { opponent: "…" })}
          </h2>
          <div className="card">
            {!counters ? (
              <EmptyState>{t("draft.counters.none")}</EmptyState>
            ) : (
              <>
                <CounterList title={t("draft.counters.best")} entries={counters.best} pct={pct} tone="win" />
                <CounterList title={t("draft.counters.worst")} entries={counters.worst} pct={pct} tone="loss" />
              </>
            )}
          </div>
          <div className="card">
            <p className="kicker" style={{ marginBottom: 6 }}>
              {t("draft.method")}
            </p>
            <p className="muted" style={{ fontSize: "var(--fs-13)" }}>
              {t("draft.method.text")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

const TAG_CLASS: Record<string, string> = {
  "strong-matchup": "badge badge-win",
  "weak-matchup": "badge badge-loss",
  "low-sample": "badge badge-warn",
  comfort: "badge badge-accent",
  untested: "badge",
  "high-winrate": "badge",
};

function PickCard({ option: o, rank, pct }: { option: PickOption; rank: number; pct: (v: number) => string }) {
  const { t, locale } = useI18n();
  return (
    <article className="card insight" aria-label={o.champion}>
      <div className="insight-head">
        <div>
          <p className="kicker">#{rank}</p>
          <h3 style={{ fontSize: "var(--fs-20)" }}>{o.champion}</h3>
        </div>
        <span className="badge">
          <span className="conf" aria-hidden>
            {[1, 2, 3].map((i) => (
              <i key={i} className={i <= (o.confidence === "high" ? 3 : o.confidence === "medium" ? 2 : 1) ? "on" : ""} />
            ))}
          </span>
          {t("coach.confidence.label", { level: t(`coach.confidence.${o.confidence}`) })}
        </span>
      </div>

      <div className="evidence">
        <div>
          <div className="label">{t("draft.matchup")}</div>
          {o.matchup ? (
            <>
              <div className="value">{pct(o.matchup.rate)}</div>
              <div className="n">
                {t("metric.sample", { n: o.matchup.games })} · {t("draft.matchup.adjusted", { value: pct(o.matchup.adjusted) })}
                {o.matchup.sufficient && <> ({formatMetricDelta("winrate", o.matchup.delta, locale)})</>}
              </div>
            </>
          ) : (
            <div className="n" style={{ marginTop: 8 }}>
              {t("draft.matchup.none")}
            </div>
          )}
        </div>
        <div>
          <div className="label">{t("draft.overall")}</div>
          <div className="value">{pct(o.overall.rate)}</div>
          <div className="n">
            {t("metric.sample", { n: o.overall.games })}
          </div>
        </div>
        <div>
          <div className="label">{t("draft.personal")}</div>
          {o.personal.games ? (
            <>
              <div className="value">{o.personal.games}</div>
              <div className="n">{t("draft.personal.value", { n: o.personal.games, games: o.personal.games, rate: pct(o.personal.rate ?? 0) })}</div>
            </>
          ) : (
            <div className="n" style={{ marginTop: 8 }}>
              {t("draft.personal.none")}
            </div>
          )}
        </div>
      </div>

      {o.matchup && !o.matchup.sufficient && <p className="kpi-meta">{t("draft.matchup.insufficient", { n: o.matchup.games })}</p>}
      <div className="form-row" style={{ gap: 6 }}>
        {o.tags.map((tag) => (
          <span key={tag} className={TAG_CLASS[tag] ?? "badge"}>
            {t(`draft.tag.${tag}` as MessageKey)}
          </span>
        ))}
      </div>
    </article>
  );
}

function CounterList({ title, entries, pct, tone }: { title: string; entries: CounterEntry[]; pct: (v: number) => string; tone: "win" | "loss" }) {
  const { t } = useI18n();
  return (
    <div style={{ marginBottom: 16 }}>
      <p className="kicker" style={{ marginBottom: 6 }}>
        {title}
      </p>
      <ul className="barlist">
        {entries.map((e) => (
          <li key={e.champion}>
            <div className="barlist-head">
              <span>{e.champion}</span>
              <span className="num" style={{ color: tone === "win" ? "var(--win)" : "var(--loss)", fontWeight: 600 }}>
                {pct(e.adjusted)} <span className="faint">· {t("metric.sample", { n: e.games })}</span>
              </span>
            </div>
            <div className="bar" aria-hidden>
              <span style={{ width: `${Math.max(4, Math.min(100, (e.adjusted - 0.4) * 500))}%`, background: tone === "win" ? "var(--win)" : "var(--loss)" }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
