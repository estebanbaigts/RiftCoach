// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CSP } from "../config/csp";

/** Guards security invariants so they cannot regress silently. See docs/SECURITY.md. */
const root = new URL("..", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, root), "utf8"));

describe("Tauri security configuration", () => {
  const conf = json("src-tauri/tauri.conf.json");

  it("uses the same production CSP as the web build", () => {
    expect(conf.app.security.csp).toBe(CSP);
  });

  it("allows no remote origin in production", () => {
    expect(CSP).not.toMatch(/https?:|wss?:|\*/);
    expect(CSP).toContain("object-src 'none'");
  });

  it("does not expose the global Tauri object and freezes prototypes", () => {
    expect(conf.app.withGlobalTauri).toBe(false);
    expect(conf.app.security.freezePrototype).toBe(true);
  });

  it("grants no capability permission (any addition must be reviewed and this test updated)", () => {
    expect(json("src-tauri/capabilities/default.json").permissions).toEqual([]);
  });

  it("registers no Tauri plugin", () => {
    const cargo = readFileSync(new URL("src-tauri/Cargo.toml", root), "utf8");
    expect(cargo).not.toMatch(/tauri-plugin-/);
  });
});

describe("secrets", () => {
  it("no Riot API key is committed in tracked files", () => {
    const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
    const offenders = files.filter((f) => /\.(ts|tsx|js|json|toml|md|yml|yaml|rs|html|env|example)$/.test(f) && /RGAPI-[0-9a-f-]{20,}/i.test(readFileSync(new URL(f, root), "utf8")));
    expect(offenders).toEqual([]);
  });
});
