import type { Match, PlayerProfile, Queue, Role } from "../model";

/**
 * Synthetic dataset for demo mode. Every record has origin "demo" and an id prefixed
 * with "DEMO_" so it can never be confused with real data. Nothing here describes a
 * real player or a real game.
 *
 * The generator is deterministic for a given (seed, epoch) and deliberately embeds a
 * few patterns so the coach has something to find:
 *  - win probability and deaths worsen after two losses in a session;
 *  - deaths drift upward in the last ten days;
 *  - CS/min improves over the last two weeks;
 *  - a scattered ranked champion pool;
 *  - ~6 % partial records (missing CS / vision) and a few remakes.
 */

export const DEMO_PROFILE: PlayerProfile = {
  gameName: "Joueur Démo",
  tagLine: "DEMO",
  platform: "EUW1",
  origin: "demo",
};

export const DEMO_SEED = 20261023;

/** mulberry32 — tiny, fast, deterministic PRNG. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)] as T;
const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
/** Approximate normal via sum of uniforms (Irwin–Hall). */
const normal = (rng: Rng, mu: number, sigma: number) => mu + sigma * (rng() + rng() + rng() + rng() + rng() + rng() - 3);
const clampInt = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(x)));

const POOLS: Record<"MIDDLE" | "JUNGLE" | "TOP", readonly string[]> = {
  MIDDLE: ["Ahri", "Orianna", "Viktor", "Syndra", "Annie", "Vex", "Zed", "Lux"],
  JUNGLE: ["Vi", "Lee Sin", "Sejuani", "Amumu"],
  TOP: ["Ornn", "Garen"],
};
const ARAM_POOL = ["Jinx", "Ezreal", "Brand", "Lux", "Sona", "Darius", "Karthus", "Ziggs", "Veigar"];

const ROLE_BASE: Record<"MIDDLE" | "JUNGLE" | "TOP", { csPerMin: number; visionPerMin: number; deaths: number }> = {
  MIDDLE: { csPerMin: 6.6, visionPerMin: 0.75, deaths: 4.6 },
  JUNGLE: { csPerMin: 5.6, visionPerMin: 1.05, deaths: 4.9 },
  TOP: { csPerMin: 6.9, visionPerMin: 0.6, deaths: 4.8 },
};

interface GenState {
  rng: Rng;
  index: number;
  sessionLosses: number;
}

const DAY_MS = 86_400_000;

