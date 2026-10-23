import { METRICS } from "../../domain/metrics";
import type { Match, MatchResult, Queue, Role } from "../../domain/model";

/** Pure filtering/sorting for the history view (tested independently of React). */
export interface MatchFilters {
  query: string;
  result: MatchResult | "all";
  queue: Queue | "all";
  role: Role | "none" | "all";
  sort: "date" | "duration" | "kda";
}

export const DEFAULT_FILTERS: MatchFilters = { query: "", result: "all", queue: "all", role: "all", sort: "date" };

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export function applyFilters(matches: readonly Match[], f: MatchFilters): Match[] {
  const q = normalize(f.query);
  const out = matches.filter(
    (m) =>
      (!q || normalize(m.champion).includes(q)) &&
      (f.result === "all" || m.result === f.result) &&
      (f.queue === "all" || m.queue === f.queue) &&
      (f.role === "all" || (f.role === "none" ? m.role === null : m.role === f.role)),
  );
  const kda = METRICS.kda.perGame!;
  const key: Record<MatchFilters["sort"], (m: Match) => number> = {
    date: (m) => Date.parse(m.playedAt),
    duration: (m) => m.durationSec,
    kda,
  };
  return out.sort((a, b) => key[f.sort](b) - key[f.sort](a) || Date.parse(b.playedAt) - Date.parse(a.playedAt));
}

export const isPartial = (m: Match) => m.cs === null || m.visionScore === null || m.teamKills === null;
