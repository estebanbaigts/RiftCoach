import { afterLossStreakFlags, computeMetric, METRICS, type MetricId } from "../metrics";
import { isCounted, RANKED_QUEUES, type Match } from "../model";
import { mean, stdev, winrateStat } from "../stats";

/**
 * Deterministic coaching engine. Rules are explicit, thresholds are constants below,
 * and every insight carries the evidence it is based on. Output is language-neutral
 * (i18n keys + params) so the engine never depends on the UI.
 *
 * Principles:
 *  - no insight below MIN_GAMES counted games;
 *  - confidence reflects both sample size and effect size;
 *  - observations describe co-occurrence, never causation;
 *  - at most MAX_INSIGHTS axes, one per metric.
 */

export const MIN_GAMES = 10;
export const LIMITED_GAMES = 25;
export const MAX_INSIGHTS = 3;
export const TREND_RECENT = 15;
export const TREND_BASELINE = 40;
export const TREND_MIN_RECENT = 10;
export const TREND_MIN_BASELINE = 15;
export const TREND_MIN_EFFECT = 0.35;
/** Practical significance: the recent mean must differ from baseline by at least 5 %. */
export const TREND_MIN_RELATIVE_GAP = 0.05;
export const TILT_MIN_GAMES = 8;
export const TILT_MIN_GAP = 0.1;
export const POOL_WINDOW = 40;
export const POOL_MIN_GAMES = 20;
export const POOL_MAX_FOCUS = 0.6;
export const POOL_MIN_DISTINCT = 6;

const TREND_METRICS: readonly MetricId[] = ["deathsPer10", "csPerMin", "visionPerMin", "killParticipation"];

export type Confidence = "low" | "medium" | "high";
const CONFIDENCE_WEIGHT: Record<Confidence, number> = { low: 0.5, medium: 0.8, high: 1 };

export type QualityLevel = "insufficient" | "limited" | "good";

export interface DataQuality {
  totalGames: number;
  countedGames: number;
  remakes: number;
  /** Share of counted games with at least one missing optional stat. */
  partialShare: number;
  spanDays: number;
  level: QualityLevel;
}

export interface GoalSuggestion {
  metric: MetricId;
  comparator: "atMost" | "atLeast";
  target: number;
  horizonGames: number;
}

export interface Evidence {
  label: string;
  value: number | null;
  n: number;
  metric: MetricId | "winrate";
}

export interface Insight {
  id: string;
  rule: "trend" | "tilt" | "pool";
  metric: MetricId;
  /** i18n key + params for the observation sentence. */
  observationKey: string;
  params: Record<string, string | number>;
  evidence: Evidence[];
  /** Standardised effect size (Cohen's d or z), for transparency. */
  effect: number;
  confidence: Confidence;
  score: number;
  goal: GoalSuggestion;
  trackingKey: string;
}

export interface CoachReport {
  quality: DataQuality;
  insights: Insight[];
  /** Rules that ran but did not trigger, for the "why nothing here?" explanation. */
  checked: string[];
}

const chrono = (xs: readonly Match[]) => [...xs].sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt));

export function assessQuality(matches: readonly Match[]): DataQuality {
  const counted = matches.filter(isCounted);
  const partial = counted.filter((m) => m.cs === null || m.visionScore === null || m.teamKills === null).length;
  const times = matches.map((m) => Date.parse(m.playedAt));
  const spanDays = times.length ? (Math.max(...times) - Math.min(...times)) / 86_400_000 : 0;
  const level: QualityLevel = counted.length < MIN_GAMES ? "insufficient" : counted.length < LIMITED_GAMES ? "limited" : "good";
  return {
    totalGames: matches.length,
    countedGames: counted.length,
    remakes: matches.length - counted.length,
    partialShare: counted.length ? partial / counted.length : 0,
    spanDays,
    level,
  };
}

const round = (x: number, decimals: number) => Math.round(x * 10 ** decimals) / 10 ** decimals;

function trendInsight(matches: readonly Match[], metric: MetricId): Insight | null {
  const def = METRICS[metric];
  if (!def.perGame) return null;
  const eligible = chrono(matches.filter(def.eligible));
  const recent = eligible.slice(-TREND_RECENT);
  const baseline = eligible.slice(-(TREND_RECENT + TREND_BASELINE), -TREND_RECENT);
  if (recent.length < TREND_MIN_RECENT || baseline.length < TREND_MIN_BASELINE) return null;

  const r = recent.map(def.perGame);
  const b = baseline.map(def.perGame);
  const sdR = stdev(r) ?? 0;
  const sdB = stdev(b) ?? 0;
  const pooled = Math.sqrt(((r.length - 1) * sdR ** 2 + (b.length - 1) * sdB ** 2) / (r.length + b.length - 2));
  const muR = mean(r) as number;
  const muB = mean(b) as number;
  if (pooled < 1e-9 || Math.abs(muR - muB) < TREND_MIN_RELATIVE_GAP * Math.max(Math.abs(muB), 1e-9)) return null;
  const d = ((muR - muB) / pooled) * (def.higherIsBetter ? -1 : 1); // > 0 = worse
  if (d < TREND_MIN_EFFECT) return null;

  const recentVal = computeMetric(metric, recent);
  const baseVal = computeMetric(metric, baseline);
  if (recentVal.value === null || baseVal.value === null) return null;

  const confidence: Confidence =
    d >= 0.7 && recent.length >= TREND_RECENT && baseline.length >= 30 ? "high" : d >= 0.5 && baseline.length >= 20 ? "medium" : "low";
  const scale = def.kind === "ratio" ? 2 : def.decimals;
  return {
    id: `trend:${metric}`,
    rule: "trend",
    metric,
    observationKey: "coach.obs.trend",
    params: { recentN: recent.length, baselineN: baseline.length },
    evidence: [
      { label: "recent", value: recentVal.value, n: recent.length, metric },
      { label: "baseline", value: baseVal.value, n: baseline.length, metric },
    ],
    effect: round(d, 2),
    confidence,
    score: d * CONFIDENCE_WEIGHT[confidence],
    goal: {
      metric,
      comparator: def.higherIsBetter ? "atLeast" : "atMost",
      target: round(baseVal.value, scale),
      horizonGames: 10,
    },
    trackingKey: "coach.track.trend",
  };
}

