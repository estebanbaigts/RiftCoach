import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { AppDataProvider, useAppData } from "./app/AppData";
import { usePrefs } from "./app/prefs";
import { href, navigate, useRoute, type Route } from "./app/router";
import { BrandMark, IconCoach, IconDraft, IconDashboard, IconHistory, IconPrep, IconSettings } from "./components/Icons";
import { ToastProvider } from "./components/ui";
import type { KeyValueStore } from "./data/storage";
import { CoachPage } from "./features/coach/CoachPage";
import { DraftPage } from "./features/draft/DraftPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MatchDetailPage } from "./features/matches/MatchDetailPage";
import { MatchesPage } from "./features/matches/MatchesPage";
import { PrepPage } from "./features/prep/PrepPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { I18nProvider, useI18n, type MessageKey } from "./i18n";
import { RIOT_LEGAL_NOTICE } from "./i18n/legal";

const NAV: readonly { route: Route["name"]; key: MessageKey; icon: () => ReactNode; shortcut: string }[] = [
  { route: "dashboard", key: "nav.dashboard", icon: IconDashboard, shortcut: "1" },
  { route: "matches", key: "nav.matches", icon: IconHistory, shortcut: "2" },
  { route: "draft", key: "nav.draft", icon: IconDraft, shortcut: "3" },
  { route: "coach", key: "nav.coach", icon: IconCoach, shortcut: "4" },
  { route: "prep", key: "nav.prep", icon: IconPrep, shortcut: "5" },
  { route: "settings", key: "nav.settings", icon: IconSettings, shortcut: "6" },
];

export function App({ store }: { store: KeyValueStore }) {
  const [prefs, setPrefs] = usePrefs(store);
  return (
    <I18nProvider locale={prefs.locale}>
      <ErrorBoundary>
        <AppDataProvider store={store}>
          <ToastProvider>
            <Shell>
              <Screen prefs={prefs} onPrefs={setPrefs} />
            </Shell>
          </ToastProvider>
        </AppDataProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}

function Screen(props: Parameters<typeof SettingsPage>[0]) {
  const route = useRoute();
  switch (route.name) {
    case "dashboard":
      return <DashboardPage />;
    case "matches":
      return <MatchesPage />;
    case "match":
      return <MatchDetailPage id={route.id} />;
    case "coach":
      return <CoachPage />;
    case "draft":
      return <DraftPage />;
    case "prep":
      return <PrepPage />;
    case "settings":
      return <SettingsPage {...props} />;
  }
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { mode, profile } = useAppData();
  const route = useRoute();
  const section = route.name === "match" ? "matches" : route.name;

  // Alt/Option + 1…6 switches section (avoids clashing with typing and OS shortcuts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const item = NAV.find((n) => e.code === `Digit${n.shortcut}`);
      if (item) {
        e.preventDefault();
        navigate({ name: item.route } as Route);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Move focus to the content region on navigation, for keyboard and screen-reader users.
  const first = useRef(true);
  useEffect(() => {
    const main = document.getElementById("main");
    main?.scrollTo({ top: 0 });
    if (first.current) first.current = false;
    else main?.focus({ preventScroll: true });
  }, [route]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        {t("nav.skip")}
      </a>
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <span>{t("app.name")}</span>
        </div>
        <nav className="nav" aria-label="RiftCoach">
          {NAV.map((n) => (
            <a key={n.route} href={href({ name: n.route } as Route)} aria-current={section === n.route ? "page" : undefined} title={t(n.key)}>
              {n.icon()}
              <span>{t(n.key)}</span>
              <kbd aria-hidden>⌥{n.shortcut}</kbd>
            </a>
          ))}
        </nav>
        <div className="profile-chip">
          <strong>
            {profile.gameName} <span className="faint">#{profile.tagLine}</span>
          </strong>
          <span className="muted">
            {profile.platform}
            {mode === "demo" ? ` · ${t("demo.banner")}` : ""}
          </span>
        </div>
      </aside>
      <main className="main" id="main" tabIndex={-1}>
        {mode === "demo" && (
          <div className="demo-banner" role="note">
            <strong>{t("demo.banner")}</strong>
            <span>{t("demo.bannerDetail")}</span>
          </div>
        )}
        {children}
        <footer className="legal-footer">{RIOT_LEGAL_NOTICE}</footer>
      </main>
    </div>
  );
}

/** Last-resort boundary: shows a calm error without leaking internals. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Local console only: no telemetry. Never log secrets (none exist in demo mode).
    console.error("RiftCoach UI error", error.name, info.componentStack?.split("\n")[1]?.trim());
  }
  override render() {
    return this.state.failed ? <ErrorScreen onRetry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="empty" role="alert" style={{ height: "100%", alignContent: "center" }}>
      <p>{t("common.error")}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        {t("common.retry")}
      </button>
    </div>
  );
}
