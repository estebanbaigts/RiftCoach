import { describe, expect, it } from "vitest";
import { makeMatch } from "../../../tests/fixtures";
import { generateDemoAggregates } from "../demo/aggregates";
import { countersOf, MIN_MATCHUP_GAMES, recommendPicks, shrink } from "./recommend";
import type { AggregateDataset } from "./types";

const ds = (over: Partial<AggregateDataset> = {}): AggregateDataset => ({
  origin: "demo",
  period: "TEST",
  champions: [
    { champion: "A", role: "MIDDLE", games: 10_000, wins: 5_000 },
    { champion: "B", role: "MIDDLE", games: 10_000, wins: 5_300 },
    { champion: "C", role: "MIDDLE", games: 10_000, wins: 4_800 },
    { champion: "Z", role: "MIDDLE", games: 10_000, wins: 5_000 },
    { champion: "Rare", role: "MIDDLE", games: 500, wins: 300 },
    { champion: "Jungler", role: "JUNGLE", games: 10_000, wins: 5_000 },
  ],
  matchups: [
    { champion: "A", opponent: "Z", role: "MIDDLE", games: 3_000, wins: 1_740 }, // 58 %
    { champion: "B", opponent: "Z", role: "MIDDLE", games: 3_000, wins: 1_500 }, // 50 %
    { champion: "C", opponent: "Z", role: "MIDDLE", games: 60, wins: 50 }, // 83 % but tiny
  ],
  ...over,
});

describe("shrink", () => {
  it("pulls small samples strongly toward the prior and large ones barely", () => {
    expect(shrink(50, 60, 0.48)).toBeLessThan(0.6);
    expect(shrink(50, 60, 0.48)).toBeGreaterThan(0.48);
    expect(shrink(1740, 3000, 0.5)).toBeCloseTo(1840 / 3200, 6); // (1740 + 200·0.5) / (3000 + 200)
  });
});

describe("recommendPicks", () => {
  it("only proposes champions of the role with enough data, excluding bans, picks and the opponent", () => {
    const names = recommendPicks({ dataset: ds(), role: "MIDDLE", opponent: "Z", bans: ["B"] }).map((p) => p.champion);
    expect(names).toEqual(["A", "C"]);
  });

  it("ranks by shrunk matchup when the sample is sufficient, and never ranks on a tiny sample", () => {
    const opts = recommendPicks({ dataset: ds(), role: "MIDDLE", opponent: "Z", mode: "matchup" });
    expect(opts[0]!.champion).toBe("A");
    const c = opts.find((o) => o.champion === "C")!;
    expect(c.matchup!.sufficient).toBe(false);
    expect(c.matchup!.games).toBeLessThan(MIN_MATCHUP_GAMES);
    expect(c.tags).toContain("low-sample");
    expect(c.score).toBeCloseTo(0.48); // falls back to its overall rate
  });

  it("tags trade-offs and reports confidence from the matchup sample", () => {
    const a = recommendPicks({ dataset: ds(), role: "MIDDLE", opponent: "Z" }).find((o) => o.champion === "A")!;
    expect(a.tags).toContain("strong-matchup");
    expect(a.tags).toContain("untested");
    expect(a.confidence).toBe("high");
  });

  it("without an opponent, uses overall win rate", () => {
    const opts = recommendPicks({ dataset: ds(), role: "MIDDLE", opponent: null, mode: "matchup" });
    expect(opts[0]!.champion).toBe("B");
    expect(opts.every((o) => o.matchup === null)).toBe(true);
  });

  it("comfort mode puts the player's own champions first; balanced gives a bounded bonus", () => {
    const history = Array.from({ length: 20 }, () => makeMatch({ champion: "C", role: "MIDDLE" }));
    expect(recommendPicks({ dataset: ds(), role: "MIDDLE", opponent: "Z", history, mode: "comfort" })[0]!.champion).toBe("C");
    const balanced = recommendPicks({ dataset: ds(), role: "MIDDLE", opponent: "Z", history });
    expect(balanced[0]!.champion).toBe("A"); // +2 pts comfort cannot beat a strong, well-sampled matchup
    expect(balanced.find((o) => o.champion === "C")!.personal.games).toBe(20);
  });
});

describe("countersOf", () => {
  it("lists best and worst matchups against an opponent, sufficient samples only", () => {
    const { best, worst } = countersOf(ds(), "MIDDLE", "Z");
    expect(best.map((e) => e.champion)).toEqual(["A", "B"]);
    expect(worst[0]!.champion).toBe("B");
    expect(best.some((e) => e.champion === "C")).toBe(false);
  });
});

describe("demo aggregates", () => {
  const d = generateDemoAggregates();
  it("is deterministic, demo-tagged and internally consistent", () => {
    expect(generateDemoAggregates()).toEqual(d);
    expect(d.origin).toBe("demo");
    for (const m of d.matchups) {
      const mirror = d.matchups.find((x) => x.role === m.role && x.champion === m.opponent && x.opponent === m.champion)!;
      expect(mirror.games).toBe(m.games);
      expect(mirror.wins + m.wins).toBe(m.games);
    }
    expect(d.champions.every((c) => c.wins <= c.games && c.wins / c.games > 0.4 && c.wins / c.games < 0.6)).toBe(true);
  });
  it("contains some sparse matchups to exercise the low-sample path", () => {
    expect(d.matchups.some((m) => m.games < MIN_MATCHUP_GAMES)).toBe(true);
  });
});
