import { useEffect, useState } from "react";

/** Minimal hash router: no dependency, works identically in a browser and in the Tauri webview. */
export type Route =
  | { name: "dashboard" }
  | { name: "matches" }
  | { name: "match"; id: string }
  | { name: "coach" }
  | { name: "draft" }
  | { name: "prep" }
  | { name: "settings" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head, arg] = path.split("/");
  switch (head) {
    case "matches":
      return arg ? { name: "match", id: decodeURIComponent(arg) } : { name: "matches" };
    case "coach":
    case "draft":
    case "prep":
    case "settings":
      return { name: head };
    default:
      return { name: "dashboard" };
  }
}

export const href = (r: Route): string => (r.name === "match" ? `#/matches/${encodeURIComponent(r.id)}` : `#/${r.name}`);

export const navigate = (r: Route) => {
  window.location.hash = href(r);
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
