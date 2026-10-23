import { z } from "zod";
import { QUEUES, ROLES, type DataOrigin, type Match } from "./model";

const count = z.number().int().min(0).max(10_000);
const nullableCount = count.nullable();

/** Strict validation schema. Anything coming from an API, a file or storage passes here first. */
export const matchSchema = z
  .object({
    id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_\-:.]+$/),
    origin: z.enum(["demo", "riot-api", "import"]),
    playedAt: z.iso.datetime({ offset: true }),
    durationSec: z.number().int().min(60).max(4 * 3600),
    queue: z.enum(QUEUES),
    champion: z.string().min(1).max(40),
    role: z.enum(ROLES).nullable(),
    result: z.enum(["win", "loss", "remake"]),
    kills: count,
    deaths: count,
    assists: count,
    cs: nullableCount,
    visionScore: nullableCount,
    goldEarned: z.number().int().min(0).max(200_000).nullable(),
    damageToChampions: z.number().int().min(0).max(1_000_000).nullable(),
    teamKills: nullableCount,
  })
  .strict()
  .refine((m) => m.teamKills === null || m.kills <= m.teamKills, {
    message: "kills cannot exceed teamKills",
    path: ["kills"],
  });

export interface Rejection {
  index: number;
  id: string | null;
  reasons: string[];
}

export interface IngestReport {
  accepted: Match[];
  duplicates: string[];
  rejected: Rejection[];
  /** Records accepted but with at least one missing optional stat. */
  partial: number;
}

export class MixedOriginError extends Error {
  constructor(expected: DataOrigin, found: DataOrigin) {
    super(`Refusing to mix "${found}" records into a "${expected}" dataset`);
    this.name = "MixedOriginError";
  }
}

/**
 * Validates raw records, drops duplicates (against `existing` and within the batch)
 * and refuses records whose origin differs from the dataset origin.
 * Partial imports are allowed: invalid rows are reported, valid rows are kept.
 */
export function ingestMatches(
  raw: readonly unknown[],
  datasetOrigin: DataOrigin,
  existing: readonly Match[] = [],
): IngestReport {
  const seen = new Set(existing.map((m) => m.id));
  const report: IngestReport = { accepted: [], duplicates: [], rejected: [], partial: 0 };

  raw.forEach((item, index) => {
    const parsed = matchSchema.safeParse(item);
    if (!parsed.success) {
      const id = typeof item === "object" && item !== null && "id" in item && typeof item.id === "string" ? item.id : null;
      report.rejected.push({
        index,
        id,
        reasons: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      });
      return;
    }
    const match = parsed.data as Match;
    if (match.origin !== datasetOrigin) throw new MixedOriginError(datasetOrigin, match.origin);
    if (seen.has(match.id)) {
      report.duplicates.push(match.id);
      return;
    }
    seen.add(match.id);
    if (match.cs === null || match.visionScore === null || match.teamKills === null) report.partial += 1;
    report.accepted.push(match);
  });

  return report;
}

/** Newest first — the canonical ordering used across the app. */
export const sortByDateDesc = (matches: readonly Match[]): Match[] =>
  [...matches].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt) || a.id.localeCompare(b.id));
