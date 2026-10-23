import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import { ConfidenceMeter, EmptyState, useToast } from "../../components/ui";
import { runCoach, type Insight } from "../../domain/coach/engine";
import { evaluateGoal, type GoalProgress, type GoalStatus } from "../../domain/coach/goals";
import type { MetricId } from "../../domain/metrics";
import { useI18n, type MessageKey, type Params } from "../../i18n";
import { formatMetric, formatMetricDelta, formatNumber } from "../../lib/format";

const STATUS_CLASS: Record<GoalStatus, string> = {
  collecting: "badge",
  "on-track": "badge badge-accent",
  "off-track": "badge badge-warn",
  achieved: "badge badge-win",
  missed: "badge badge-loss",
};

export function CoachPage() {
  const { t, locale } = useI18n();
  const { matches, goals, adoptGoal, removeGoal, simulateSession, mode, storageAvailable } = useAppData();
  const toast = useToast();
  const report = useMemo(() => runCoach(matches), [matches]);
  const progress = useMemo(() => goals.map((g) => evaluateGoal(g, matches)), [goals, matches]);
  const q = report.quality;
  const qualityKey: MessageKey = `coach.quality.${q.level}`;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{t("coach.title")}</h1>
          <p>{t("coach.intro")}</p>
        </div>
        {mode === "demo" && (
          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
            <button
              type="button"
              className="btn"
              onClick={() => toast(t("coach.simulate.done", { n: simulateSession() }))}
            >
              {t("coach.simulate")}
            </button>
            <span className="kpi-meta">{t("coach.simulate.help")}</span>
          </div>
        )}
      </header>

      {!storageAvailable && <p className="notice notice-warn">{t("common.storageUnavailable")}</p>}

      <section className="card" aria-labelledby="quality-title">
        <div className="card-head">
          <h2 id="quality-title">{t("coach.quality")}</h2>
          <span className={q.level === "good" ? "badge badge-accent" : "badge badge-warn"}>{t(qualityKey)}</span>
        </div>
        <p className="muted num">
          {t("coach.quality.detail", {
            n: q.countedGames,
            days: Math.round(q.spanDays),
            partial: Math.round(q.partialShare * 100),
            remakes: q.remakes,
          })}
        </p>
      </section>

      <section aria-labelledby="axes-title" className="grid">
        <h2 id="axes-title" className="section-title">
          {t("coach.axes")}
        </h2>
        <p className="notice">{t("coach.causality")}</p>
        {report.insights.length === 0 ? (
          <div className="card">
            <EmptyState>{q.level === "insufficient" ? t("coach.quality.insufficient") : t("coach.none")}</EmptyState>
          </div>
        ) : (
          report.insights.map((ins, i) => (
            <InsightCard
              key={ins.id}
              index={i + 1}
              insight={ins}
              adopted={goals.some((g) => g.insightId === ins.id)}
              onAdopt={() => {
                adoptGoal(ins);
                toast(t("coach.adopted"));
              }}
            />
          ))
        )}
      </section>

      <section aria-labelledby="goals-title" className="grid">
        <h2 id="goals-title" className="section-title">
          {t("coach.goals")}
        </h2>
        {progress.length === 0 ? (
          <div className="card">
            <EmptyState>{t("coach.goals.empty")}</EmptyState>
          </div>
        ) : (
          <div className="grid grid-3">
            {progress.map((p) => (
              <GoalCard key={p.goal.id} progress={p} onRemove={() => removeGoal(p.goal.id)} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function useGoalLabel() {
  const { t, locale } = useI18n();
  return (metric: MetricId, comparator: "atMost" | "atLeast", target: number, horizon: number) =>
    t(`coach.goal.${comparator}`, { metric: t(`metric.${metric}` as const), target: formatMetric(metric, target, locale), horizon });
}

function InsightCard({ insight, index, adopted, onAdopt }: { insight: Insight; index: number; adopted: boolean; onAdopt: () => void }) {
  const { t, locale } = useI18n();
  const goalLabel = useGoalLabel();
  const ev = (label: string) => insight.evidence.find((e) => e.label === label);
  const fmt = (label: string) => {
    const e = ev(label);
    return e ? formatMetric(e.metric, e.value, locale) : "—";
  };

  const params: Params = { ...insight.params, metric: t(`metric.${insight.metric}` as const).toLowerCase() };
  if (insight.rule === "trend") Object.assign(params, { recent: fmt("recent"), baseline: fmt("baseline") });
  if (insight.rule === "tilt") Object.assign(params, { after: fmt("afterStreak"), others: fmt("otherGames") });
  if (insight.rule === "pool") Object.assign(params, { focus: fmt("focus") });

  return (
    <article className="card insight" aria-labelledby={`ins-${insight.id}`}>
      <div className="insight-head">
        <div>
          <p className="kicker">#{index}</p>
          <h3 id={`ins-${insight.id}`}>{t(`metric.${insight.metric}` as const)}</h3>
        </div>
        <ConfidenceMeter level={insight.confidence} />
      </div>

      <div>
        <p className="kicker">{t("coach.observation")}</p>
        <p>{t(insight.observationKey as MessageKey, params)}</p>
      </div>

      <div>
        <p className="kicker" style={{ marginBottom: 6 }}>
          {t("coach.evidence")}
        </p>
        <div className="evidence">
          {insight.evidence.map((e) => (
            <div key={e.label}>
              <div className="label">{t(`coach.ev.${e.label}` as MessageKey)}</div>
              <div className="value">{formatMetric(e.metric, e.value, locale)}</div>
              <div className="n">{t("metric.sample", { n: e.n })}</div>
            </div>
          ))}
        </div>
        <p className="kpi-meta" style={{ marginTop: 6 }}>
          {t("coach.effect", { value: formatNumber(insight.effect, locale, 2) })} · {t(`metric.${insight.metric}.def` as MessageKey)}
        </p>
      </div>

      <div className="goal-box">
        <p className="kicker">{t("coach.goal")}</p>
        <div className="row">
          <strong>{goalLabel(insight.goal.metric, insight.goal.comparator, insight.goal.target, insight.goal.horizonGames)}</strong>
          <button type="button" className={adopted ? "btn btn-sm" : "btn btn-primary btn-sm"} disabled={adopted} onClick={onAdopt}>
            {adopted ? t("coach.adopted") : t("coach.adopt")}
          </button>
        </div>
        <p className="muted" style={{ fontSize: "var(--fs-13)" }}>
          <span className="kicker">{t("coach.tracking")} · </span>
          {t(insight.trackingKey as MessageKey, { horizon: insight.goal.horizonGames })}
        </p>
      </div>
    </article>
  );
}

function GoalCard({ progress, onRemove, locale }: { progress: GoalProgress; onRemove: () => void; locale: "fr" | "en" }) {
  const { t } = useI18n();
  const goalLabel = useGoalLabel();
  const { goal, tracked, value, status, improvement } = progress;
  const pct = Math.round((tracked / goal.horizonGames) * 100);
  return (
    <article className="card insight" aria-label={t(`metric.${goal.metric}` as const)}>
      <div className="insight-head">
        <h3>{t(`metric.${goal.metric}` as const)}</h3>
        <span className={STATUS_CLASS[status]}>{t(`coach.status.${status}`)}</span>
      </div>
      <p>{goalLabel(goal.metric, goal.comparator, goal.target, goal.horizonGames)}</p>
      <div>
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal.horizonGames} aria-valuenow={tracked} aria-label={t("coach.goals.progress", { tracked, horizon: goal.horizonGames })}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="kpi-meta" style={{ marginTop: 6 }}>
          {t("coach.goals.progress", { tracked, horizon: goal.horizonGames })}
        </p>
      </div>
      <p className="muted num" style={{ fontSize: "var(--fs-13)" }}>
        {t("coach.goals.baseline", { value: formatMetric(goal.metric, goal.baseline, locale) })} · {t("coach.goals.current", { value: formatMetric(goal.metric, value, locale) })}
        {improvement !== null && value !== null && goal.baseline !== null && tracked > 0 && (
          <span className={improvement >= 0 ? "delta delta-better" : "delta delta-worse"}>
            {" "}
            ({formatMetricDelta(goal.metric, value - goal.baseline, locale)})
          </span>
        )}
      </p>
      <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={onRemove}>
        {t("coach.goals.remove")}
      </button>
    </article>
  );
}