function tiltInsight(matches: readonly Match[]): Insight | null {
  const counted = chrono(matches.filter(isCounted));
  const flags = afterLossStreakFlags(counted);
  const after = counted.filter((_, i) => flags[i]);
  const others = counted.filter((_, i) => !flags[i]);
  if (after.length < TILT_MIN_GAMES || others.length < TILT_MIN_GAMES) return null;
  const wa = winrateStat(after);
  const wo = winrateStat(others);
  if (wa.rate === null || wo.rate === null) return null;
  const gap = wo.rate - wa.rate;
  if (gap < TILT_MIN_GAP) return null;

  const pooled = (wa.wins + wo.wins) / (wa.games + wo.games);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / wa.games + 1 / wo.games));
  const z = se > 0 ? gap / se : 0;
  if (z < 1) return null;
  const confidence: Confidence = z >= 2.5 && after.length >= 15 ? "high" : z >= 1.65 ? "medium" : "low";
  const current = computeMetric("lossStreakContinuation", counted);
  return {
    id: "tilt:lossStreakContinuation",
    rule: "tilt",
    metric: "lossStreakContinuation",
    observationKey: "coach.obs.tilt",
    params: { afterN: after.length, othersN: others.length },
    evidence: [
      { label: "afterStreak", value: wa.rate, n: wa.games, metric: "winrate" },
      { label: "otherGames", value: wo.rate, n: wo.games, metric: "winrate" },
      { label: "shareAfterStreak", value: current.value, n: current.n, metric: "lossStreakContinuation" },
    ],
    effect: round(z, 2),
    confidence,
    score: Math.min(z / 2, 1.5) * CONFIDENCE_WEIGHT[confidence],
    goal: { metric: "lossStreakContinuation", comparator: "atMost", target: 0.05, horizonGames: 15 },
    trackingKey: "coach.track.tilt",
  };
}

function poolInsight(matches: readonly Match[]): Insight | null {
  const ranked = chrono(matches.filter((m) => isCounted(m) && RANKED_QUEUES.has(m.queue))).slice(-POOL_WINDOW);
  if (ranked.length < POOL_MIN_GAMES) return null;
  const focus = computeMetric("poolFocus", ranked);
  const counts = new Map<string, number>();
  for (const m of ranked) counts.set(m.champion, (counts.get(m.champion) ?? 0) + 1);
  if (focus.value === null || focus.value >= POOL_MAX_FOCUS || counts.size < POOL_MIN_DISTINCT) return null;

  const top3 = new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c));
  const wTop = winrateStat(ranked.filter((m) => top3.has(m.champion)));
  const wRest = winrateStat(ranked.filter((m) => !top3.has(m.champion)));
  // A pool heuristic is never "high" confidence: it is a habit, not a measured deficit.
  const confidence: Confidence = ranked.length >= 30 ? "medium" : "low";
  const magnitude = (POOL_MAX_FOCUS - focus.value) / POOL_MAX_FOCUS + 0.3;
  return {
    id: "pool:poolFocus",
    rule: "pool",
    metric: "poolFocus",
    observationKey: "coach.obs.pool",
    params: { distinct: counts.size, n: ranked.length, top3: [...top3].join(", ") },
    evidence: [
      { label: "focus", value: focus.value, n: ranked.length, metric: "poolFocus" },
      { label: "top3Winrate", value: wTop.rate, n: wTop.games, metric: "winrate" },
      { label: "otherWinrate", value: wRest.rate, n: wRest.games, metric: "winrate" },
    ],
    effect: round(magnitude, 2),
    confidence,
    score: magnitude * CONFIDENCE_WEIGHT[confidence],
    goal: { metric: "poolFocus", comparator: "atLeast", target: 0.7, horizonGames: 15 },
    trackingKey: "coach.track.pool",
  };
}

const capConfidence = (c: Confidence, level: QualityLevel): Confidence => (level === "limited" && c === "high" ? "medium" : c);

export function runCoach(matches: readonly Match[]): CoachReport {
  const quality = assessQuality(matches);
  const checked = [...TREND_METRICS.map((m) => `trend:${m}`), "tilt:lossStreakContinuation", "pool:poolFocus"];
  if (quality.level === "insufficient") return { quality, insights: [], checked };

  const candidates = [...TREND_METRICS.map((m) => trendInsight(matches, m)), tiltInsight(matches), poolInsight(matches)]
    .filter((x): x is Insight => x !== null)
    .map((i) => ({ ...i, confidence: capConfidence(i.confidence, quality.level) }));

  const seen = new Set<MetricId>();
  const insights = candidates
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .filter((i) => (seen.has(i.metric) ? false : (seen.add(i.metric), true)))
    .slice(0, MAX_INSIGHTS);

  return { quality, insights, checked };
}
