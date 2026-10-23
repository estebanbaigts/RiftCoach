# Technical decisions (ADR log)

Each entry: context → decision → consequences. Status: Accepted / Proposed / Superseded.

## ADR-001 — Toolchain versions (Accepted, 2026-10-23)

**Context.** Latest Vite (8.x) requires Node ≥ 20.19; the reference dev machine has Node 20.18. TypeScript 7 (native compiler) is very recent. Vitest ≤ 4.1.10 has critical advisories (`tinypool` prototype pollution → RCE, `@vitest/mocker` path traversal).

**Decision.** Pin exact versions: Vite 6.4.5, React 19.3.1, TypeScript 5.9.3 (strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`), Vitest 4.1.12, zod 4.6.7, Tauri 2.12 (CLI 2.12.4, crate 2.12 / tauri-build 2.7). CI uses Node 22.

**Consequences.** `npm audit`: 0 vulnerabilities at adoption. Upgrading to Vite 8 / Vitest 5 requires Node ≥ 22.12 for all contributors — revisit when bumping the minimum Node.

## ADR-002 — Pure domain layer (Accepted)

Business calculations live in `src/domain`, framework-free, so they can be unit-tested, reused by a CLI or ported to Rust. React only renders.

## ADR-003 — No chart library (Accepted)

A ~120-line SVG line chart and CSS bar lists cover the MVP. Saves ~150 kB+ of JS, works offline, themable with tokens, keyboard-inspectable. Revisit if we need complex charts.

## ADR-004 — Hash router, no dependency (Accepted)

Six routes. A 40-line hash router behaves identically in the browser and the Tauri webview (no server rewrites).

## ADR-005 — Demo storage in webview, SQLite later (Accepted, temporary)

**Context.** The Rust toolchain was not available on the dev machine, so no Rust storage could be compiled or tested.

**Decision.** Demo state (epoch, simulated games, goals) is small and lives in namespaced, schema-validated `localStorage` behind a `KeyValueStore` interface. The SQLite schema is designed (`src-tauri/migrations/0001_init.sql`) and validated with `sqlite3`, but not wired.

**Consequences.** Real data (step 7) **must** use the Rust SQLite repository, not webview storage.

## ADR-006 — Demo virtual clock (Accepted)

Simulated games are appended after the latest game, and "now" in demo mode is the end of that game. This keeps goal tracking consistent (games always occur after the goal's creation) without generating future-dated data relative to the dataset.

## ADR-007 — Licence (Proposed)

**Options.**
- **Apache-2.0** — permissive, explicit patent grant, compatible with Tauri (MIT/Apache) and the npm ecosystem; allows forks, including closed ones.
- **MIT** — simplest permissive; no patent clause.
- **GPL-3.0 / AGPL-3.0** — keeps derivatives open; may discourage some contributors and complicates mixing with permissive ecosystems; AGPL relevant only if a hosted service is built.

**Recommendation.** Apache-2.0: the app is a client, the ecosystem is permissive, and the patent grant protects contributors. Riot's IP terms apply independently of the code licence (no Riot assets are bundled).

**Status.** Awaiting maintainer confirmation; no `LICENSE` file until then.

## ADR-008 — Coaching thresholds (Accepted)

Thresholds are constants in `src/domain/coach/engine.ts`: ≥ 10 completed games for any insight; trend = last 15 vs previous ≤ 40 eligible games, Cohen's d ≥ 0.35 **and** ≥ 5 % relative gap (prevents float-noise "trends"); tilt = two-proportion z ≥ 1; pool heuristic never "high" confidence. These are heuristics, not science: they are documented, tested, and should be tuned with real (consented) data.

## ADR-009 — CSP and permissions (Accepted)

Single CSP source (`config/csp.ts`), injected at build time and mirrored in `tauri.conf.json`; parity enforced by tests. Zero Tauri permissions, no plugins. Any change must update `docs/SECURITY_MODEL.md` and the guard test.
