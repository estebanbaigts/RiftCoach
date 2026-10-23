import type { Match } from "../src/domain/model";

let seq = 0;

/** Builds a valid match; override only what a test cares about. */
export function makeMatch(overrides: Partial<Match> = {}): Match {
  seq += 1;
  return {
    id: `T_${seq}`,
    origin: "demo",
    playedAt: new Date(Date.UTC(2026, 9, 1, 18, 0) + seq * 3_600_000).toISOString(),
    durationSec: 1800,
    queue: "ranked-solo",
    champion: "Ahri",
    role: "MIDDLE",
    result: "win",
    kills: 5,
    deaths: 3,
    assists: 7,
    cs: 210,
    visionScore: 24,
    goldEarned: 11_000,
    damageToChampions: 20_000,
    teamKills: 24,
    ...overrides,
  };
}

/** Sequence of matches spaced `gapMin` minutes apart (start to start). */
export function series(n: number, f: (i: number) => Partial<Match>, start = Date.UTC(2026, 8, 1, 18, 0), gapMin = 40): Match[] {
  return Array.from({ length: n }, (_, i) => makeMatch({ playedAt: new Date(start + i * gapMin * 60_000).toISOString(), ...f(i) }));
}
