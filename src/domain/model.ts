/**
 * Core domain model. Pure TypeScript — no React, no I/O.
 * Optional statistics are `null` when the source did not provide them:
 * a missing value is never replaced by a guess.
 */

/** Where a record came from. Demo and real data must never be mixed. */
export type DataOrigin = "demo" | "riot-api" | "import";

export const QUEUES = ["ranked-solo", "ranked-flex", "normal-draft", "swiftplay", "aram", "arena"] as const;
export type Queue = (typeof QUEUES)[number];

export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;
export type Role = (typeof ROLES)[number];

export type MatchResult = "win" | "loss" | "remake";

export interface Match {
  /** Stable identifier from the source (e.g. "EUW1_1234"). Used for deduplication. */
  id: string;
  origin: DataOrigin;
  /** ISO-8601 timestamp of game start. */
  playedAt: string;
  durationSec: number;
  queue: Queue;
  champion: string;
  /** null for modes without lanes (ARAM, Arena) or when unknown. */
  role: Role | null;
  result: MatchResult;
  kills: number;
  deaths: number;
  assists: number;
  /** Lane minions + neutral monsters. */
  cs: number | null;
  visionScore: number | null;
  goldEarned: number | null;
  damageToChampions: number | null;
  /** Team kills, needed for kill participation. */
  teamKills: number | null;
}

export interface PlayerProfile {
  gameName: string;
  tagLine: string;
  platform: string;
  origin: DataOrigin;
}

/** Queues where per-minute farming is a meaningful indicator. */
export const LANED_QUEUES: ReadonlySet<Queue> = new Set(["ranked-solo", "ranked-flex", "normal-draft", "swiftplay"]);
export const RANKED_QUEUES: ReadonlySet<Queue> = new Set(["ranked-solo", "ranked-flex"]);

export const isCounted = (m: Match): boolean => m.result !== "remake";
