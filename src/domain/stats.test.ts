import { describe, expect, it } from "vitest";
import { makeMatch, series } from "../../tests/fixtures";
import { afterLossStreakFlags, computeMetric } from "./metrics";
import { byChampion, comparePeriods, inLastDays, rollingSeries, summarize, wilsonInterval, winrateStat } from "./stats";

describe("wilsonInterval", () => {
  it("returns null without games", () => expect(wilsonInterval(0, 0)).toBeNull());
  it("is wide for small samples and contains p", () => {
    const [lo, hi] = wilsonInterval(3, 5)!;
    expect(lo).toBeLessThan(0.6);
    expect(hi).toBeGreaterThan(0.6);
    expect(hi - lo).toBeGreaterThan(0.5);
  });
  it("matches a known value (50/100)", () => {
    const [lo, hi] = wilsonInterval(50, 100)!;
    expect(lo).toBeCloseTo(0.4038, 3);
    expect(hi).toBeCloseTo(0.5962, 3);
  });
  it("stays within [0, 1] at extremes", () => {
    expect(wilsonInterval(0, 4)![0]).toBe(0);
    expect(wilsonInterval(4, 4)![1]).toBeLessThanOrEqual(1);
  });
});

describe("winrate & summary", () => {
  it("excludes remakes from winrate and averages", () => {
    const ms = [makeMatch({ result: "win" }), makeMatch({ result: "loss" }), makeMatch({ result: "remake", durationSec: 200 })];
    const w = winrateStat(ms);
    expect(w).toMatchObject({ wins: 1, games: 2, rate: 0.5 });
    const s = summarize(ms);
    expect(s.total).toBe(3);
    expect(s.remakes).toBe(1);
    expect(s.avgDurationSec).toBe(1800);
  });

  it("aggregate KDA is (ΣK+ΣA)/max(1,ΣD)", () => {
    const ms = [makeMatch({ kills: 10, deaths: 0, assists: 5 }), makeMatch({ kills: 0, deaths: 5, assists: 0 })];
    expect(computeMetric("kda", ms).value).toBeCloseTo(15 / 5);
    expect(computeMetric("kda", [makeMatch({ kills: 4, deaths: 0, assists: 2 })]).value).toBe(6);
  });

  it("CS/min ignores supports, ARAM and missing CS — and reports exclusions", () => {
    const ms = [
      makeMatch({ cs: 240, durationSec: 1800 }), // 8.0
      makeMatch({ cs: null }),
      makeMatch({ role: "UTILITY", cs: 30 }),
      makeMatch({ queue: "aram", role: null, cs: 60 }),
    ];
    const v = computeMetric("csPerMin", ms);
    expect(v.value).toBeCloseTo(8);
    expect(v.n).toBe(1);
    expect(v.excluded).toBe(3);
  });

  it("returns null (not 0) when no game is eligible", () => {
    expect(computeMetric("csPerMin", [makeMatch({ cs: null })]).value).toBeNull();
    expect(summarize([]).winrate.rate).toBeNull();
  });

  it("kill participation aggregates over team kills", () => {
    const ms = [makeMatch({ kills: 5, assists: 5, teamKills: 20 }), makeMatch({ kills: 0, assists: 10, teamKills: 20 })];
    expect(computeMetric("killParticipation", ms).value).toBeCloseTo(0.5);
  });
});

describe("time windows", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  const day = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

  it("selects [now − days, now)", () => {
    const ms = [makeMatch({ playedAt: day(1) }), makeMatch({ playedAt: day(6.9) }), makeMatch({ playedAt: day(7.1) })];
    expect(inLastDays(ms, now, 7)).toHaveLength(2);
    expect(inLastDays(ms, now, 7, 7)).toHaveLength(1);
  });

  it("compares a period with the previous one and knows which direction is better", () => {
    const ms = [
      makeMatch({ playedAt: day(2), deaths: 2 }),
      makeMatch({ playedAt: day(3), deaths: 2 }),
      makeMatch({ playedAt: day(9), deaths: 6 }),
    ];
    const c = comparePeriods(ms, now, 7, "deathsPer10");
    expect(c.current.n).toBe(2);
    expect(c.previous.n).toBe(1);
    expect(c.delta).toBeLessThan(0);
    expect(c.improved).toBe(true);
  });
});

describe("rollingSeries", () => {
  it("is null until the window is full, chronological", () => {
    const ms = series(5, (i) => ({ result: i % 2 ? "win" : "loss" }));
    const s = rollingSeries(ms, "winrate", 3);
    expect(s.map((p) => p.value)).toEqual([null, null, 1 / 3, 2 / 3, 1 / 3]);
  });
});

describe("groups", () => {
  it("groups by champion sorted by games", () => {
    const ms = [makeMatch({ champion: "Vi" }), makeMatch({ champion: "Ahri" }), makeMatch({ champion: "Ahri", result: "loss" })];
    const g = byChampion(ms);
    expect(g[0]).toMatchObject({ key: "Ahri", games: 2 });
    expect(g[0]!.winrate.rate).toBe(0.5);
  });
});

describe("afterLossStreakFlags", () => {
  it("flags games after two losses in the same session and resets on a new session", () => {
    const ms = series(4, (i) => ({ result: i < 3 ? "loss" : "win" }));
    expect(afterLossStreakFlags(ms)).toEqual([false, false, true, true]);
    const nextDay = makeMatch({ playedAt: new Date(Date.parse(ms[2]!.playedAt) + 86_400_000).toISOString() });
    expect(afterLossStreakFlags([...ms.slice(0, 3), nextDay])).toEqual([false, false, true, false]);
  });
});
