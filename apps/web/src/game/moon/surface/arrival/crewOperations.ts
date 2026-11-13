import type { MoonSession } from "../../shared/session";
import { safeTouchdown } from "../../landing/landing";
import { surfaceSecured } from "../../hazards/incidents";

export const CREW_ANIMATION_FPS = 20;
export const CREW_EGRESS_FRAMES = 72;
export const CREW_PLANTING_FRAMES = 40;

export type CrewOperationsEvent =
  | {
      type:
        | "crew-begin-exploring"
        | "crew-handoff"
        | "crew-check-in"
        | "crew-step-out"
        | "crew-plant-flag"
        | "crew-pause"
        | "crew-resume"
        | "crew-skip-arrival"
        | "crew-return-check"
        | "crew-back"
        | "crew-replay";
    }
  | { type: "crew-tick"; seconds: number };
export type CrewOperationCommand = CrewOperationsEvent & {
  context?: "lunar-orbit" | "surface";
};
export interface CrewOperationsState {
  version: 1;
  signature: string;
  /** Older missions may continue without claiming actions they did not record. */
  legacy: boolean;
  arrivalComplete: boolean;
  handoff: boolean;
  surfaceCheck: boolean;
  firstSteps: boolean;
  flagPlanted: boolean;
  returnCheck: boolean;
  stage: "inside" | "egress" | "outside" | "planting" | "ready";
  frame: number;
  remainder: number;
  paused: boolean;
  assisted: boolean;
  commands: CrewOperationCommand[];
}
export function emptyCrewOperations(signature = ""): CrewOperationsState {
  return {
    version: 1,
    signature,
    legacy: false,
    arrivalComplete: false,
    handoff: false,
    surfaceCheck: false,
    firstSteps: false,
    flagPlanted: false,
    returnCheck: false,
    stage: "inside",
    frame: 0,
    remainder: 0,
    paused: false,
    assisted: false,
    commands: [],
  };
}

