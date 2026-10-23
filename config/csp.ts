/**
 * Strict CSP for production bundles: no remote code, no inline scripts, no network.
 * Single source of truth, mirrored in src-tauri/tauri.conf.json (checked by
 * tests/security-config.test.ts).
 */
export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
