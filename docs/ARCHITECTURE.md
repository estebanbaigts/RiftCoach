# Architecture

## Layers

```
┌───────────────────────────────────────────────────────────────┐
│ src/features/*   React screens (dashboard, matches, coach,    │
│                  prep, settings) — presentation only          │
│ src/components   shared UI primitives, SVG chart              │
│ src/app          app state (AppData), prefs, hash router      │
├───────────────────────────────────────────────────────────────┤
│ src/data         repositories & storage adapters              │
│                  demoRepository → KeyValueStore (namespaced)  │
├───────────────────────────────────────────────────────────────┤
│ src/domain       PURE TypeScript — no React, no I/O           │
│   model.ts       Match, origins, queues, roles                │
│   ingest.ts      zod validation, dedup, origin isolation      │
│   metrics.ts     metric registry (eligibility + aggregation)  │
│   stats.ts       Wilson CI, windows, rolling series, deltas   │
│   coach/         engine (rules), goals, post-game review      │
│   demo/          deterministic synthetic dataset generator    │
│   riotId.ts      Riot ID parsing, platform routing            │
├───────────────────────────────────────────────────────────────┤
│ src-tauri        Rust shell: window only, no commands/plugins │
│   migrations/    SQLite schema v1 (designed, not wired)       │
└───────────────────────────────────────────────────────────────┘
```

Rules:

- `src/domain` never imports from React, `src/app`, `src/data` or `src/features`.
- Anything from an API, a file or storage goes through `ingestMatches()` (or a zod schema) **before** use.
- The coach engine returns i18n keys + parameters, never sentences.
- Metrics declare their own eligibility: a missing stat removes the game from that metric's sample and the UI shows the exclusion count.

## Data flow (demo mode)

1. `DemoRepository.load()` reads the persisted epoch (or creates it), regenerates the dataset deterministically, ingests it, then ingests persisted simulated games against it.
2. The virtual clock is `max(epoch, end of latest game)`. Goals use it as their creation time, so simulated sessions always count toward them.
3. Screens derive everything with pure functions (`summarize`, `rollingSeries`, `runCoach`, `evaluateGoal`, `postGameReview`), memoised with `useMemo`.

## Data separation

- Every `Match` and `Goal` carries an `origin` (`demo` | `riot-api` | `import`).
- `ingestMatches(raw, datasetOrigin)` throws `MixedOriginError` if a record's origin differs.
- Storage keys are namespaced (`riftcoach:v1:demo:*`). The future real-data namespace will be separate; the SQLite schema keys matches by `(origin, id)`.

## Modes

`demo` (implemented) · `local-development` (step 7, developer's own key in the OS keychain, Rust-side HTTP only) · `production` (only after Riot approval; key held server-side by a controlled service). See [RIOT_COMPLIANCE.md](RIOT_COMPLIANCE.md) §3.

## Planned Rust boundary (step 7)

When real data arrives, network calls and the key live in Rust, never in the webview:

- `riot_lookup_account(riotId, platform)`, `riot_fetch_matches(puuid, cursor)` commands, each with a dedicated capability.
- Rate limiting honours `X-App-Rate-Limit` / `X-Method-Rate-Limit` / `Retry-After`; no retries that exceed limits.
- Keys in the OS keychain; never logged, never returned to the frontend.
- The CSP stays `connect-src 'self'`: the webview never talks to Riot directly.

## Testing

- Unit tests next to the domain code (`*.test.ts`).
- `tests/app.test.tsx`: integration test rendering the whole app in jsdom.
- `tests/security-config.test.ts`: CSP parity, zero permissions, no plugin, no committed Riot key.
- CI builds and lints the Rust shell on macOS, Windows and Linux.
