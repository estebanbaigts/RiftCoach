# RiftCoach

**Open-source, local-first League of Legends progression companion.**
Understand your performance, spot recurring areas to work on, and turn them into measurable goals — from your own games.

🇫🇷 [Lire en français](README.fr.md)

> **Status: early prototype (v0.1, demo mode only).** RiftCoach currently runs on clearly-labelled **synthetic demo data**. No Riot API integration is enabled yet: it will be, only after the product is registered with and approved by Riot Games. See [docs/RIOT_COMPLIANCE.md](docs/RIOT_COMPLIANCE.md).

## What works today

| Area | State |
|---|---|
| Dashboard — games, win rate with 95% Wilson interval, KDA, CS/min, avg duration, 7/30-day progress, rolling trend, champions & roles | ✅ demo data, unit-tested |
| Match history — search, filters, sort, partial-data flags, match detail | ✅ demo data |
| Post-game review vs your own same-role baseline | ✅ demo data (labelled simulated) |
| Coach — deterministic rules, data-quality gate, ≤ 3 areas, evidence + confidence, measurable goals, tracking | ✅ |
| Preparation sheets — options and trade-offs per role, your champion stats | ✅ original content; Data Dragon not integrated |
| FR / EN, light / dark, keyboard navigation | ✅ |
| Riot ID / region validation | ✅ validation only, **no request sent** |
| Real data (Riot API) | ⛔ not implemented — gated on Riot approval |
| Native desktop build (Tauri) | ⚠️ configured; compiled in CI, not yet verified on a release machine |
| SQLite storage | ⚠️ schema designed (`src-tauri/migrations`), not wired |

## Principles

- **Local-first.** No account, no telemetry, no external AI service. Everything stays on your machine.
- **Honest numbers.** Every metric states its period, definition and sample size. Missing data is excluded, never guessed.
- **Coaching, not commands.** Observations describe associations, not causes. Suggestions are options with trade-offs.
- **Riot policies first.** No memory reading, no in-game hidden information, no MMR calculators, no scouting, no de-anonymisation.

## Quick start (web preview of the UI)

Requires Node.js ≥ 20.18.

```bash
npm ci
npm run dev        # http://127.0.0.1:1420
npm test           # 64 tests
npm run build
```

Desktop app: see [docs/INSTALL.md](docs/INSTALL.md) (needs the Rust toolchain).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Technical decisions](docs/DECISIONS.md) · [Design system](docs/DESIGN_SYSTEM.md)
- [Riot compliance register](docs/RIOT_COMPLIANCE.md) · [Security model](docs/SECURITY_MODEL.md) · [Privacy](docs/PRIVACY.md)
- [Install (Windows / macOS)](docs/INSTALL.md) · [Release process](docs/RELEASE.md)
- [Contributing](CONTRIBUTING.md) · [Reporting a vulnerability](SECURITY.md)

## Licence

[Apache-2.0](LICENSE) — see [ADR-007](docs/DECISIONS.md#adr-007--licence-accepted). The licence covers RiftCoach's code only; Riot Games' IP is governed by Riot's own terms.

## Legal

RiftCoach is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
