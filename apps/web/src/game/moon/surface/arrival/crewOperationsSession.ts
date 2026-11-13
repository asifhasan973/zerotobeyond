import type { WorkshopSession } from "../../workshop/lander/workshopSession";
import { emptyScience } from "../../science/science";
import { emptyReturn } from "../../return/return";
import { freshSurface, surfaceResources } from "../surface";
import {
  reduceCrewOperations,
  type CrewOperationsEvent,
} from "./crewOperations";

/** Keep arrival navigation and the dependent expedition evidence in one transition. */
export function reduceCrewOperationsMission(
  session: WorkshopSession,
  event: CrewOperationsEvent,
): WorkshopSession {
  if (session.review && !["crew-pause", "crew-resume"].includes(event.type))
    return session;
  const crewOperations = reduceCrewOperations(
    session.moon.crewOperations,
    event,
    session.moon,
  );
  if (crewOperations === session.moon.crewOperations) return session;
  if (event.type !== "crew-replay")
    return { ...session, moon: { ...session.moon, crewOperations } };
  const surface = freshSurface(session.moon);
  return {
    ...session,
    review: undefined,
    moon: {
      ...session.moon,
      crewOperations,
      surface,
      rover: undefined,
      science: emptyScience(),
      returnFlight: emptyReturn(),
      evidence: [],
      incidents: [],
      outcome: null,
      phase: "surface",
      resources: surfaceResources(session.moon, surface),
      navigation: {
        locationId: "base",
        routeIds: [],
        communication: "unknown",
      },
      checkpoints: session.moon.checkpoints.filter((checkpoint) =>
        ["pre-departure", "earth-orbit", "lunar-orbit", "touchdown"].includes(
          checkpoint.id,
        ),
      ),
    },
    progress: {
      ...session.progress,
      stepId: "lunar-surface",
      lineIndex: 0,
      completedActivities: session.progress.completedActivities.filter(
        (id) =>
          ![
            "surface-deploy",
            "surface-explore",
            "ice-science",
            "surface-recovery",
            "crew-return",
          ].includes(id),
      ),
    },
  };
}
