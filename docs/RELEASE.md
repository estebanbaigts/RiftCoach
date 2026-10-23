# Release process

1. **Gate.** CI green on `main`. `docs/RIOT_COMPLIANCE.md` updated for every feature in the release. No feature using Riot data ships before the product is approved in the Developer Portal.
2. **Version.** Bump the same version in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` and the Settings screen constant; update `CHANGELOG.md`.
3. **Tag.** `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. **Build.** `.github/workflows/release.yml` builds Windows and macOS (universal) installers and attaches them to a **draft pre-release**.
5. **Verify.** Install on a clean Windows 11 VM and a macOS machine: launch, demo mode, theme/language switch, window resize to 800×600, uninstall. Record SHA-256 of each artifact in the release notes.
6. **Publish** the draft manually.

## Code signing

| Platform | Needed for | Secrets (GitHub → Settings → Secrets) |
|---|---|---|
| macOS | Gatekeeper-friendly install (signing + notarisation) | `APPLE_CERTIFICATE` (base64 .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific), `APPLE_TEAM_ID` |
| Windows | Avoid SmartScreen warnings | Certificate or Azure Trusted Signing — to be decided; see https://v2.tauri.app/distribute/sign/windows/ |

Without secrets the workflow produces **unsigned** artifacts — fine for pre-releases, not for a public 1.0.

## Reproducibility

Pinned npm versions + `package-lock.json`, `Cargo.lock` committed once generated, Node and Rust versions fixed in CI, release action pinned by SHA. Fully bit-for-bit reproducible installers are not guaranteed (timestamps, signing).
