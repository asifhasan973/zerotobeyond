export type ShelterPhase =
  | "waiting"
  | "alert"
  | "shielding"
  | "crew"
  | "monitoring"
  | "checks"
  | "complete";
export type ShelterItem = "water" | "food" | "supplies";
export type ShelterCheck = "power" | "navigation" | "radio";
export interface ShelterSnapshot {
  phase: ShelterPhase;
  intro?: 0 | 1 | 2;
  clearAcknowledged?: boolean;
  bundles: ShelterItem[];
  crew: number[];
  monitoring: number;
  checks: ShelterCheck[];
}
export interface ShelterState extends ShelterSnapshot {
  history: ShelterSnapshot[];
}
export type ShelterAction =
  | { kind: "review-checks" }
  | { kind: "briefing-next" }
  | { kind: "start" }
  | { kind: "place"; item: ShelterItem; slot: ShelterItem }
  | { kind: "crew"; member: number }
  | { kind: "monitor" }
  | { kind: "check"; system: ShelterCheck }
  | { kind: "finish" }
  | { kind: "back" }
  | { kind: "replay" };
export const SHELTER_WAIT_SECONDS = 20;
export const emptyShelter = (): ShelterState => ({
  phase: "waiting",
  intro: 0,
  bundles: [],
  crew: [],
  monitoring: 0,
  checks: [],
  history: [],
});
export const shelterActive = (s?: ShelterState) =>
  !!s && !["waiting", "complete"].includes(s.phase);
export function reduceShelter(
  s: ShelterState,
  action: ShelterAction,
): ShelterState {
  if (!action || typeof action !== "object") return s;
  if (action.kind === "replay") return { ...emptyShelter(), phase: "alert" };
  if (action.kind === "back") {
    const previous = s.history.at(-1);
    return previous ? { ...previous, history: s.history.slice(0, -1) } : s;
  }
  let next: ShelterSnapshot = s;
  if (action.kind === "review-checks" && s.phase === "checks")
    next = { ...s, clearAcknowledged: true };
  if (
    action.kind === "briefing-next" &&
    s.phase === "alert" &&
    (s.intro ?? 0) < 2
  )
    next = { ...s, intro: ((s.intro ?? 0) + 1) as 1 | 2 };
  if (action.kind === "start" && s.phase === "alert")
    next = { ...s, phase: "shielding" };
  if (
    action.kind === "place" &&
    s.phase === "shielding" &&
    ["water", "food", "supplies"].includes(action.item) &&
    action.item === action.slot &&
    !s.bundles.includes(action.item)
  ) {
    const bundles = [...s.bundles, action.item];
    next = {
      ...s,
      bundles,
      phase: bundles.length === 3 ? "crew" : "shielding",
    };
  }
  if (
    action.kind === "crew" &&
    s.phase === "crew" &&
    [0, 1, 2].includes(action.member) &&
    !s.crew.includes(action.member)
  ) {
    next = { ...s, crew: [...s.crew, action.member] };
  }
  if (action.kind === "monitor" && s.phase === "crew" && s.crew.length === 3)
    next = { ...s, phase: "monitoring", monitoring: 0 };
  if (
    action.kind === "check" &&
    s.phase === "checks" &&
    ["power", "navigation", "radio"].includes(action.system) &&
    !s.checks.includes(action.system)
  )
    next = { ...s, checks: [...s.checks, action.system] };
  if (action.kind === "finish" && s.phase === "checks" && s.checks.length === 3)
    next = { ...s, phase: "complete" };
  if (next === s) return s;
  const { history: _history, ...snapshot } = s;
  return { ...next, history: [...s.history, snapshot].slice(-16) };
}
export function tickShelter(s: ShelterState, seconds: number): ShelterState {
  if (s.phase !== "monitoring") return s;
  const monitoring = Math.min(
    SHELTER_WAIT_SECONDS,
    s.monitoring + Math.min(0.25, seconds),
  );
  if (monitoring < SHELTER_WAIT_SECONDS) return { ...s, monitoring };
  const { history: _history, ...snapshot } = s;
  return {
    ...s,
    phase: "checks",
    monitoring,
    history: [...s.history, { ...snapshot, monitoring: 0 }].slice(-16),
  };
}
/** Legacy saves have no shelter state; malformed snapshots never bypass the activity. */
export function restoreShelter(raw: unknown): ShelterState {
  const s = raw as ShelterState | undefined;
  if (
    !s ||
    ![
      "waiting",
      "alert",
      "shielding",
      "crew",
      "monitoring",
      "checks",
      "complete",
    ].includes(s.phase) ||
    (s.intro !== undefined && ![0, 1, 2].includes(s.intro)) ||
    !Array.isArray(s.bundles) ||
    !Array.isArray(s.crew) ||
    !Array.isArray(s.checks) ||
    !s.bundles.every((x) => ["water", "food", "supplies"].includes(x)) ||
    new Set(s.bundles).size !== s.bundles.length ||
    !s.crew.every((x) => [0, 1, 2].includes(x)) ||
    new Set(s.crew).size !== s.crew.length ||
    !s.checks.every((x) => ["power", "navigation", "radio"].includes(x)) ||
    new Set(s.checks).size !== s.checks.length ||
    !Number.isFinite(s.monitoring) ||
    s.monitoring < 0 ||
    s.monitoring > SHELTER_WAIT_SECONDS
  )
    return emptyShelter();
  if (
    ["crew", "monitoring", "checks", "complete"].includes(s.phase) &&
    s.bundles.length !== 3
  )
    return emptyShelter();
  if (
    ["monitoring", "checks", "complete"].includes(s.phase) &&
    s.crew.length !== 3
  )
    return emptyShelter();
  if (s.phase === "complete" && s.checks.length !== 3) return emptyShelter();
  return {
    ...s,
    history: Array.isArray(s.history)
      ? s.history.slice(-16).map((x) => {
          const { history: _, ...snapshot } = restoreShelter({
            ...x,
            history: [],
          });
          return snapshot;
        })
      : [],
  };
}
