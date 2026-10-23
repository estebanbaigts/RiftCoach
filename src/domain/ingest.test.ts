import { describe, expect, it } from "vitest";
import { makeMatch } from "../../tests/fixtures";
import { ingestMatches, MixedOriginError, sortByDateDesc } from "./ingest";

describe("ingestMatches", () => {
  it("accepts valid records and counts partial ones", () => {
    const r = ingestMatches([makeMatch(), makeMatch({ cs: null })], "demo");
    expect(r.accepted).toHaveLength(2);
    expect(r.partial).toBe(1);
    expect(r.rejected).toHaveLength(0);
  });

  it("rejects invalid rows but keeps the rest (partial import)", () => {
    const bad = { ...makeMatch(), deaths: -1 };
    const unknownField = { ...makeMatch(), apiKey: "should-not-pass" };
    const r = ingestMatches([makeMatch(), bad, unknownField, null, "x"], "demo");
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected.map((x) => x.index)).toEqual([1, 2, 3, 4]);
    expect(r.rejected[0]!.reasons.join(" ")).toMatch(/deaths/);
  });

  it("rejects incoherent data (kills > team kills, absurd duration)", () => {
    const r = ingestMatches([makeMatch({ kills: 30, teamKills: 10 }), makeMatch({ durationSec: 5 })], "demo");
    expect(r.accepted).toHaveLength(0);
    expect(r.rejected).toHaveLength(2);
  });

  it("deduplicates within the batch and against existing data", () => {
    const a = makeMatch();
    const b = makeMatch();
    const r = ingestMatches([a, a, b], "demo", [b]);
    expect(r.accepted.map((m) => m.id)).toEqual([a.id]);
    expect(r.duplicates).toEqual([a.id, b.id]);
  });

  it("never silently mixes demo and real data", () => {
    expect(() => ingestMatches([makeMatch({ origin: "riot-api" })], "demo")).toThrow(MixedOriginError);
  });

  it("sorts newest first by actual time, not string order", () => {
    const a = makeMatch({ playedAt: "2026-10-01T10:00:00+02:00" }); // 08:00Z
    const b = makeMatch({ playedAt: "2026-10-01T09:00:00Z" });
    expect(sortByDateDesc([a, b]).map((m) => m.id)).toEqual([b.id, a.id]);
  });
});
