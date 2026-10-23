# Design system — "Slate & Signal"

Original visual identity for RiftCoach. It intentionally avoids the gold/blue "hextech" look of the game and the branding of existing companion apps.

## Intent

Calm, legible, data-first. Neutral graphite (dark) / warm paper (light) surfaces, **one** accent (verdigris), two outcome signals (win / loss) and one caution colour (demo, partial data). No glows, no gradients except the demo hatch.

## Tokens (`src/styles/tokens.css`)

| Group | Tokens |
|---|---|
| Surfaces | `--bg`, `--surface`, `--surface-2`, `--surface-hover`, `--border`, `--border-strong` |
| Text | `--text`, `--text-muted`, `--text-faint` |
| Accent | `--accent`, `--accent-strong`, `--accent-soft`, `--on-accent`, `--focus` |
| Signals | `--win(-soft)`, `--loss(-soft)`, `--warn(-soft)` |
| Type | system UI stack; scale 11/12/13/14/16/20/28; tabular numbers for all figures |
| Space | 4-px scale `--sp-1…10` |
| Radius | 6 / 10 / 14 |
| Motion | `--dur-fast` 120 ms, `--dur-base` 180 ms; zeroed under `prefers-reduced-motion` |

Themes: system by default; forced via `data-theme="light|dark"` on `<html>`.

## Rules

- Colour never carries meaning alone: results have text badges, deltas have arrows and words ("improving / declining").
- Every metric shows period, sample size and an accessible definition toggle.
- Demo mode: persistent hatched banner + "Demo data" in the profile chip + "simulated" badge on reviews.
- Empty, partial and insufficient-data states are explicit, never blank.
- Focus ring: 2 px `--focus`, always visible on keyboard focus.
- Keyboard: Alt/⌥+1…5 sections, `/` search, Enter opens a match, Esc goes back, arrows inspect charts.
- Responsive: sidebar collapses to icons under 860 px; minimum window 800×600.

## Components

`Kpi`, `Segmented`, `ResultBadge`, `ConfidenceMeter`, `BarList`, `LineChart`, `EmptyState`, `Toast` — see `src/components`.
