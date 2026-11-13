import { emptyCrewOperations } from "../surface/arrival/crewOperations";
import { STORY_FLOW, getStoryStep } from "./flow";
import { createMissionCheckpoint } from "./missionCheckpoints";
import { createPreparationSelection } from "./design";
import { MILESTONES } from "./missionMilestones";
import type { MoonObjective } from "../shared/catalog";
import type { WorkshopSession } from "../workshop/lander/workshopSession";

/** Discard this page and all later work while retaining upstream decisions. */
export function replayMissionPage(
  source: WorkshopSession,
  entry?: WorkshopSession,
): WorkshopSession {
  if (entry)
    return {
      ...entry,
      review: undefined,
      past: [],
      future: [],
      progress: {
        ...entry.progress,
        lineIndex: 0,
        milestones: entry.progress.milestones
          ? { ...entry.progress.milestones, pending: undefined }
          : undefined,
      },
    };
  const { progress } = source;
  const index = STORY_FLOW.findIndex((step) => step.id === progress.stepId);
  const prior = STORY_FLOW.slice(0, index);
  const step = getStoryStep(progress.stepId, progress.selections.objective);
  const before = (id: string) =>
    STORY_FLOW.findIndex((item) => item.id === id) < index;
  const preparation = { ...source.preparation };
  const empty = createPreparationSelection();
  if (step.module <= 2) {
    if (!before("lander-build"))
      preparation.landerPartIds = empty.landerPartIds;
    if (!before("rover-select")) preparation.roverId = null;
    if (!before("science-build")) {
      preparation.sciencePartIds = [];
      preparation.drillDepthCm = null;
    }
    if (!before("power-build")) {
      preparation.solarId = null;
      preparation.batteryId = null;
    }
    if (!before("survival-build")) {
      preparation.navigationId = null;
      preparation.thermalId = null;
      preparation.communicationId = null;
    }
  }
  const fresh = createMissionCheckpoint(progress.stepId, {
    objective: (progress.selections.objective ?? "lunar-ice") as MoonObjective,
    gender: progress.playerGender,
    playerName: progress.playerName,
    site: progress.selections.site,
    crew: source.moon.crew,
    preparation,
  });
  const selections = { ...progress.selections };
  for (const item of STORY_FLOW.slice(index)) {
    if (item.kind === "choice") delete selections[item.choiceKey];
  }
  const activities = new Set(
    prior.flatMap((item) => (item.kind === "activity" ? [item.activity] : [])),
  );
  return {
    ...fresh,
    past: [],
    future: [],
    repair: undefined,
    flight: step.module > 5 ? source.flight : fresh.flight,
    moon: {
      ...fresh.moon,
      crewOperations:
        step.module > 8 ||
        (step.module === 8 && progress.stepId !== "lunar-surface")
          ? {
              ...source.moon.crewOperations,
              returnCheck: false,
              commands: source.moon.crewOperations.commands.filter(
                (command) => command.type !== "crew-return-check",
              ),
            }
          : {
              ...emptyCrewOperations(source.moon.designSignature),
              handoff: step.module > 6 && source.moon.crewOperations.handoff,
              commands:
                step.module > 6
                  ? source.moon.crewOperations.commands.filter(
                      (command) => command.type === "crew-handoff",
                    )
                  : [],
            },
      ...(before("crew-selection") ? { crew: source.moon.crew } : {}),
      ...(step.module > 5
        ? { launchSnapshot: source.moon.launchSnapshot }
        : {}),
      ...(step.module > 6 ? { journey: source.moon.journey } : {}),
      ...(step.module > 7 ? { landing: source.moon.landing } : {}),
      ...(step.module > 8 ? { surface: source.moon.surface } : {}),
      ...(step.module > 10
        ? { science: source.moon.science, rover: source.moon.rover }
        : {}),
    },
    progress: {
      ...fresh.progress,
      playerName: progress.playerName,
      playerGender: progress.playerGender,
      stepId: progress.stepId,
      lineIndex: 0,
      selections,
      history: progress.history.filter((entry) =>
        prior.some((item) => item.id === entry.stepId),
      ),
      completedActivities: progress.completedActivities.filter((id) =>
        activities.has(id),
      ),
      milestones: {
        introduced: true,
        celebrated: (progress.milestones?.celebrated ?? []).filter((id) => {
          const milestone = MILESTONES.find((item) => item.id === id);
          return milestone ? milestone.steps.every(before) : false;
        }),
      },
    },
  };
}
