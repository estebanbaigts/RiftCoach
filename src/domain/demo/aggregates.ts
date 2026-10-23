import type { AggregateDataset, ChampionRoleStat, MatchupStat } from "../draft/types";
import type { Role } from "../model";
import { createRng } from "./generator";

/**
 * Synthetic population statistics for the champion-select demo.
 * The numbers are INVENTED (seeded PRNG) and must always be displayed as such:
 * they say nothing about real champion strength on any real patch.
 */

const POOLS: Record<Role, readonly string[]> = {
  TOP: ["Garen", "Ornn", "Darius", "Camille", "Fiora", "Malphite", "Sett", "Jax"],
  JUNGLE: ["Vi", "Lee Sin", "Sejuani", "Amumu", "Kayn", "Viego", "Hecarim", "Nocturne"],
  MIDDLE: ["Ahri", "Orianna", "Viktor", "Syndra", "Annie", "Vex", "Zed", "Lux", "Yasuo"],
  BOTTOM: ["Jinx", "Ezreal", "Kai'Sa", "Caitlyn", "Jhin", "Miss Fortune"],
  UTILITY: ["Thresh", "Lulu", "Nautilus", "Leona", "Nami", "Karma"],
};

export const DEMO_AGGREGATE_SEED = 7_310_2026;

export function generateDemoAggregates(seed = DEMO_AGGREGATE_SEED): AggregateDataset {
  const rng = createRng(seed);
  const normal = (mu: number, sigma: number) => mu + sigma * (rng() + rng() + rng() + rng() + rng() + rng() - 3);
  const champions: ChampionRoleStat[] = [];
  const matchups: MatchupStat[] = [];

  for (const role of Object.keys(POOLS) as Role[]) {
    const pool = POOLS[role];
    const strength = new Map<string, number>();
    const volume = new Map<string, number>();
    for (const c of pool) {
      const p = Math.min(0.545, Math.max(0.465, normal(0.5, 0.014)));
      const games = Math.round(18_000 + rng() * 200_000);
      strength.set(c, p);
      volume.set(c, games);
      champions.push({ champion: c, role, games, wins: Math.round(games * p) });
    }
    // Symmetric lane matchups: A vs B and B vs A share the same game count.
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const a = pool[i] as string;
        const b = pool[j] as string;
        const pa = Math.min(0.62, Math.max(0.38, 0.5 + ((strength.get(a) ?? 0.5) - (strength.get(b) ?? 0.5)) + normal(0, 0.03)));
        const sparse = rng() < 0.12; // some rare matchups → exercise the "insufficient sample" path
        const games = sparse ? Math.round(40 + rng() * 100) : Math.round(Math.min(volume.get(a) ?? 0, volume.get(b) ?? 0) * (0.03 + rng() * 0.09));
        const winsA = Math.round(games * pa);
        matchups.push({ champion: a, opponent: b, role, games, wins: winsA });
        matchups.push({ champion: b, opponent: a, role, games, wins: games - winsA });
      }
    }
  }
  return { origin: "demo", period: "DEMO", champions, matchups };
}