/** Arrival receipts only advance after a validated touchdown; contact is an authored opportunity. */
export function reduceCrewOperations(
  state: CrewOperationsState,
  event: CrewOperationsEvent,
  moon: MoonSession,
): CrewOperationsState {
  if (state.signature !== moon.designSignature) return state;
  const landed =
    moon.landing.signature === moon.designSignature &&
    safeTouchdown(moon.landing);
  let next = state;
  switch (event.type) {
    case "crew-begin-exploring":
      if (landed && state.stage === "ready" && !state.arrivalComplete)
        next = { ...state, arrivalComplete: true };
      break;
    case "crew-handoff":
      if (
        moon.journey.stage === "complete" &&
        moon.phase === "lunar-orbit" &&
        !state.handoff
      )
        next = { ...state, handoff: true };
      break;
    case "crew-check-in":
      if (landed && state.stage === "inside" && !state.surfaceCheck)
        next = { ...state, surfaceCheck: true };
      break;
    case "crew-step-out":
      if (
        landed &&
        !state.paused &&
        state.stage === "inside" &&
        state.surfaceCheck
      )
        next = { ...state, stage: "egress", frame: 0, remainder: 0 };
      break;
    case "crew-plant-flag":
      if (
        landed &&
        !state.paused &&
        state.stage === "outside" &&
        state.firstSteps &&
        !state.flagPlanted
      )
        next = { ...state, stage: "planting", frame: 0, remainder: 0 };
      break;
    case "crew-tick": {
      if (
        !landed ||
        state.paused ||
        !["egress", "planting"].includes(state.stage) ||
        !Number.isFinite(event.seconds) ||
        event.seconds <= 0 ||
        event.seconds > 0.25
      )
        break;
      const total = state.remainder + event.seconds * CREW_ANIMATION_FPS;
      const frames = Math.floor(total + 1e-8);
      const limit =
        state.stage === "egress" ? CREW_EGRESS_FRAMES : CREW_PLANTING_FRAMES;
      const frame = Math.min(limit, state.frame + frames);
      next = { ...state, frame, remainder: total - frames };
      if (frame === limit)
        next =
          state.stage === "egress"
            ? { ...next, stage: "outside", firstSteps: true, remainder: 0 }
            : { ...next, stage: "ready", flagPlanted: true, remainder: 0 };
      break;
    }
    case "crew-pause":
      if (!state.paused) next = { ...state, paused: true };
      break;
    case "crew-resume":
      if (state.paused) next = { ...state, paused: false };
      break;
    case "crew-skip-arrival":
      if (landed && !state.arrivalComplete)
        next = {
          ...state,
          stage: "ready",
          arrivalComplete: true,
          frame: 0,
          remainder: 0,
          paused: false,
          assisted: true,
        };
      else if (moon.phase === "lunar-orbit" && !state.assisted)
        next = { ...state, assisted: true };
      break;
    case "crew-return-check":
      if (
        landed &&
        surfaceSecured(moon) &&
        !state.returnCheck &&
        moon.returnFlight.stage === "ready"
      )
        next = { ...state, returnCheck: true };
      break;
    case "crew-back":
      if (!landed) break;
      if (state.returnCheck) next = { ...state, returnCheck: false };
      else if (["ready", "planting"].includes(state.stage))
        next = {
          ...state,
          stage: state.firstSteps ? "outside" : "inside",
          arrivalComplete: false,
          flagPlanted: false,
          frame: 0,
          remainder: 0,
        };
      else if (["egress", "outside"].includes(state.stage))
        next = {
          ...state,
          stage: "inside",
          firstSteps: false,
          frame: 0,
          remainder: 0,
        };
      else if (state.surfaceCheck) next = { ...state, surfaceCheck: false };
      break;
    case "crew-replay":
      if (!landed) break;
      next = {
        ...emptyCrewOperations(state.signature),
        handoff: state.handoff,
        legacy: state.legacy,
      };
      break;
  }
  return next === state
    ? state
    : {
        ...next,
        commands: [
          ...state.commands,
          event.type === "crew-skip-arrival"
            ? { ...event, context: landed ? "surface" : "lunar-orbit" }
            : event,
        ],
      };
}

/** Rebuild earned actions from bounded receipts instead of trusting saved booleans. */
export function restoreCrewOperations(
  raw: unknown,
  moon: MoonSession,
): CrewOperationsState {
  const fresh = emptyCrewOperations(moon.designSignature);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return {
      ...fresh,
      legacy: true,
    };
  const saved = raw as Partial<CrewOperationsState>;
  if (
    saved.version !== 1 ||
    saved.signature !== moon.designSignature ||
    !Array.isArray(saved.commands) ||
    saved.commands.length > 4096
  )
    return fresh;
  let state = { ...fresh, legacy: saved.legacy === true };
  for (const value of saved.commands) {
    if (!value || typeof value !== "object" || typeof value.type !== "string")
      continue;
    // A historical shortcut is not a completed arrival. Retain the expedition
    // itself while letting the player perform the missed first steps and flag.
    if (value.type === "crew-skip-arrival" && value.context !== "lunar-orbit") {
      state = {
        ...state,
        assisted: true,
        commands: [...state.commands, value],
      };
      continue;
    }
    const context =
      value.type === "crew-skip-arrival" && value.context === "lunar-orbit"
        ? {
            ...moon,
            phase: "lunar-orbit" as const,
            landing: { ...moon.landing, signature: null },
          }
        : value.type === "crew-handoff"
          ? { ...moon, phase: "lunar-orbit" as const }
          : value.type === "crew-return-check"
            ? {
                ...moon,
                returnFlight: { ...moon.returnFlight, stage: "ready" as const },
              }
            : moon;
    state = reduceCrewOperations(state, value, context);
  }
  return { ...state, paused: saved.paused === true };
}
