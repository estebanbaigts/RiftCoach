/**
 * Riot ID parsing and platform → routing mapping. No network access here:
 * this only prepares the values a future connector will need (Account-v1 by Riot ID,
 * then PUUID-based endpoints — never the deprecated by-name endpoints).
 * Regional groupings must be re-checked against developer.riotgames.com before use.
 */

export interface RiotId {
  gameName: string;
  tagLine: string;
}

export type RiotIdError = "empty" | "missing-tag" | "game-name-length" | "tag-format";

export type ParseResult = { ok: true; value: RiotId } | { ok: false; error: RiotIdError };

export function parseRiotId(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "empty" };
  const hash = trimmed.lastIndexOf("#");
  if (hash <= 0 || hash === trimmed.length - 1) return { ok: false, error: "missing-tag" };
  const gameName = trimmed.slice(0, hash).trim();
  const tagLine = trimmed.slice(hash + 1).trim();
  if ([...gameName].length < 3 || [...gameName].length > 16) return { ok: false, error: "game-name-length" };
  if (!/^[\p{L}\p{N}]{3,5}$/u.test(tagLine)) return { ok: false, error: "tag-format" };
  return { ok: true, value: { gameName, tagLine } };
}

export const PLATFORMS = {
  BR1: { label: "Brazil", match: "americas", account: "americas" },
  LA1: { label: "Latin America North", match: "americas", account: "americas" },
  LA2: { label: "Latin America South", match: "americas", account: "americas" },
  NA1: { label: "North America", match: "americas", account: "americas" },
  EUW1: { label: "Europe West", match: "europe", account: "europe" },
  EUN1: { label: "Europe Nordic & East", match: "europe", account: "europe" },
  TR1: { label: "Türkiye", match: "europe", account: "europe" },
  ME1: { label: "Middle East", match: "europe", account: "europe" },
  RU: { label: "Russia", match: "europe", account: "europe" },
  KR: { label: "Korea", match: "asia", account: "asia" },
  JP1: { label: "Japan", match: "asia", account: "asia" },
  OC1: { label: "Oceania", match: "sea", account: "asia" },
  SG2: { label: "Singapore, Malaysia & Indonesia", match: "sea", account: "asia" },
  TW2: { label: "Taiwan, Hong Kong & Macao", match: "sea", account: "asia" },
  VN2: { label: "Vietnam", match: "sea", account: "asia" },
} as const satisfies Record<string, { label: string; match: "americas" | "europe" | "asia" | "sea"; account: "americas" | "europe" | "asia" }>;

export type Platform = keyof typeof PLATFORMS;

export const isPlatform = (x: string): x is Platform => Object.hasOwn(PLATFORMS, x);
