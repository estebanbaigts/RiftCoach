import { isCounted, type Match, type Role } from "../model";
import { wilsonInterval } from "../stats";
import type { AggregateDataset, ChampionRoleStat, MatchupStat } from "./types";

/**
 * Champion-select options. Deterministic and transparent:
 *  - matchup win rates are shrunk toward the champion's overall win rate
 *    (empirical-Bayes style: MATCHUP_PRIOR pseudo-games), so a small sample cannot
 *    produce an extreme recommendation;
 *  - matchups below MIN_MATCHUP_GAMES are shown as "insufficient sample", not ranked on;
 *  - the output is a list of options with trade-offs — never a single imposed pick
 *    ("products should not dictate player decisions").
 */

export const MATCHUP_PRIOR = 200;
export const MIN_MATCHUP_GAMES = 150;
export const MIN_CHAMPION_GAMES = 1000;
/** Maximum win-rate bonus given to comfort (your own games on the champion). */
export const COMFORT_BONUS = 0.02;
export const COMFORT_GAMES_CAP = 20;
export const DEFAULT_LIMIT = 5;

export type SortMode = "balanced" | "matchup" | "comfort";
export type Confidence = "low" | "medium" | "high";
export type PickTag = "strong-matchup" | "weak-matchup" | "comfort" | "untested" | "low-sample" | "high-winrate";

export interface RateWithSample {
  rate: number;
  games: number;
  interval: [number, number] | null;
}

export interface PickOption {
  champion: string;
  role: Role;
  overall: RateWithSample;
  /** null when no opponent is known, or the matchup has no data. */
  matchup: (RateWithSample & { adjusted: number; delta: number; sufficient: boolean }) | null;
  personal: { games: number; wins: number; rate: number | null };
  tags: PickTag[];
  confidence: Confidence;
  score: number;
}

export interface RecommendInput {
  dataset: AggregateDataset;
  role: Role;
  opponent: string | null;
  bans?: readonly string[];
  /** Champions already picked (by anyone) — unavailable. */
  picked?: readonly string[];
  history?: readonly Match[];
  mode?: SortMode;
  limit?: number;
}

const rws = (wins: number, games: number): RateWithSample => ({ rate: games ? wins / games : 0, games, interval: wilsonInterval(wins, games) });

export function shrink(wins: number, games: number, priorRate: number, prior = MATCHUP_PRIOR): number {
  return (wins + prior * priorRate) / (games + prior);
}

function personalStats(history: readonly Match[], champion: string, role: Role) {
  const games = history.filter((m) => isCounted(m) && m.champion === champion && m.role === role);
  const wins = games.filter((m) => m.result === "win").length;
  return { games: games.length, wins, rate: games.length ? wins / games.length : null };
}

function findMatchup(dataset: AggregateDataset, role: Role, champion: string, opponent: string): MatchupStat | undefined {
  return dataset.matchups.find((m) => m.role === role && m.champion === champion && m.opponent === opponent);
}

function confidenceOf(games: number): Confidence {
  return games >= 2000 ? "high" : games >= 500 ? "medium" : "low";
}

function buildOption(input: RecommendInput, c: ChampionRoleStat): PickOption {
  const overall = rws(c.wins, c.games);
  const personal = personalStats(input.history ?? [], c.champion, input.role);
  let matchup: PickOption["matchup"] = null;
  if (input.opponent) {
    const m = findMatchup(input.dataset, input.role, c.champion, input.opponent);
    if (m && m.games > 0) {
      const adjusted = shrink(m.wins, m.games, overall.rate);
      matchup = { ...rws(m.wins, m.games), adjusted, delta: adjusted - overall.rate, sufficient: m.games >= MIN_MATCHUP_GAMES };
    }
  }

  const tags: PickTag[] = [];
  if (matchup?.sufficient && matchup.delta >= 0.015) tags.push("strong-matchup");
  if (matchup?.sufficient && matchup.delta <= -0.015) tags.push("weak-matchup");
  if (matchup && !matchup.sufficient) tags.push("low-sample");
  if (personal.games >= 5) tags.push("comfort");
  if (personal.games === 0) tags.push("untested");
  if (overall.rate >= 0.52) tags.push("high-winrate");

  const base = matchup?.sufficient ? matchup.adjusted : overall.rate;
  const comfort = (Math.min(personal.games, COMFORT_GAMES_CAP) / COMFORT_GAMES_CAP) * COMFORT_BONUS;
  const mode = input.mode ?? "balanced";
  const score = mode === "matchup" ? base : mode === "comfort" ? personal.games * 10 + base : base + comfort;
  const confidence = confidenceOf(matchup?.sufficient ? matchup.games : input.opponent ? 0 : c.games);
  return { champion: c.champion, role: input.role, overall, matchup, personal, tags, confidence, score };
}

export function recommendPicks(input: RecommendInput): PickOption[] {
  const unavailable = new Set([...(input.bans ?? []), ...(input.picked ?? []), ...(input.opponent ? [input.opponent] : [])]);
  return input.dataset.champions
    .filter((c) => c.role === input.role && c.games >= MIN_CHAMPION_GAMES && !unavailable.has(c.champion))
    .map((c) => buildOption(input, c))
    .sort((a, b) => b.score - a.score || b.overall.games - a.overall.games || a.champion.localeCompare(b.champion))
    .slice(0, input.limit ?? DEFAULT_LIMIT);
}

export interface CounterEntry {
  champion: string;
  /** Shrunk win rate of `champion` against the opponent. */
  adjusted: number;
  games: number;
  interval: [number, number] | null;
}

/**
 * Champions that perform best (`best`) and worst (`worst`) against `opponent` in a role,
 * among matchups with a sufficient sample.
 */
export function countersOf(dataset: AggregateDataset, role: Role, opponent: string, limit = 5): { best: CounterEntry[]; worst: CounterEntry[] } {
  const overall = new Map(dataset.champions.filter((c) => c.role === role).map((c) => [c.champion, c.games ? c.wins / c.games : 0.5]));
  const entries = dataset.matchups
    .filter((m) => m.role === role && m.opponent === opponent && m.games >= MIN_MATCHUP_GAMES)
    .map((m) => ({ champion: m.champion, adjusted: shrink(m.wins, m.games, overall.get(m.champion) ?? 0.5), games: m.games, interval: wilsonInterval(m.wins, m.games) }));
  const sorted = [...entries].sort((a, b) => b.adjusted - a.adjusted || a.champion.localeCompare(b.champion));
  return { best: sorted.slice(0, limit), worst: sorted.slice(-limit).reverse() };
}

export const championsForRole = (dataset: AggregateDataset, role: Role): string[] =>
  dataset.champions.filter((c) => c.role === role).map((c) => c.champion).sort((a, b) => a.localeCompare(b));