function generateOne(state: GenState, start: Date, ageDays: number): Match {
  const { rng } = state;
  const index = state.index++;
  const id = `DEMO_${String(index).padStart(5, "0")}`;

  const isAram = rng() < 0.1;
  const queue: Queue = isAram ? "aram" : rng() < 0.75 ? "ranked-solo" : rng() < 0.5 ? "ranked-flex" : "normal-draft";
  const lane = isAram ? null : rng() < 0.62 ? "MIDDLE" : rng() < 0.75 ? "JUNGLE" : "TOP";
  const role: Role | null = lane;
  const champion = lane ? pick(rng, POOLS[lane]) : pick(rng, ARAM_POOL);

  const tilted = state.sessionLosses >= 2;
  const recent = ageDays < 10;

  const isRemake = rng() < 0.02;
  const winP = 0.52 - (tilted ? 0.14 : 0) - (recent ? 0.03 : 0);
  const win = !isRemake && rng() < winP;
  const result = isRemake ? "remake" : win ? "win" : "loss";

  const durationSec = isRemake ? clampInt(normal(rng, 200, 20), 120, 260) : clampInt(normal(rng, isAram ? 1150 : 1800, isAram ? 150 : 330), 900, 3000);
  const min = durationSec / 60;
  const scale = isRemake ? 0.1 : min / 30;

  const base = lane ? ROLE_BASE[lane] : { csPerMin: 2.2, visionPerMin: 0.25, deaths: 7 };
  const deaths = clampInt(normal(rng, (base.deaths + (win ? -1.2 : 1.1) + (tilted ? 1.6 : 0) + (recent ? 1.3 : 0)) * scale, 1.6), 0, 25);
  const kills = clampInt(normal(rng, (win ? 7.5 : 4.2) * scale * (isAram ? 1.5 : 1), 2.2), 0, 30);
  const assists = clampInt(normal(rng, (win ? 9 : 6) * scale * (isAram ? 2.2 : 1) * (lane === "JUNGLE" ? 1.2 : 1), 2.6), 0, 45);
  const kp = between(rng, 0.42, 0.72);
  const teamKills = Math.max(kills, Math.round((kills + assists) / kp), 1);

  // CS/min improves linearly over the last 14 days (up to +0.7).
  const csTrend = ageDays < 14 ? ((14 - ageDays) / 14) * 0.7 : 0;
  const csPerMin = Math.max(0.5, normal(rng, base.csPerMin + csTrend + (win ? 0.3 : -0.2), 0.7));
  const vision = Math.max(0, normal(rng, base.visionPerMin, 0.18) * min);

  const partial = rng() < 0.06;

  if (result === "loss") state.sessionLosses += 1;
  else if (result === "win") state.sessionLosses = 0;

  return {
    id,
    origin: "demo",
    playedAt: start.toISOString(),
    durationSec,
    queue,
    champion,
    role,
    result,
    kills,
    deaths,
    assists,
    cs: partial ? null : Math.round(csPerMin * min),
    visionScore: partial ? null : Math.round(vision),
    goldEarned: partial ? null : Math.round(normal(rng, 380 + (win ? 40 : -20), 40) * min),
    damageToChampions: Math.round(normal(rng, (win ? 820 : 640) * (isAram ? 1.6 : 1), 160) * min),
    teamKills: partial ? null : teamKills,
  };
}

export interface DemoDataset {
  profile: PlayerProfile;
  matches: Match[];
}

/**
 * Generates `days` days of history ending at `epoch`.
 * Sessions start in the evening; the gap between games is a few minutes.
 */
export function generateDemoDataset(epoch: Date, seed = DEMO_SEED, days = 45): DemoDataset {
  const state: GenState = { rng: createRng(seed), index: 0, sessionLosses: 0 };
  const { rng } = state;
  const matches: Match[] = [];
  const startOfEpochDay = Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth(), epoch.getUTCDate());

  for (let d = days; d >= 1; d--) {
    if (rng() < 0.3) continue; // rest day
    const gamesToday = 1 + Math.floor(rng() * 5);
    let t = startOfEpochDay - d * DAY_MS + (17 + rng() * 4) * 3_600_000;
    state.sessionLosses = 0;
    for (let g = 0; g < gamesToday; g++) {
      if (t >= epoch.getTime()) break;
      const m = generateOne(state, new Date(t), (epoch.getTime() - t) / DAY_MS);
      matches.push(m);
      t += m.durationSec * 1000 + (3 + rng() * 6) * 60_000;
    }
  }
  return { profile: DEMO_PROFILE, matches };
}

/**
 * Simulates a session of `count` additional demo games starting at `startAt`
 * (the demo mode's virtual clock). Used to let users watch goal tracking evolve.
 * Returns raw objects: callers must still pass them through ingestion.
 */
export function simulateDemoSession(startAt: Date, startIndex: number, count: number, seed: number): unknown[] {
  const state: GenState = { rng: createRng(seed), index: startIndex, sessionLosses: 0 };
  const out: Match[] = [];
  let t = startAt.getTime() + 5 * 60_000;
  for (let i = 0; i < count; i++) {
    const m = generateOne(state, new Date(t), 0);
    out.push(m);
    t += m.durationSec * 1000 + 4 * 60_000;
  }
  return out;
}

/** End time of the latest match — the demo virtual clock after a simulation. */
export function latestEnd(matches: readonly Match[]): number {
  return matches.reduce((acc, m) => Math.max(acc, Date.parse(m.playedAt) + m.durationSec * 1000), 0);
}
