import { describe, expect, it } from "vitest";
import { makeMatch } from "../../../tests/fixtures";
import { applyFilters, DEFAULT_FILTERS } from "./filters";

describe("history filters", () => {
  const a = makeMatch({ champion: "Lee Sin", role: "JUNGLE", result: "loss", durationSec: 2400, kills: 1, deaths: 5, assists: 1 });
  const b = makeMatch({ champion: "Ahri", role: "MIDDLE", result: "win", durationSec: 1500 });
  const c = makeMatch({ champion: "Jinx", role: null, queue: "aram", result: "win" });

  it("searches accent- and case-insensitively", () => {
    expect(applyFilters([a, b, c], { ...DEFAULT_FILTERS, query: "LEE" }).map((m) => m.id)).toEqual([a.id]);
    expect(applyFilters([makeMatch({ champion: "Kai'Sa" })], { ...DEFAULT_FILTERS, query: "kai" })).toHaveLength(1);
  });

  it("filters by result, queue and missing role", () => {
    expect(applyFilters([a, b, c], { ...DEFAULT_FILTERS, result: "win" })).toHaveLength(2);
    expect(applyFilters([a, b, c], { ...DEFAULT_FILTERS, queue: "aram" }).map((m) => m.id)).toEqual([c.id]);
    expect(applyFilters([a, b, c], { ...DEFAULT_FILTERS, role: "none" }).map((m) => m.id)).toEqual([c.id]);
  });

  it("sorts by date (default), duration and KDA without mutating input", () => {
    const input = [a, b, c];
    expect(applyFilters(input, DEFAULT_FILTERS).map((m) => m.id)).toEqual([c.id, b.id, a.id]);
    expect(applyFilters(input, { ...DEFAULT_FILTERS, sort: "duration" })[0]!.id).toBe(a.id);
    expect(applyFilters(input, { ...DEFAULT_FILTERS, sort: "kda" }).at(-1)!.id).toBe(a.id);
    expect(input.map((m) => m.id)).toEqual([a.id, b.id, c.id]);
  });
});
