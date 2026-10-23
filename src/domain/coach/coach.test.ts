import { describe, expect, it } from "vitest";
import { makeMatch, series } from "../../../tests/fixtures";
import { generateDemoDataset } from "../demo/generator";
import { assessQuality, MAX_INSIGHTS, runCoach } from "./engine";
import { createGoal, evaluateGoal } from "./goals";
import { postGameReview } from "./postGame";

// Deterministic pseudo-noise so tests are reproducible.
const wobble = (i: number) => ((i * 7919) % 13) / 13 - 0.5;

describe("data quality gate", () => {
  it("produces no insight below the minimum sample", () => {
    const r = runCoach(series(9, () => ({ deaths: 12 })));
    expect(r.quality.level).toBe("insufficient");
    expect(r.insights).toEqual([]);
  });

  it("reports partial data share and remakes", () => {
    const q = assessQuality([makeMatch({ cs: null }), makeMatch(), makeMatch({ result: "remake", durationSec: 200 })]);
    expect(q.countedGames).toBe(2);
    expect(q.remakes).toBe(1);
    expect(q.partialShare).toBe(0.5);
  });
});

describe("trend rule", () => {
  it("detects rising deaths vs the player's own baseline, with evidence and a goal", () => {
    const ms = series(50, (i) => ({ deaths: Math.round((i < 35 ? 3 : 7) + wobble(i) * 2), result: i % 2 ? "win" : "loss" }));
    const r = runCoach(ms);
    const ins = r.insights.find((x) => x.id === "trend:deathsPer10");
    expect(ins).toBeDefined();
    expect(ins!.evidence.find((e) => e.label === "recent")!.n).toBe(15);
    expect(ins!.goal.comparator).toBe("atMost");
    expect(ins!.goal.target).toBeLessThan(ins!.evidence.find((e) => e.label === "recent")!.value!);
    expect(["medium", "high"]).toContain(ins!.confidence);
  });

  it("does not flag an improvement as a problem", () => {
    const ms = series(50, (i) => ({ deaths: Math.round((i < 35 ? 7 : 3) + wobble(i) * 2), result: i % 2 ? "win" : "loss" }));
    expect(runCoach(ms).insights.find((x) => x.id === "trend:deathsPer10")).toBeUndefined();
  });

  it("stays quiet on stable data", () => {
    const ms = series(50, (i) => ({ deaths: Math.round(4 + wobble(i) * 2), result: i % 2 ? "win" : "loss", champion: "Ahri" }));
    expect(runCoach(ms).insights).toEqual([]);
  });
});

describe("tilt rule", () => {
  it("detects lower winrate after two consecutive losses in a session", () => {
    // Sessions of 5 games, one per day: L L L L W pattern vs W W L W W sessions.
    const ms = Array.from({ length: 12 }, (_, s) =>
      series(5, (i) => ({ result: (s % 2 ? ["win", "win", "loss", "win", "win"] : ["loss", "loss", "loss", "loss", "win"])[i] as "win" | "loss" }), Date.UTC(2026, 8, 1 + s, 18)),
    ).flat();
    const ins = runCoach(ms).insights.find((x) => x.rule === "tilt");
    expect(ins).toBeDefined();
    expect(ins!.evidence[0]!.value!).toBeLessThan(ins!.evidence[1]!.value!);
    expect(ins!.goal).toMatchObject({ metric: "lossStreakContinuation", comparator: "atMost" });
  });
});

describe("pool rule", () => {
  it("flags a scattered ranked pool but never with high confidence", () => {
    const champs = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const ms = series(40, (i) => ({ champion: champs[i % champs.length]!, result: i % 2 ? "win" : "loss" }));
    const ins = runCoach(ms).insights.find((x) => x.rule === "pool");
    expect(ins).toBeDefined();
    expect(ins!.confidence).not.toBe("high");
  });
});

describe("demo dataset end-to-end", () => {
  const epoch = new Date("2026-10-23T12:00:00Z");
  const { matches } = generateDemoDataset(epoch);

  it("is deterministic, demo-tagged and in the past", () => {
    expect(generateDemoDataset(epoch).matches).toEqual(matches);
    expect(matches.length).toBeGreaterThan(60);
    expect(matches.every((m) => m.origin === "demo" && m.id.startsWith("DEMO_"))).toBe(true);
    expect(matches.every((m) => Date.parse(m.playedAt) < epoch.getTime())).toBe(true);
  });

  it("yields between 1 and 3 insights with evidence", () => {
    const r = runCoach(matches);
    expect(r.quality.level).toBe("good");
    expect(r.insights.length).toBeGreaterThan(0);
    expect(r.insights.length).toBeLessThanOrEqual(MAX_INSIGHTS);
    for (const i of r.insights) expect(i.evidence.every((e) => e.n > 0)).toBe(true);
  });
});

describe("goals", () => {
  const created = new Date("2026-10-10T00:00:00Z");
  const before = series(15, () => ({ deaths: 7 }), Date.UTC(2026, 9, 5, 18));
  const goal = createGoal({ metric: "deathsPer10", comparator: "atMost", target: 1.5, horizonGames: 5 }, "trend:deathsPer10", before, created, "demo");

  it("records a baseline from recent games", () => {
    expect(goal.baseline).toBeCloseTo((7 * 10) / 30);
  });

  it("only counts games played after creation, same origin", () => {
    const p = evaluateGoal(goal, [...before, makeMatch({ origin: "import", playedAt: "2026-10-11T18:00:00Z" })]);
    expect(p.tracked).toBe(0);
    expect(p.status).toBe("collecting");
  });

  it("moves through on-track → achieved", () => {
    const after = series(5, () => ({ deaths: 3 }), Date.UTC(2026, 9, 11, 18));
    expect(evaluateGoal(goal, [...before, ...after.slice(0, 3)]).status).toBe("on-track");
    const done = evaluateGoal(goal, [...before, ...after]);
    expect(done.status).toBe("achieved");
    expect(done.improvement).toBeGreaterThan(0);
  });

  it("reports missed when target not met over the horizon", () => {
    const after = series(6, () => ({ deaths: 8 }), Date.UTC(2026, 9, 11, 18));
    const p = evaluateGoal(goal, [...before, ...after]);
    expect(p.tracked).toBe(5);
    expect(p.status).toBe("missed");
  });
});

describe("post-game review", () => {
  it("compares with the same role and queue only, before the game", () => {
    const history = series(10, (i) => ({ deaths: 4 + (i % 2), role: "MIDDLE" }));
    const other = series(10, () => ({ deaths: 0, role: "JUNGLE" }));
    const game = makeMatch({ deaths: 12, playedAt: "2026-12-01T18:00:00Z" });
    const lines = postGameReview(game, [...history, ...other, game]);
    const deaths = lines.find((l) => l.metric === "deathsPer10")!;
    expect(deaths.baselineN).toBe(10);
    expect(deaths.verdict).toBe("worse");
  });

  it("says insufficient rather than guessing", () => {
    const game = makeMatch({ playedAt: "2026-12-01T18:00:00Z" });
    expect(postGameReview(game, [game]).every((l) => l.verdict === "insufficient")).toBe(true);
  });

  it("marks metrics that do not apply", () => {
    const game = makeMatch({ queue: "aram", role: null, playedAt: "2026-12-01T18:00:00Z" });
    expect(postGameReview(game, [game]).find((l) => l.metric === "csPerMin")!.verdict).toBe("not-applicable");
  });
});
