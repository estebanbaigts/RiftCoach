import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { en } from "./en";
import { fr, type Dictionary, type MessageKey } from "./fr";

export type Locale = "fr" | "en";
export const LOCALES: readonly Locale[] = ["fr", "en"];
const DICTS: Record<Locale, Dictionary> = { fr, en };

export type Params = Record<string, string | number>;

const PLURALS: Record<Locale, Intl.PluralRules> = { fr: new Intl.PluralRules("fr"), en: new Intl.PluralRules("en") };

/**
 * Pure formatter, usable outside React (and in tests). Missing params are left visible.
 * Plurals: "singular|plural" templates pick a form from the numeric `n` param.
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  let template: string = DICTS[locale][key] ?? fr[key];
  if (template.includes("|") && typeof params?.n === "number") {
    const [one, other] = template.split("|") as [string, string];
    template = PLURALS[locale].select(params.n) === "one" ? one : other;
  }
  if (!params) return template;
  const fmt = (v: string | number) => (typeof v === "number" ? v.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB") : v);
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? fmt(params[name] as string | number) : whole));
}

interface I18n {
  locale: Locale;
  t: (key: MessageKey, params?: Params) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = useCallback((key: MessageKey, params?: Params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export type { MessageKey };
