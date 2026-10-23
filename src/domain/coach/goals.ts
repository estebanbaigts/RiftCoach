import { z } from "zod";
import { computeMetric, METRIC_IDS, METRICS, type MetricId } from "../metrics";
import type { DataOrigin, Match } from "../model";
import type { GoalSuggestion } from "./engine";

export interface Goal extends GoalSuggestion {
  id: string;
  insightId: string;
  /** Metric value over recent games when the goal was created. */
  baseline: number | null;
  createdAt: string;
  origin: DataOrigin;
}

export const goalSchema = z
  .object({
    id: z.string().min(1).max(80),
    insightId: z.string().min(1).max(80),
    metric: z.enum(METRIC_IDS),
    comparator: z.enum(["atMost", "atLeast"]),
    target: z.number().finite(),
    horizonGames: z.number().int().min(1).max(100),
    baseline: z.number().finite().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    origin: z.enum(["demo", "riot-api", "import"]),
  })
  .strict();

export type GoalStatus = "collecting" | "on-track" | "off-track" | "achieved" | "missed";

export interface GoalProgress {
  goal: Goal;
  /** Eligible games played after the goal was created (capped at horizon). */
  tracked: number;
  value: number | null;
  status: GoalStatus;
  /** Change vs baseline, in the metric's "better" direction (positive = better). */
  improvement: number | null;
}

/** Below this many tracked games we only say "collecting data". */
export const GOAL_MIN_TRACKED = 3;

export const meets = (goal: Pick<Goal, "comparator" | "target">, value: number) =>
  goal.comparator === "atMost" ? value <= goal.target : value >= goal.target;

export function createGoal(suggestion: GoalSuggestion, insightId: string, matches: readonly Match[], now: Date, origin: DataOrigin): Goal {
  const def = METRICS[suggestion.metric];
  const recent = [...matches.filter(def.eligible)].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, 15);
  return {
    ...suggestion,
    id: `goal:${insightId}:${now.getTime()}`,
    insightId,
    baseline: computeMetric(suggestion.metric, recent).value,
    createdAt: now.toISOString(),
    origin,
  };
}

export function evaluateGoal(goal: Goal, matches: readonly Match[]): GoalProgress {
  const def = METRICS[goal.metric];
  const created = Date.parse(goal.createdAt);
  const after = matches
    .filter((m) => m.origin === goal.origin && Date.parse(m.playedAt) >= created && def.eligible(m))
    .sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt))
    .slice(0, goal.horizonGames);
  const value = computeMetric(goal.metric as MetricId, after).value;
  const tracked = after.length;
  let status: GoalStatus;
  if (value === null || tracked < Math.min(GOAL_MIN_TRACKED, goal.horizonGames)) status = "collecting";
  else if (tracked < goal.horizonGames) status = meets(goal, value) ? "on-track" : "off-track";
  else status = meets(goal, value) ? "achieved" : "missed";

  const improvement =
    value !== null && goal.baseline !== null ? (def.higherIsBetter ? value - goal.baseline : goal.baseline - value) : null;
  return { goal, tracked, value, status, improvement };
}
