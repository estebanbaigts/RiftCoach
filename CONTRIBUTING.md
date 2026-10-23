# Contributing to RiftCoach

Thanks for helping! English or French are both fine in issues and PRs.

## Ground rules

1. **Riot policies are a hard gate.** Read [docs/RIOT_COMPLIANCE.md](docs/RIOT_COMPLIANCE.md). PRs adding memory access, in-game hidden information, enemy timers, MMR estimates, lobby scouting or de-anonymisation will be closed. A new feature needs a row in the compliance register.
2. **Never commit a Riot API key** or any secret — not in code, tests, screenshots or logs. Use `.env.local` (git-ignored).
3. **No fake "real" data.** Synthetic data stays in `src/domain/demo`, tagged `origin: "demo"`.
4. **Domain logic is pure** (`src/domain`, no React) and **tested**. Don't delete or weaken tests to make CI pass.
5. **No new Tauri permission or plugin** without a justification in [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) and an update of the guard test.
6. **i18n:** every UI string goes through `t()`, with FR and EN keys (tests enforce parity).
7. **Accessibility:** keyboard reachable, visible focus, meaning not carried by colour alone.

## Workflow

```bash
npm ci
npm run dev
npm run typecheck && npm test && npm run build
```

- Branch from `main`, small focused PRs, Conventional Commit messages (`feat:`, `fix:`, `docs:`…).
- Describe what you verified (tests, platforms, screenshots of demo mode only).
- Significant technical choices get an ADR in [docs/DECISIONS.md](docs/DECISIONS.md).
