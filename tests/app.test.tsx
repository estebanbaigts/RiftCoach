import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { memoryStore, writeJson } from "../src/data/storage";

function renderApp(locale: "fr" | "en" = "en") {
  const store = memoryStore();
  writeJson(store, "prefs", { theme: "system", locale });
  render(<App store={store} />);
  return store;
}

const go = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

describe("App (demo mode, integration)", () => {
  beforeEach(() => {
    window.location.hash = "#/";
  });

  it("always shows the demo label and the Riot legal notice", () => {
    renderApp("fr");
    expect(screen.getAllByText("Données de démonstration").length).toBeGreaterThan(0);
    expect(screen.getByText(/not endorsed by Riot Games/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeInTheDocument();
  });

  it("renders KPIs with their sample size", () => {
    renderApp();
    const winrate = screen.getByRole("region", { name: "Win rate" });
    expect(within(winrate).getByText(/\d+ games · 95% CI/)).toBeInTheDocument();
  });

  it("navigates to the coach, adopts a goal and tracks it after a simulated session", () => {
    const store = renderApp();
    go("#/coach");
    const adopt = screen.getAllByRole("button", { name: "Adopt this goal" })[0]!;
    fireEvent.click(adopt);
    expect(screen.getAllByRole("button", { name: "Goal tracked" }).length).toBeGreaterThan(0);
    expect(store.get("demo:goals")).toContain("goal:");
    fireEvent.click(screen.getByRole("button", { name: /Simulate a session/ }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).not.toBe("0");
  });

  it("opens a match from the history with the keyboard", () => {
    renderApp();
    go("#/matches");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(50);
    fireEvent.keyDown(rows[0]!, { key: "Enter" });
    expect(window.location.hash).toMatch(/^#\/matches\/DEMO_/);
  });

  it("champion select: labels demo stats, reacts to the opponent and to bans", () => {
    renderApp();
    go("#/draft");
    expect(screen.getAllByText("Fictional aggregate statistics").length).toBeGreaterThan(0);
    const select = screen.getByRole("combobox", { name: "Lane opponent" });
    fireEvent.change(select, { target: { value: "Zed" } });
    expect(screen.getByRole("heading", { name: /Against Zed/ })).toBeInTheDocument();
    const cards = () => screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(cards()).not.toContain("Zed");
    const first = cards()[0]!;
    fireEvent.click(screen.getByRole("button", { name: first, pressed: false }));
    expect(cards()).not.toContain(first);
  });
});
