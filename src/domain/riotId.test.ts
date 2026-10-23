import { describe, expect, it } from "vitest";
import { isPlatform, parseRiotId, PLATFORMS } from "./riotId";

describe("parseRiotId", () => {
  it.each([
    ["Faker#KR1", { gameName: "Faker", tagLine: "KR1" }],
    ["  Joueur Démo #DEMO ", { gameName: "Joueur Démo", tagLine: "DEMO" }],
    ["a#b#EUW", { gameName: "a#b", tagLine: "EUW" }],
  ])("parses %s", (input, value) => expect(parseRiotId(input)).toEqual({ ok: true, value }));

  it.each([
    ["", "empty"],
    ["NoTag", "missing-tag"],
    ["Name#", "missing-tag"],
    ["#EUW", "missing-tag"],
    ["ab#EUW", "game-name-length"],
    ["Seventeen_chars__#EUW", "game-name-length"],
    ["Name#E", "tag-format"],
    ["Name#E-UW", "tag-format"],
  ])("rejects %s", (input, error) => expect(parseRiotId(input)).toEqual({ ok: false, error }));
});

describe("platforms", () => {
  it("maps every platform to a routing value", () => {
    for (const p of Object.values(PLATFORMS)) expect(["americas", "europe", "asia", "sea"]).toContain(p.match);
    expect(PLATFORMS.EUW1.match).toBe("europe");
    expect(isPlatform("EUW1")).toBe(true);
    expect(isPlatform("toString")).toBe(false);
  });
});
