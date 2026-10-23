# Security model

## Threats considered

| Threat | Mitigation |
|---|---|
| Malicious or malformed data (API, import, tampered storage) | zod schemas with `.strict()` (unknown fields rejected), numeric bounds, coherence checks; invalid rows reported, never trusted. |
| Webview compromise → OS access | No Tauri commands, no plugins, empty capability, `withGlobalTauri: false`, `freezePrototype: true`. The frontend cannot run system commands. |
| Remote code / exfiltration | CSP `default-src 'self'; script-src 'self'; connect-src 'self'` in production, no remote fonts/scripts, no telemetry. |
| API key leakage | No key exists in demo mode. Planned: key in OS keychain, used only in Rust, never sent to the webview, never logged. Test scans tracked files for `RGAPI-` keys. `.gitignore` excludes `.env*` and local config. |
| Supply chain | Exact pinned npm versions, lockfile, `npm audit --audit-level=high` in CI, release action pinned by commit SHA, minimal dependency set (react, react-dom, zod). |
| Error leakage | Error boundary shows a generic message; console logs only error name and component location. |

## Permission register

| Permission / capability | Justification | Added |
|---|---|---|
| *(none)* | The UI uses no Tauri API. | — |

Any new entry requires: purpose, the narrowest permission scope, a compliance check in `RIOT_COMPLIANCE.md`, and an update of `tests/security-config.test.ts`.

## Logging policy

Never log API keys, tokens, PUUIDs paired with Riot IDs, or raw API responses. Errors are logged locally only.
