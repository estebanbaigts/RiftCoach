import { computeMetric, countBy, METRICS, type MetricId, type MetricValue } from "./metrics";
import { isCounted, type Match, type Role } from "./model";

const DAY_MS = 24 * 60 * 60 * 1000;

export function mean(xs: readonly number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Sample standard deviation (n − 1). */
export function stdev(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs) as number;
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

/** 95 % Wilson score interval for a proportion. Honest with small samples. */
export function wilsonInterval(successes: number, n: number, z = 1.96): [number, number] | null {
  if (n <= 0) return null;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Matches whose start falls in [now − days, now). */
export function inLastDays(matches: readonly Match[], now: Date, days: number, offsetDays = 0): Match[] {
  const end = now.getTime() - offsetDays * DAY_MS;
  const start = end - days * DAY_MS;
  return matches.filter((m) => {
    const t = Date.parse(m.playedAt);
    return t >= start && t < end;
  });
}

export interface WinrateStat {
  wins: number;
  games: number;
  rate: number | null;
  interval: [number, number] | null;
}

export function winrateStat(matches: readonly Match[]): WinrateStat {
  const counted = matches.filter(isCounted);
  const wins = counted.filter((m) => m.result === "win").length;
  return {
    wins,
    games: counted.length,
    rate: counted.length ? wins / counted.length : null,
    interval: wilsonInterval(wins, counted.length),
  };
}

export interface Summary {
  total: number;
  remakes: number;
  winrate: WinrateStat;
  kda: MetricValue;
  avgKills: number | null;
  avgDeaths: number | null;
  avgAssists: number | null;
  csPerMin: MetricValue;
  avgDurationSec: number | null;
}

export function summarize(matches: readonly Match[]): Summary {
  const counted = matches.filter(isCounted);
  return {
    total: matches.length,
    remakes: matches.length - counted.length,
    winrate: winrateStat(matches),
    kda: computeMetric("kda", matches),
    avgKills: mean(counted.map((m) => m.kills)),
    avgDeaths: mean(counted.map((m) => m.deaths)),
    avgAssists: mean(counted.map((m) => m.assists)),
    csPerMin: computeMetric("csPerMin", matches),
    avgDurationSec: mean(counted.map((m) => m.durationSec)),
  };
}

export interface GroupStat {
  key: string;
  games: number;
  winrate: WinrateStat;
  kda: number | null;
}

function groupStats(matches: readonly Match[], key: (m: Match) => string | null): GroupStat[] {
  const groups = new Map<string, Match[]>();
  for (const m of matches.filter(isCounted)) {
    const k = key(m);
    if (k === null) continue;
    const list = groups.get(k) ?? [];
    list.push(m);
    groups.set(k, list);
  }
  return [...groups.entries()]
    .map(([k, ms]) => ({ key: k, games: ms.length, winrate: winrateStat(ms), kda: computeMetric("kda", ms).value }))
    .sort((a, b) => b.games - a.games || a.key.localeCompare(b.key));
}

export const byChampion = (matches: readonly Match[]) => groupStats(matches, (m) => m.champion);
export const byRole = (matches: readonly Match[]) => groupStats(matches, (m) => m.role as Role | null);
export const championCounts = (matches: readonly Match[]) => countBy(matches.filter(isCounted), (m) => m.champion);

export interface SeriesPoint {
  /** Index in chronological order (0 = oldest). */
  index: number;
  playedAt: string;
  value: number | null;
}

/**
 * Rolling aggregate of a metric over the last `window` eligible games, chronological.
 * Points before the window is full are null (not enough data yet).
 */
export function rollingSeries(matches: readonly Match[], metric: MetricId, window = 10): SeriesPoint[] {
  const def = METRICS[metric];
  const chrono = matches.filter(def.eligible).sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt));
  return chrono.map((m, i) => ({
    index: i,
    playedAt: m.playedAt,
    value: i + 1 >= window ? def.aggregate(chrono.slice(i + 1 - window, i + 1)) : null,
  }));
}

export interface PeriodComparison {
  metric: MetricId;
  days: number;
  current: MetricValue;
  previous: MetricValue;
  /** current − previous; null if either side has no data. */
  delta: number | null;
  /** True if the change goes in the "better" direction for this metric. */
  improved: boolean | null;
}

/** Compares the last `days` days with the `days` days before. */
export function comparePeriods(matches: readonly Match[], now: Date, days: number, metric: MetricId): PeriodComparison {
  const current = computeMetric(metric, inLastDays(matches, now, days));
  const previous = computeMetric(metric, inLastDays(matches, now, days, days));
  const delta = current.value !== null && previous.value !== null ? current.value - previous.value : null;
  const improved = delta === null || delta === 0 ? null : METRICS[metric].higherIsBetter ? delta > 0 : delta < 0;
  return { metric, days, current, previous, delta, improved };
}
