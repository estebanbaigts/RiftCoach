import type { Role } from "../model";

/**
 * Aggregated, population-level statistics used before a game (champion select).
 * Never per-player data about other players: only counts per champion / matchup.
 * See docs/RIOT_COMPLIANCE.md F17–F18.
 */

/** "demo" = synthetic numbers generated locally; "aggregate" = a future approved source. */
export type AggregateOrigin = "demo" | "aggregate";

export interface ChampionRoleStat {
  champion: string;
  role: Role;
  games: number;
  wins: number;
}

/** Lane matchup from `champion`'s point of view: wins of `champion` against `opponent`. */
export interface MatchupStat {
  champion: string;
  opponent: string;
  role: Role;
  games: number;
  wins: number;
}

export interface AggregateDataset {
  origin: AggregateOrigin;
  /** Human label of the data period; "DEMO" for synthetic data. */
  period: string;
  champions: ChampionRoleStat[];
  matchups: MatchupStat[];
}
