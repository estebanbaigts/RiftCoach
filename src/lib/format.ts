import { METRICS, type MetricId } from "../domain/metrics";
import type { Locale } from "../i18n";

const tag = (locale: Locale) => (locale === "fr" ? "fr-FR" : "en-GB");

export function formatNumber(value: number, locale: Locale, decimals = 0): string {
  return new Intl.NumberFormat(tag(locale), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatPercent(value: number, locale: Locale, decimals = 0): string {
  return new Intl.NumberFormat(tag(locale), { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/** Formats a metric value with its own precision and unit; em dash when missing. */
export function formatMetric(metric: MetricId | "winrate", value: number | null, locale: Locale): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const def = METRICS[metric];
  return def.kind === "ratio" ? formatPercent(value, locale, def.decimals) : formatNumber(value, locale, def.decimals);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDay(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { day: "2-digit", month: "short" }).format(new Date(iso));
}

/** Prefixes a "+" for positive deltas; Intl already renders the minus sign. */
export function formatSigned(value: number, formatted: string): string {
  return value > 0 ? `+${formatted}` : formatted;
}

/**
 * Signed difference between two values of a metric. Ratio differences are shown in
 * percentage points ("pts"), never as a percentage, to avoid "−10 %" ambiguity.
 */
export function formatMetricDelta(metric: MetricId | "winrate", delta: number, locale: Locale): string {
  const def = METRICS[metric];
  const body = def.kind === "ratio" ? `${formatNumber(delta * 100, locale, 0)} pts` : formatNumber(delta, locale, def.decimals);
  return formatSigned(delta, body);
}
