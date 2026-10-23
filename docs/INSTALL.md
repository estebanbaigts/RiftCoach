# Installation / Installation

## Users / Utilisateurs

No public installer is published yet (pre-release). When available, installers will be attached to GitHub Releases:

- **Windows 10/11**: `.msi` or `-setup.exe`. Until code signing is in place, SmartScreen may warn; verify the SHA-256 published with the release.
- **macOS 11+** (Apple Silicon & Intel, universal): `.dmg`. Public releases will be signed and notarised; unsigned pre-releases require right-click → Open.

Aucun installateur public n'est encore publié. Les installateurs seront joints aux GitHub Releases (Windows `.msi`/`.exe`, macOS `.dmg` universel signé et notarisé pour les versions publiques).

## Developers / Développeurs

### Prerequisites

| | Windows | macOS |
|---|---|---|
| Node.js | ≥ 20.18 (22 LTS recommended) | same |
| Rust | stable via [rustup](https://rustup.rs) (MSVC toolchain) | stable via rustup |
| System | Microsoft C++ Build Tools, WebView2 (preinstalled on Windows 11) | Xcode Command Line Tools (`xcode-select --install`) |

Reference: https://v2.tauri.app/start/prerequisites/

### Run

```bash
npm ci
npm run dev            # UI only, in a browser (demo mode)
npm run tauri dev      # desktop window (requires Rust)
npm run tauri build    # local installer for your OS
```

### Checks before a PR

```bash
npm run typecheck && npm test && npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```
