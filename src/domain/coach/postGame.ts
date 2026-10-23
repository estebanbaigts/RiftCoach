import { METRICS, type MetricId } from "../metrics";
import { isCounted, type Match } from "../model";
import { mean, stdev } from "../stats";

/**
 * Post-game review: compares one finished game with the player's own recent
 * games in the same role. Purely descriptive and strictly after the game.
 */

export const REVIEW_METRICS: readonly MetricId[] = ["kda", "deathsPer10", "csPerMin", "visionPerMin", "killParticipation"];
export const REVIEW_BASELINE_GAMES = 30;
export const REVIEW_MIN_BASELINE = 5;
/** |z| below this is reported as "similar to usual". */
export const REVIEW_SIGNIFICANT_Z = 0.75;

export type ReviewVerdict = "better" | "similar" | "worse" | "insufficient" | "not-applicable";

export interface ReviewLine {
  metric: MetricId;
  value: number | null;
  baselineMean: number | null;
  baselineN: number;
  z: number | null;
  verdict: ReviewVerdict;
}

export function postGameReview(match: Match, history: readonly Match[]): ReviewLine[] {
  const t = Date.parse(match.playedAt);
  const peers = history
    .filter((m) => m.id !== match.id && isCounted(m) && m.role === match.role && m.queue === match.queue && Date.parse(m.playedAt) < t)
    .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, REVIEW_BASELINE_GAMES);

  return REVIEW_METRICS.map((metric) => {
    const def = METRICS[metric];
    if (!def.perGame || !def.eligible(match)) {
      return { metric, value: null, baselineMean: null, baselineN: 0, z: null, verdict: "not-applicable" };
    }
    const value = def.perGame(match);
    const base = peers.filter(def.eligible).map(def.perGame);
    const mu = mean(base);
    const sd = stdev(base);
    if (base.length < REVIEW_MIN_BASELINE || mu === null || !sd) {
      return { metric, value, baselineMean: mu, baselineN: base.length, z: null, verdict: "insufficient" };
    }
    const z = ((value - mu) / sd) * (def.higherIsBetter ? 1 : -1);
    const verdict: ReviewVerdict = z >= REVIEW_SIGNIFICANT_Z ? "better" : z <= -REVIEW_SIGNIFICANT_Z ? "worse" : "similar";
    return { metric, value, baselineMean: mu, baselineN: base.length, z: Math.round(z * 100) / 100, verdict };
  });
}
