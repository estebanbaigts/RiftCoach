import { describe, expect, it } from "vitest";
import { en } from "./en";
import { fr } from "./fr";
import { translate } from "./index";

describe("i18n", () => {
  it("English provides every French key, none empty", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    for (const v of Object.values(en)) expect(v.trim()).not.toBe("");
  });

  it("uses the same placeholders in both languages", () => {
    const ph = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    for (const k of Object.keys(fr) as (keyof typeof fr)[]) expect([k, ph(en[k])]).toEqual([k, ph(fr[k])]);
  });

  it("interpolates and pluralises", () => {
    expect(translate("fr", "dash.remakes", { n: 1 })).toBe("1 remake exclu");
    expect(translate("fr", "dash.remakes", { n: 0 })).toBe("0 remake exclu"); // French: 0 is singular
    expect(translate("en", "dash.remakes", { n: 0 })).toBe("0 remakes excluded");
    expect(translate("en", "metric.sample", { n: 2 })).toBe("2 games");
    expect(translate("en", "coach.goal.atMost", { metric: "X" })).toContain("{target}");
    expect(translate("fr", "metric.sample", { n: 132624 })).toMatch(/^132\s624 parties$/);
    expect(translate("en", "metric.sample", { n: 132624 })).toBe("132,624 games");
  });
});
