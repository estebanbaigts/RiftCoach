import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { IconArrowDown, IconArrowUp } from "../../components/Icons";
import { Kpi } from "../../components/Kpi";
import { LineChart } from "../../components/LineChart";
import { BarList, EmptyState, Segmented } from "../../components/ui";
import type { MetricId } from "../../domain/metrics";
import { byChampion, byRole, comparePeriods, inLastDays, rollingSeries, summarize, type PeriodComparison } from "../../domain/stats";
import { useI18n } from "../../i18n";
import { formatDay, formatDuration, formatMetric, formatMetricDelta, formatPercent } from "../../lib/format";

type Period = "7" | "30" | "all";
const PROGRESS_METRICS: readonly MetricId[] = ["winrate", "kda", "deathsPer10", "csPerMin"];

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { matches, now } = useAppData();
  const [period, setPeriod] = useState<Period>("30");
  const [trendMetric, setTrendMetric] = useState<MetricId>("winrate");

  const scoped = useMemo(() => (period === "all" ? matches : inLastDays(matches, now, Number(period))), [matches, now, period]);
  const s = useMemo(() => summarize(scoped), [scoped]);
  const champions = useMemo(() => byChampion(scoped).slice(0, 6), [scoped]);
  const roles = useMemo(() => byRole(scoped), [scoped]);
  const series = useMemo(
    () =>
      rollingSeries(matches, trendMetric, 10).map((p) => ({ x: p.index, y: p.value, label: formatDay(p.playedAt, locale) })),
    [matches, trendMetric, locale],
  );
  const progress = useMemo(
    () => [7, 30].map((days) => ({ days, rows: PROGRESS_METRICS.map((m) => comparePeriods(matches, now, days, m)) })),
    [matches, now],
  );

  const periodLabel = t(period === "all" ? "period.all" : period === "7" ? "period.7" : "period.30");
  const fm = (m: MetricId, v: number | null) => formatMetric(m, v, locale);
  const counted = s.winrate.games;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{t("dash.title")}</h1>
          <p>{periodLabel}</p>
        </div>
        <Segmented<Period>
          label={t("period.label")}
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: t("period.7") },
            { value: "30", label: t("period.30") },
            { value: "all", label: t("period.all") },
          ]}
        />
      </header>

      {counted === 0 ? (
        <div className="card">
          <EmptyState>{t("dash.empty")}</EmptyState>
        </div>
      ) : (
        <>
          <div className="grid grid-kpi">
            <Kpi
              label={t("metric.games")}
              value={counted}
              meta={s.remakes ? t("dash.remakes", { n: s.remakes }) : periodLabel}
              definition={t("metric.games.def")}
            />
            <Kpi
              label={t("metric.winrate")}
              value={s.winrate.rate === null ? "—" : formatPercent(s.winrate.rate, locale)}
              meta={
                <>
                  {t("metric.sample", { n: s.winrate.games })}
                  {s.winrate.interval && (
                    <>
                      {" · "}
                      {t("metric.ci", { lo: formatPercent(s.winrate.interval[0], locale), hi: formatPercent(s.winrate.interval[1], locale) })}
                    </>
                  )}
                </>
              }
              definition={t("metric.winrate.def")}
            />
            <Kpi
              label={t("metric.kda")}
              value={fm("kda", s.kda.value)}
              meta={
                s.avgKills !== null
                  ? `${s.avgKills.toFixed(1)} / ${s.avgDeaths!.toFixed(1)} / ${s.avgAssists!.toFixed(1)}`
                  : t("metric.noData")
              }
              definition={t("metric.kda.def")}
            />
            <Kpi
              label={t("metric.csPerMin")}
              value={fm("csPerMin", s.csPerMin.value)}
              meta={t("metric.sampleExcluded", { n: s.csPerMin.n, excluded: s.csPerMin.excluded })}
              definition={t("metric.csPerMin.def")}
            />
            <Kpi
              label={t("metric.duration")}
              value={s.avgDurationSec === null ? "—" : formatDuration(s.avgDurationSec)}
              meta={t("metric.sample", { n: counted })}
              definition={t("metric.duration.def")}
            />
          </div>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head">
                <h2>{t("dash.trend")}</h2>
                <Segmented<MetricId>
                  label={t("dash.trend")}
                  value={trendMetric}
                  onChange={setTrendMetric}
                  options={[
                    { value: "winrate", label: t("metric.winrate") },
                    { value: "kda", label: t("metric.kda") },
                    { value: "csPerMin", label: t("metric.csPerMin") },
                  ]}
                />
              </div>
              <LineChart
                points={series}
                format={(y) => fm(trendMetric, y)}
                reference={trendMetric === "winrate" ? 0.5 : undefined}
                summary={`${t(`metric.${trendMetric}` as const)} — ${t("dash.trend.help")}`}
              />
              <p className="kpi-meta" style={{ marginTop: 8 }}>
                {t("dash.trend.help")} {t("period.all")}.
              </p>
            </section>

            <section className="card">
              <div className="card-head">
                <h2>{t("dash.progress")}</h2>
              </div>
              <div className="grid" style={{ gap: 20 }}>
                {progress.map(({ days, rows }) => (
                  <div key={days}>
                    <p className="kicker" style={{ marginBottom: 4 }}>
                      {t(days === 7 ? "period.7" : "period.30")} · {t("dash.progress.vs", { days })}
                    </p>
                    {rows.map((r) => (
                      <ProgressRow key={r.metric} row={r} />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head">
                <h2>{t("dash.champions")}</h2>
                <span className="muted">{periodLabel}</span>
              </div>
              <BarList
                items={champions.map((c) => ({
                  key: c.key,
                  label: c.key,
                  value: c.games,
                  max: champions[0]?.games ?? 1,
                  meta: `${t("metric.sample", { n: c.games })} · ${c.winrate.rate === null ? "—" : formatPercent(c.winrate.rate, locale)} · KDA ${fm("kda", c.kda)}`,
                }))}
              />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>{t("dash.roles")}</h2>
                <span className="muted">{periodLabel}</span>
              </div>
              <BarList
                items={roles.map((r) => ({
                  key: r.key,
                  label: t(`role.${r.key as "TOP"}`),
                  value: r.games,
                  max: roles[0]?.games ?? 1,
                  meta: `${t("metric.sample", { n: r.games })} · ${r.winrate.rate === null ? "—" : formatPercent(r.winrate.rate, locale)}`,
                }))}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressRow({ row }: { row: PeriodComparison }) {
  const { t, locale } = useI18n();
  const status = row.improved === null ? (row.delta === null ? "na" : "flat") : row.improved ? "better" : "worse";
  const deltaText = row.delta === null ? "" : formatMetricDelta(row.metric, row.delta, locale);
  return (
    <div className="progress-row">
      <span>
        {t(`metric.${row.metric}` as const)} <span className="faint num">· {t("metric.sample", { n: row.current.n })}</span>
      </span>
      <span className="num">{formatMetric(row.metric, row.current.value, locale)}</span>
      <span className={`delta delta-${status}`}>
        {(status === "better" || status === "worse") && (row.delta! > 0 ? <IconArrowUp /> : <IconArrowDown />)}
        {status === "na" ? t("dash.progress.na") : `${deltaText} · ${t(`dash.progress.${status}`)}`}
      </span>
    </div>
  );
}
