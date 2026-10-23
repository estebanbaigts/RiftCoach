import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createGoal, type Goal } from "../domain/coach/goals";
import type { Insight } from "../domain/coach/engine";
import { DemoRepository, type DemoState } from "../data/demoRepository";
import type { KeyValueStore } from "../data/storage";

/** Only "demo" is implemented. The others are declared so the UI can explain why they are unavailable. */
export type AppMode = "demo" | "local-development" | "production";
export const APP_MODES: readonly AppMode[] = ["demo", "local-development", "production"];
export const isModeAvailable = (m: AppMode) => m === "demo";

interface AppData extends DemoState {
  mode: AppMode;
  storageAvailable: boolean;
  adoptGoal: (insight: Insight) => void;
  removeGoal: (id: string) => void;
  simulateSession: () => number;
  resetDemo: () => void;
}

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ store, children }: { store: KeyValueStore; children: ReactNode }) {
  const repo = useMemo(() => new DemoRepository(store), [store]);
  const [state, setState] = useState<DemoState>(() => repo.load());

  const adoptGoal = useCallback(
    (insight: Insight) => {
      setState((s) => {
        if (s.goals.some((g) => g.insightId === insight.id)) return s;
        const goal = createGoal(insight.goal, insight.id, s.matches, s.now, "demo");
        const goals: Goal[] = [...s.goals, goal];
        repo.saveGoals(goals);
        return { ...s, goals };
      });
    },
    [repo],
  );

  const removeGoal = useCallback(
    (id: string) => {
      setState((s) => {
        const goals = s.goals.filter((g) => g.id !== id);
        repo.saveGoals(goals);
        return { ...s, goals };
      });
    },
    [repo],
  );

  const simulateSession = useCallback(() => {
    const added = repo.simulateSession(state);
    setState(repo.load());
    return added;
  }, [repo, state]);

  const resetDemo = useCallback(() => {
    repo.reset();
    setState(repo.load());
  }, [repo]);

  const value = useMemo<AppData>(
    () => ({ ...state, mode: "demo", storageAvailable: store.available, adoptGoal, removeGoal, simulateSession, resetDemo }),
    [state, store.available, adoptGoal, removeGoal, simulateSession, resetDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
