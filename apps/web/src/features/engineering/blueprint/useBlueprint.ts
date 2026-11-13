import { useEffect, useRef, useState } from "react";
import { HORIZONS_REFERENCE } from "@exo/data/engineering";
import type { HorizonsSnapshot } from "@exo/data/engineering";
import {
  DEFAULT_MISSION,
  evaluateMission,
  validateGeometry,
  validateMission,
} from "@exo/engine/engineering";
import type { MissionDraft } from "@exo/engine/engineering";
export const BLUEPRINT_KEY = "zero_to_beyond_engineering_blueprint_v1";
export interface SavedDesign {
  draft: MissionDraft;
  geometry: HorizonsSnapshot;
  savedAt: string;
}
interface Session {
  current: SavedDesign;
  baseline: SavedDesign | null;
}
function readSession(): Session {
  const fallback: Session = {
    current: {
      draft: structuredClone(DEFAULT_MISSION),
      geometry: HORIZONS_REFERENCE,
      savedAt: "",
    },
    baseline: null,
  };
  try {
    const value = JSON.parse(localStorage.getItem(BLUEPRINT_KEY) ?? "null");
    const valid = (v: unknown): v is SavedDesign => {
      if (!v || typeof v !== "object") return false;
      const d = v as SavedDesign;
      return (
        !validateMission(d.draft).length &&
        !validateGeometry(d.geometry).length &&
        d.draft.date === d.geometry.date &&
        typeof d.savedAt === "string"
      );
    };
    if (value?.version === 1 && valid(value.current))
      return {
        current: value.current,
        baseline: valid(value.baseline) ? value.baseline : null,
      };
  } catch {
    /* The lab remains usable when browser storage is unavailable or corrupt. */
  }
  return fallback;
}
export function useBlueprint() {
  const [initial] = useState(readSession);
  const [draft, setDraft] = useState(initial.current.draft);
  const [geometry, setGeometry] = useState(initial.current.geometry);
  const [origin, setOrigin] = useState<
    | "Bundled NASA prediction"
    | "Saved NASA prediction"
    | "Fetched NASA prediction"
  >(
    initial.current.savedAt
      ? "Saved NASA prediction"
      : "Bundled NASA prediction",
  );
  const [baseline, setBaseline] = useState<SavedDesign | null>(
    initial.baseline,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    request.current?.abort();
    return () => request.current?.abort();
  }, [draft.date]);
  const errors = validateMission(draft);
  const matchingGeometry =
    draft.date === geometry.date && !validateGeometry(geometry).length;
  const result =
    !errors.length && matchingGeometry
      ? evaluateMission(draft, geometry)
      : null;
  const baselineResult = baseline
    ? evaluateMission(baseline.draft, baseline.geometry)
    : null;
  const update = <K extends keyof MissionDraft>(
    key: K,
    value: MissionDraft[K],
  ) => {
    if (key === "date") {
      request.current?.abort();
      setLoading(false);
    }
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const persist = (nextBaseline = baseline) => {
    if (!result) return false;
    try {
      localStorage.setItem(
        BLUEPRINT_KEY,
        JSON.stringify({
          version: 1,
          current: { draft, geometry, savedAt: new Date().toISOString() },
          baseline: nextBaseline,
        }),
      );
      return true;
    } catch {
      return false;
    }
  };
  const save = () =>
    setMessage(
      persist()
        ? "Draft, NASA provenance and comparison saved in this browser."
        : "Browser storage unavailable. Your draft remains open; export JSON to keep a copy.",
    );
  const pinBaseline = () => {
    if (!result) return;
    const pinned = {
      draft: structuredClone(draft),
      geometry: structuredClone(geometry),
      savedAt: new Date().toISOString(),
    };
    setBaseline(pinned);
    setMessage(
      persist(pinned)
        ? "Design A pinned and saved. Change one input to compare Design B."
        : "Design A pinned for this session. Browser storage unavailable; export JSON to keep it.",
    );
  };
  const fetchGeometry = async () => {
    if (errors.some((error) => error.includes("date"))) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setMessage("Requesting NASA/JPL predicted geometry…");
    try {
      const response = await fetch(
        `/api/engineering/horizons?date=${encodeURIComponent(draft.date)}`,
        { signal: controller.signal },
      );
      const value: unknown = await response.json();
      if (!response.ok || validateGeometry(value).length)
        throw new Error("NASA unavailable");
      const next = value as HorizonsSnapshot;
      if (next.date !== draft.date) throw new Error("NASA date mismatch");
      if (controller.signal.aborted) return;
      setGeometry(next);
      setOrigin("Fetched NASA prediction");
      setMessage(
        `NASA prediction loaded for ${next.date} TDB. Source query and retrieval time are recorded in Sources and exports.`,
      );
    } catch {
      if (!controller.signal.aborted)
        setMessage(
          matchingGeometry
            ? `NASA refresh unavailable. Keeping the dated ${origin.toLowerCase()} for ${geometry.date} TDB.`
            : "NASA unavailable for this date. Retry or use the bundled 13 November 2026 prediction; results remain unavailable until dates match.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const useReferenceGeometry = () => {
    update("date", HORIZONS_REFERENCE.date);
    setGeometry(HORIZONS_REFERENCE);
    setOrigin("Bundled NASA prediction");
    setMessage("Using the dated NASA/JPL prediction for 13 November 2026 TDB.");
  };
  return {
    draft,
    update,
    geometry,
    origin,
    baseline,
    result,
    baselineResult,
    errors,
    matchingGeometry,
    loading,
    message,
    setMessage,
    save,
    pinBaseline,
    fetchGeometry,
    useReferenceGeometry,
  };
}
export type BlueprintState = ReturnType<typeof useBlueprint>;
