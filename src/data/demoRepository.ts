import { z } from "zod";
import { goalSchema, type Goal } from "../domain/coach/goals";
import { generateDemoDataset, latestEnd, simulateDemoSession, DEMO_SEED } from "../domain/demo/generator";
import { ingestMatches, sortByDateDesc, type IngestReport } from "../domain/ingest";
import type { Match, PlayerProfile } from "../domain/model";
import { readJson, writeJson, type KeyValueStore } from "./storage";

/**
 * Demo data repository. All keys live under the "demo:" namespace so demo state can
 * never leak into a future real-data namespace, and vice versa.
 *
 * - The base dataset is regenerated deterministically from a persisted epoch.
 * - Simulated games are persisted as raw JSON and re-validated on every load.
 * - The demo has a virtual clock: max(epoch, end of the latest game).
 */

const K = {
  epoch: "demo:epoch",
  simulated: "demo:simulated",
  goals: "demo:goals",
} as const;

export interface DemoState {
  profile: PlayerProfile;
  matches: Match[];
  goals: Goal[];
  now: Date;
  /** Report of the last ingestion (base + simulated), surfaced in the UI for transparency. */
  report: IngestReport;
}

const epochSchema = z.iso.datetime({ offset: true });
const rawArraySchema = z.array(z.unknown()).max(5_000);
const goalsSchema = z.array(goalSchema).max(50);

export class DemoRepository {
  constructor(private readonly store: KeyValueStore, private readonly clock: () => Date = () => new Date()) {}

  private epoch(): Date {
    const saved = readJson(this.store, K.epoch, epochSchema);
    if (saved) return new Date(saved);
    const now = this.clock();
    writeJson(this.store, K.epoch, now.toISOString());
    return now;
  }

  load(): DemoState {
    const epoch = this.epoch();
    const base = generateDemoDataset(epoch);
    const baseReport = ingestMatches(base.matches, "demo");
    const simulatedRaw = readJson(this.store, K.simulated, rawArraySchema) ?? [];
    const simReport = ingestMatches(simulatedRaw, "demo", baseReport.accepted);
    const matches = sortByDateDesc([...baseReport.accepted, ...simReport.accepted]);
    const goals = (readJson(this.store, K.goals, goalsSchema) ?? []).filter((g) => g.origin === "demo") as Goal[];
    const now = new Date(Math.max(epoch.getTime(), latestEnd(matches)));
    return {
      profile: base.profile,
      matches,
      goals,
      now,
      report: {
        accepted: matches,
        duplicates: [...baseReport.duplicates, ...simReport.duplicates],
        rejected: [...baseReport.rejected, ...simReport.rejected],
        partial: baseReport.partial + simReport.partial,
      },
    };
  }

  /** Appends a simulated session after the virtual clock. Returns the number of games added. */
  simulateSession(state: DemoState, count = 5): number {
    const existing = readJson(this.store, K.simulated, rawArraySchema) ?? [];
    const raw = simulateDemoSession(state.now, 100_000 + existing.length, count, DEMO_SEED + existing.length + 1);
    const report = ingestMatches(raw, "demo", state.matches);
    writeJson(this.store, K.simulated, [...existing, ...report.accepted]);
    return report.accepted.length;
  }

  saveGoals(goals: readonly Goal[]): boolean {
    return writeJson(this.store, K.goals, goals);
  }

  reset(): void {
    for (const key of Object.values(K)) this.store.remove(key);
  }
}
