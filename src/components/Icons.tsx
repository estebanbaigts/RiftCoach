/** Original line icons (16px grid, currentColor). */
const base = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconDashboard = () => (
  <svg {...base}>
    <rect x="2" y="2" width="5" height="6" rx="1" />
    <rect x="9" y="2" width="5" height="3" rx="1" />
    <rect x="9" y="7" width="5" height="7" rx="1" />
    <rect x="2" y="10" width="5" height="4" rx="1" />
  </svg>
);
export const IconHistory = () => (
  <svg {...base}>
    <path d="M3 4h10M3 8h10M3 12h6" />
  </svg>
);
export const IconCoach = () => (
  <svg {...base}>
    <path d="M2 12l3.5-4 3 2.5L14 4" />
    <path d="M10.5 4H14v3.5" />
  </svg>
);
export const IconPrep = () => (
  <svg {...base}>
    <rect x="3" y="2" width="10" height="12" rx="1.5" />
    <path d="M6 5.5h4M6 8h4M6 10.5h2" />
  </svg>
);
export const IconSettings = () => (
  <svg {...base}>
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
  </svg>
);
export const IconBack = () => (
  <svg {...base}>
    <path d="M10 3L5 8l5 5" />
  </svg>
);
export const IconArrowUp = () => (
  <svg {...base} width={12} height={12}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
);
export const IconArrowDown = () => (
  <svg {...base} width={12} height={12}>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
);

/** Brand mark: two offset arcs meeting at a point — a path converging, not a game asset. */
export const BrandMark = () => (
  <svg className="brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M4 19c2-8 6-12 16-14" />
    <path d="M4 19c5-2 9-5 11-10" opacity="0.55" />
    <circle cx="20" cy="5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
