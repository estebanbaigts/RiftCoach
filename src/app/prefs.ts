import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { readJson, writeJson, type KeyValueStore } from "../data/storage";
import type { Locale } from "../i18n";

export type Theme = "system" | "light" | "dark";

const prefsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  locale: z.enum(["fr", "en"]),
});
export type Prefs = z.infer<typeof prefsSchema>;

const KEY = "prefs";

function defaultLocale(): Locale {
  try {
    return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
  } catch {
    return "fr";
  }
}

export function usePrefs(store: KeyValueStore) {
  const [prefs, setPrefs] = useState<Prefs>(() => readJson(store, KEY, prefsSchema) ?? { theme: "system", locale: defaultLocale() });

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", prefs.theme);
    root.lang = prefs.locale;
  }, [prefs]);

  const update = useCallback(
    (patch: Partial<Prefs>) =>
      setPrefs((p) => {
        const next = { ...p, ...patch };
        writeJson(store, KEY, next);
        return next;
      }),
    [store],
  );

  return [prefs, update] as const;
}
