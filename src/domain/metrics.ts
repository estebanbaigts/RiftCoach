import { LANED_QUEUES, RANKED_QUEUES, isCounted, type Match } from "./model";

/**
 * Metric registry shared by the dashboard, the coach and goal tracking.
 * Each metric declares which matches are eligible, so a missing stat is excluded
 * from the sample instead of being counted as zero.
 */
export const METRIC_IDS = [
  "winrate",
  "kda",
  "deathsPer10",
  "csPerMin",
  "visionPerMin",
  "killParticipation",
  "poolFocus",
  "lossStreakContinuation",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export interface MetricDef {
  id: MetricId;
  higherIsBetter: boolean;
  /** Display precision. */
  decimals: number;
  /** "ratio" values are displayed as percentages. */
  kind: "ratio" | "number";
  eligible: (m: Match) => boolean;
  /** Aggregate over eligible matches; null when no eligible match. */
  aggregate: (eligible: readonly Match[]) => number | null;
  /** Per-game value used for dispersion / trend detection, if meaningful. */
  perGame?: (m: Match) => number;
}

const minutes = (m: Match) => m.durationSec / 60;
const sum = (xs: readonly Match[], f: (m: Match) => number) => xs.reduce((acc, m) => acc + f(m), 0);
const ratioOrNull = (num: number, den: number) => (den > 0 ? num / den : null);

/** Two games are in the same session if the next starts less than this after the previous ends. */
export const SESSION_GAP_MS = 2 * 60 * 60 * 1000;

/**
 * For each match (chronological order), whether it was started right after
 * two or more consecutive losses in the same session.
 */
export function afterLossStreakFlags(chronological: readonly Match[], streak = 2): boolean[] {
  const flags: boolean[] = [];
  let losses = 0;
  let prevEnd = Number.NEGATIVE_INFINITY;
  for (const m of chronological) {
    const start = Date.parse(m.playedAt);
    if (start - prevEnd > SESSION_GAP_MS) losses = 0;
    flags.push(losses >= streak);
    if (m.result === "loss") losses += 1;
    else if (m.result === "win") losses = 0;
    prevEnd = start + m.durationSec * 1000;
  }
  return flags;
}

const chronological = (xs: readonly Match[]) => [...xs].sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt));

export const METRICS: Record<MetricId, MetricDef> = {
  winrate: {
    id: "winrate",
    higherIsBetter: true,
    decimals: 0,
    kind: "ratio",
    eligible: isCounted,
    aggregate: (xs) => ratioOrNull(xs.filter((m) => m.result === "win").length, xs.length),
  },
  kda: {
    id: "kda",
    higherIsBetter: true,
    decimals: 2,
    kind: "number",
    eligible: isCounted,
    // Aggregate KDA = (ΣK + ΣA) / max(1, ΣD): robust to deathless games.
    aggregate: (xs) => (xs.length ? (sum(xs, (m) => m.kills) + sum(xs, (m) => m.assists)) / Math.max(1, sum(xs, (m) => m.deaths)) : null),
    perGame: (m) => (m.kills + m.assists) / Math.max(1, m.deaths),
  },
  deathsPer10: {
    id: "deathsPer10",
    higherIsBetter: false,
    decimals: 2,
    kind: "number",
    eligible: isCounted,
    aggregate: (xs) => ratioOrNull(sum(xs, (m) => m.deaths) * 10, sum(xs, minutes)),
    perGame: (m) => (m.deaths * 10) / minutes(m),
  },
  csPerMin: {
    id: "csPerMin",
    higherIsBetter: true,
    decimals: 1,
    kind: "number",
    // Not meaningful for supports or lane-less modes.
    eligible: (m) => isCounted(m) && m.cs !== null && LANED_QUEUES.has(m.queue) && m.role !== null && m.role !== "UTILITY",
    aggregate: (xs) => ratioOrNull(sum(xs, (m) => m.cs ?? 0), sum(xs, minutes)),
    perGame: (m) => (m.cs ?? 0) / minutes(m),
  },
  visionPerMin: {
    id: "visionPerMin",
    higherIsBetter: true,
    decimals: 2,
    kind: "number",
    eligible: (m) => isCounted(m) && m.visionScore !== null && LANED_QUEUES.has(m.queue),
    aggregate: (xs) => ratioOrNull(sum(xs, (m) => m.visionScore ?? 0), sum(xs, minutes)),
    perGame: (m) => (m.visionScore ?? 0) / minutes(m),
  },
  killParticipation: {
    id: "killParticipation",
    higherIsBetter: true,
    decimals: 0,
    kind: "ratio",
    eligible: (m) => isCounted(m) && m.teamKills !== null && m.teamKills > 0,
    aggregate: (xs) => ratioOrNull(sum(xs, (m) => m.kills + m.assists), sum(xs, (m) => m.teamKills ?? 0)),
    perGame: (m) => (m.kills + m.assists) / (m.teamKills ?? 1),
  },
  poolFocus: {
    id: "poolFocus",
    higherIsBetter: true,
    decimals: 0,
    kind: "ratio",
    eligible: (m) => isCounted(m) && RANKED_QUEUES.has(m.queue),
    aggregate: (xs) => {
      if (!xs.length) return null;
      const counts = [...countBy(xs, (m) => m.champion).values()].sort((a, b) => b - a);
      return counts.slice(0, 3).reduce((a, b) => a + b, 0) / xs.length;
    },
  },
  lossStreakContinuation: {
    id: "lossStreakContinuation",
    higherIsBetter: false,
    decimals: 0,
    kind: "ratio",
    eligible: (m) => m.result !== "remake",
    aggregate: (xs) => {
      if (!xs.length) return null;
      const flags = afterLossStreakFlags(chronological(xs));
      return flags.filter(Boolean).length / xs.length;
    },
  },
};

export function countBy<T>(xs: readonly T[], key: (x: T) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const x of xs) out.set(key(x), (out.get(key(x)) ?? 0) + 1);
  return out;
}

export interface MetricValue {
  metric: MetricId;
  value: number | null;
  /** Number of eligible matches the value is based on. */
  n: number;
  /** Matches excluded because the metric does not apply or data is missing. */
  excluded: number;
}

export function computeMetric(id: MetricId, matches: readonly Match[]): MetricValue {
  const def = METRICS[id];
  const eligible = matches.filter(def.eligible);
  return { metric: id, value: def.aggregate(eligible), n: eligible.length, excluded: matches.length - eligible.length };
}
