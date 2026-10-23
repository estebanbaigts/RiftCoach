import { useId, useState, type FormEvent } from "react";
import { APP_MODES, isModeAvailable, useAppData } from "../../app/AppData";
import type { Prefs } from "../../app/prefs";
import { Segmented, useToast } from "../../components/ui";
import { parseRiotId, PLATFORMS, type Platform } from "../../domain/riotId";
import { LOCALES, useI18n, type Locale } from "../../i18n";
import { RIOT_LEGAL_NOTICE } from "../../i18n/legal";

const VERSION = "0.1.0";

export function SettingsPage({ prefs, onPrefs }: { prefs: Prefs; onPrefs: (p: Partial<Prefs>) => void }) {
  const { t } = useI18n();
  const { mode, profile, resetDemo } = useAppData();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t("settings.title")}</h1>
      </header>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="mode-title">
          <div className="card-head">
            <h2 id="mode-title">{t("settings.mode")}</h2>
          </div>
          <div className="mode-list" role="radiogroup" aria-labelledby="mode-title">
            {APP_MODES.map((m) => {
              const available = isModeAvailable(m);
              const active = m === mode;
              return (
                <div key={m} className="mode-option" role="radio" aria-checked={active} aria-disabled={!available} data-active={active}>
                  <span className="dot" style={{ color: active ? "var(--accent)" : "var(--border-strong)" }} aria-hidden />
                  <div>
                    <strong>{t(`settings.mode.${m}`)}</strong>
                    <p className="muted" style={{ fontSize: "var(--fs-13)" }}>
                      {t(`settings.mode.${m}.desc`)}
                    </p>
                  </div>
                  <span className={active ? "badge badge-accent" : "badge"}>{active ? t("settings.mode.active") : t("settings.mode.unavailable")}</span>
                </div>
              );
            })}
          </div>
        </section>

        <ProfileCard current={`${profile.gameName}#${profile.tagLine} · ${profile.platform}`} />

        <section className="card" aria-labelledby="appearance-title">
          <div className="card-head">
            <h2 id="appearance-title">{t("settings.appearance")}</h2>
          </div>
          <div className="grid">
            <div className="field">
              <span>{t("settings.theme")}</span>
              <Segmented<Prefs["theme"]>
                label={t("settings.theme")}
                value={prefs.theme}
                onChange={(theme) => onPrefs({ theme })}
                options={[
                  { value: "system", label: t("settings.theme.system") },
                  { value: "light", label: t("settings.theme.light") },
                  { value: "dark", label: t("settings.theme.dark") },
                ]}
              />
            </div>
            <div className="field">
              <span>{t("settings.language")}</span>
              <Segmented<Locale>
                label={t("settings.language")}
                value={prefs.locale}
                onChange={(locale) => onPrefs({ locale })}
                options={LOCALES.map((l) => ({ value: l, label: l === "fr" ? "Français" : "English" }))}
              />
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="data-title">
          <div className="card-head">
            <h2 id="data-title">{t("settings.data")}</h2>
          </div>
          <p className="muted" style={{ marginBottom: 12 }}>
            {t("settings.data.desc")}
          </p>
          {confirming ? (
            <div role="alertdialog" aria-labelledby="reset-q" className="notice notice-warn" style={{ display: "grid", gap: 8 }}>
              <p id="reset-q">{t("settings.data.resetDemo.confirm")}</p>
              <div className="form-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  autoFocus
                  onClick={() => {
                    resetDemo();
                    setConfirming(false);
                    toast(t("settings.data.done"));
                  }}
                >
                  {t("settings.data.resetDemo")}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setConfirming(false)}>
                  {t("common.close")}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirming(true)}>
              {t("settings.data.resetDemo")}
            </button>
          )}
          <h3 className="kicker" style={{ marginTop: 20 }}>
            {t("settings.privacy")}
          </h3>
          <p className="muted" style={{ fontSize: "var(--fs-13)" }}>
            {t("settings.privacy.list")}
          </p>
        </section>
      </div>

      <section className="card" aria-labelledby="about-title">
        <div className="card-head">
          <h2 id="about-title">{t("settings.about")}</h2>
          <span className="muted">{t("settings.version", { version: VERSION })}</span>
        </div>
        <p className="muted" style={{ fontSize: "var(--fs-13)" }}>
          {RIOT_LEGAL_NOTICE}
        </p>
      </section>
    </div>
  );
}

function ProfileCard({ current }: { current: string }) {
  const { t } = useI18n();
  const [riotId, setRiotId] = useState("");
  const [platform, setPlatform] = useState<Platform>("EUW1");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const errId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = parseRiotId(riotId);
    if (!r.ok) setMessage({ ok: false, text: t(`settings.riotIdError.${r.error}`) });
    // Demo mode: validation only. No request is made — see docs/RIOT_COMPLIANCE.md (F3).
    else setMessage({ ok: true, text: t("settings.profile.valid", { name: `${r.value.gameName}#${r.value.tagLine}`, region: PLATFORMS[platform].label }) });
  };

  return (
    <section className="card" aria-labelledby="profile-title">
      <div className="card-head">
        <h2 id="profile-title">{t("settings.profile")}</h2>
      </div>
      <p style={{ marginBottom: 12 }}>
        <span className="kicker">{t("settings.profile.current")} · </span>
        {current}
      </p>
      <form className="form-row" onSubmit={submit} noValidate>
        <label className="field" style={{ flex: "1 1 180px" }}>
          <span>{t("settings.profile.riotId")}</span>
          <input
            className="input"
            value={riotId}
            maxLength={22}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("settings.profile.riotId.placeholder")}
            aria-invalid={message ? !message.ok : undefined}
            aria-describedby={errId}
            onChange={(e) => setRiotId(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("settings.profile.region")}</span>
          <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
              <option key={p} value={p}>
                {PLATFORMS[p].label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">
          {t("settings.profile.lookup")}
        </button>
      </form>
      <p id={errId} role="status" style={{ marginTop: 8, fontSize: "var(--fs-13)", color: message ? (message.ok ? "var(--win)" : "var(--loss)") : undefined }}>
        {message?.text}
      </p>
      <p className="notice" style={{ marginTop: 8 }}>
        {t("settings.profile.demoOnly")}
      </p>
    </section>
  );
}
