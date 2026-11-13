import { STORY_FLOW } from "../core/flow";
import { replayMissionPage } from "../core/missionReplay";
import { useState, useCallback, useEffect, useRef } from "react";
import type {
  WorkshopSession,
  MissionEvent,
} from "@/game/moon/workshop/lander/workshopSession";
import {
  createWorkshopSession,
  reduceMission,
} from "@/game/moon/workshop/lander/workshopSession";
import { createStoryProgress } from "@/game/moon/core/progress";
import { pauseMission } from "@/game/moon/core/missionNavigation";
import { advanceMissionSkip } from "@/game/moon/core/missionNavigation";
import {
  milestoneProgress,
  trackMilestoneTransition,
} from "@/game/moon/core/missionMilestones";
import { useLoadingStore, isEngineFrozen } from "@exo/ui";
import { completedMission } from "@/game/moon/return/debrief/missionReport";

export interface UseStoryNavigationStateOptions {
  mission: WorkshopSession;
  setMission: React.Dispatch<React.SetStateAction<WorkshopSession>>;
  dispatch: (event: MissionEvent) => void;
  initialHome?: boolean;
  initialArchive?: boolean;
}

export function useStoryNavigationState({
  mission,
  setMission,
  dispatch,
  initialHome,
  initialArchive: _initialArchive,
}: UseStoryNavigationStateOptions) {
  const { progress } = mission;
  const replayEntries = useRef(new Map<string, WorkshopSession>());
  const previousStep = useRef(progress.stepId);
  useEffect(() => {
    const index = (id: string) =>
      STORY_FLOW.findIndex((step) => step.id === id);
    if (
      !mission.review &&
      index(progress.stepId) > index(previousStep.current) &&
      !replayEntries.current.has(progress.stepId)
    ) {
      replayEntries.current.set(progress.stepId, mission);
    }
    previousStep.current = progress.stepId;
  }, [mission, progress.stepId]);
  const completed = !mission.review && completedMission(mission);

  const [replayRevision, setReplayRevision] = useState(0);
  const [home, setHome] = useState(() => {
    if (initialHome) return true;
    return true;
  });
  const [autoBuilding, setAutoBuilding] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState<"map" | "start" | null>(
    null,
  );
  const [restart, setRestart] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

  const enterMission = useCallback(() => {
    useLoadingStore.getState().startLoading("mission_start");
    setAutoplay(true);
    setHome(false);
    if (completed) {
      setOverviewOpen(null);
      // Reopening a verified result is navigation, and must survive the loading freeze.
      setMission((current) => {
        if (!completedMission(current)) return current;
        if (current.progress.stepId === "crew-return") {
          return trackMilestoneTransition(
            current,
            reduceMission(current, { type: "next" }),
          );
        }
        return current.progress.milestones?.pending === "home"
          ? reduceMission(current, { type: "milestone-continue" })
          : current;
      });
    } else if (progress.stepId !== "player-name") {
      setOverviewOpen("map");
    } else {
      setOverviewOpen(null);
    }
  }, [progress.stepId, completed, setMission]);

  const reset = useCallback(() => {
    useLoadingStore
      .getState()
      .startLoading("mission_start", "Preparing fresh mission…");
    setAutoBuilding(false);
    setAutoplay(true);
    replayEntries.current.clear();
    setMission(createWorkshopSession(createStoryProgress()));
    setRestart(false);
    setHome(false);
    setOverviewOpen(null);
  }, [setMission]);

  const goHome = useCallback(() => {
    setAutoBuilding(false);
    setOverviewOpen(null);
    setMission((current) => {
      const paused = pauseMission(current);
      if (!paused.review) return paused;
      const { review, ...live } = paused;
      return { ...live, progress: review.anchor };
    });
    setHome(true);
  }, [setMission]);

  const requestRestart = useCallback(() => {
    setRestart(true);
  }, []);

  const back = useCallback(() => {
    setAutoBuilding(false);
    setAutoplay(false);
    if (overviewOpen) {
      setOverviewOpen(null);
      if (progress.stepId === "appointment") {
        dispatch({ type: "back" });
      }
      return;
    }
    if (
      progress.stepId === "mission-debrief" ||
      (progress.stepId === "crew-return" &&
        mission.moon.returnFlight.stage !== "ready")
    ) {
      dispatch({ type: "return-back" });
      return;
    }
    if (progress.stepId === "player-name") setHome(true);
    else dispatch({ type: "back" });
  }, [
    dispatch,
    overviewOpen,
    progress.stepId,
    mission.moon.returnFlight.stage,
  ]);

  const replay = useCallback(() => {
    if (isEngineFrozen()) return;
    setAutoBuilding(false);
    setOverviewOpen(null);
    setAutoplay(true);
    setMission((current) => {
      if (current.progress.stepId === "crew-return")
        return reduceMission(current, { type: "return-replay" });
      const stepIndex = STORY_FLOW.findIndex(
        (step) => step.id === current.progress.stepId,
      );
      const replayed = replayMissionPage(
        current,
        replayEntries.current.get(current.progress.stepId),
      );
      for (const step of STORY_FLOW.slice(stepIndex))
        replayEntries.current.delete(step.id);
      replayEntries.current.set(current.progress.stepId, replayed);
      return replayed;
    });
    setReplayRevision((value) => value + 1);
  }, [setMission]);

  const chapter = milestoneProgress(mission);
  const pending = mission.review ? undefined : progress.milestones?.pending;
  const introduction =
    !progress.milestones?.introduced && progress.stepId === "appointment";
  const milestoneCard =
    !home &&
    !(completed && progress.stepId === "mission-debrief") &&
    (Boolean(overviewOpen) || Boolean(pending) || introduction);

  const skipPage = useCallback(async () => {
    if (skipBusy || isEngineFrozen()) return;
    if (milestoneCard) {
      if (pending) {
        dispatch({ type: "milestone-continue" });
        setOverviewOpen("map");
      } else {
        setOverviewOpen(null);
        dispatch({ type: "milestone-start" });
      }
      setAutoplay(true);
      return;
    }
    if (mission.review) {
      setAutoplay(true);
      dispatch({ type: "next" });
      return;
    }
    setAutoBuilding(false);
    setSkipBusy(true);
    setSkipError(null);
    const paused = pauseMission(mission);
    setMission(paused);
    void useLoadingStore
      .getState()
      .startLoading("mission_start", "Advancing to next stage…");
    try {
      const advanced = advanceMissionSkip(paused);
      setMission(advanced);
      setAutoplay(true);
      setOverviewOpen(null);
    } catch {
      setSkipError("Skip unavailable. Try Next or return home.");
    } finally {
      setSkipBusy(false);
    }
  }, [dispatch, milestoneCard, mission, pending, setMission, skipBusy]);

  useEffect(() => {
    const stop = () => setAutoBuilding(false);
    window.addEventListener("game-help-open", stop);
    return () => window.removeEventListener("game-help-open", stop);
  }, []);

  return {
    home,
    setHome,
    autoBuilding,
    setAutoBuilding,
    autoplay,
    setAutoplay,
    overviewOpen,
    setOverviewOpen,
    restart,
    setRestart,
    skipBusy,
    skipError,
    enterMission,
    reset,
    goHome,
    requestRestart,
    back,
    replay,
    replayRevision,
    skipPage,
    chapter,
    pending,
    milestoneCard,
  };
}
