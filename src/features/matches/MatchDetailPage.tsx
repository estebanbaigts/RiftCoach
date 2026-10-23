import { useEffect, useMemo } from "react";
import { useAppData } from "../../app/AppData";
import { href, navigate } from "../../app/router";
import { IconBack } from "../../components/Icons";
import { EmptyState, ResultBadge } from "../../components/ui";
import { postGameReview, type ReviewVerdict } from "../../domain/coach/postGame";
import { METRICS } from "../../domain/metrics";
import { useI18n } from "../../i18n";
import { formatDate, formatDuration, formatMetric, formatNumber } from "../../lib/format";
import { isPartial } from "./filters";

const VERDICT_CLASS: Record<ReviewVerdict, string> = {
  better: "badge badge-win",
  worse: "badge badge-loss",
  similar: "badge",
  insufficient: "badge",
  "not-applicable": "badge",
};

export function MatchDetailPage({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { matches, mode } = useAppData();
  const match = matches.find((m) => m.id === id);
  const review = useMemo(() => (match ? postGameReview(match, matches) : []), [match, matches]);
  const baselineN = Math.max(0, ...review.map((r) => r.baselineN));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate({ name: "matches" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const back = (
    <a className="btn btn-ghost btn-sm" href={href({ name: "matches" })} style={{ justifySelf: "start", textDecoration: "none" }}>
      <IconBack /> {t("detail.back")} <kbd className="faint">Esc</kbd>
    </a>
  );

  if (!match) {
    return (
      <div className="page">
        {back}
        <div className="card">
          <EmptyState>{t("detail.notFound")}</EmptyState>
        </div>
      </div>
    );
  }

  const n = (v: number | null) => (v === null ? "—" : formatNumber(v, locale));

  return (
    <div className="page">
      {back}
      <header className="page-head">
        <div>
          <h1>
            {match.champion} <span className="muted" style={{ fontWeight: 400 }}>{match.role ? t(`role.${match.role}`) : ""}</span>
          </h1>
          <p>
            {t(`queue.${match.queue}`)} · {formatDate(match.playedAt, locale)} · {formatDuration(match.durationSec)}
          </p>
        </div>
        <ResultBadge result={match.result} />
      </header>

      {isPartial(match) && <p className="notice notice-warn">{t("matches.partial.help")}</p>}

      <section className="card">
        <div className="card-head">
          <h2>{t("detail.stats")}</h2>
        </div>
        <dl className="stat-list">
          <div>
            <dt>{t("matches.col.kda")}</dt>
            <dd>
              {match.kills} / {match.deaths} / {match.assists}
            </dd>
          </div>
          <div>
            <dt>{t("metric.kda")}</dt>
            <dd>{formatNumber(METRICS.kda.perGame!(match), locale, 2)}</dd>
          </div>
          <div>
            <dt>{t("matches.col.cs")}</dt>
            <dd>{n(match.cs)}</dd>
          </div>
          <div>
            <dt>{t("detail.vision")}</dt>
            <dd>{n(match.visionScore)}</dd>
          </div>
          <div>
            <dt>{t("detail.gold")}</dt>
            <dd>{n(match.goldEarned)}</dd>
          </div>
          <div>
            <dt>{t("detail.damage")}</dt>
            <dd>{n(match.damageToChampions)}</dd>
          </div>
        </dl>
      </section>

      {match.result !== "remake" && (
        <section className="card" aria-labelledby="review-title">
          <div className="card-head">
            <h2 id="review-title">{t("detail.review")}</h2>
            {mode === "demo" && <span className="badge badge-warn">{t("detail.review.simulated")}</span>}
          </div>
          <p className="muted" style={{ marginBottom: 8 }}>
            {t("detail.review.help", { n: baselineN })}
          </p>
          {review.map((line) => (
            <div className="review-row" key={line.metric}>
              <span>{t(`metric.${line.metric}` as const)}</span>
              <span className="num" style={{ fontWeight: 600 }}>
                {formatMetric(line.metric, line.value, locale)}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className={VERDICT_CLASS[line.verdict]}>{t(`detail.review.${line.verdict}`)}</span>
                {line.baselineMean !== null && line.verdict !== "not-applicable" && (
                  <span className="faint num">{t("detail.review.usual", { value: formatMetric(line.metric, line.baselineMean, locale) })}</span>
                )}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
