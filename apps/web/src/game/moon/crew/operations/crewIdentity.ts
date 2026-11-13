import type { WorkshopSession } from "../../workshop/lander/workshopSession";
import type { CrewId } from "../../shared/catalog";

export interface RadioCrewMember {
  id: CrewId;
  name: string;
  role: string;
  portrait: string;
  location: string;
}
const specialists = {
  geologist: { name: "Geologist", portrait: "geologist-pressure-suit-v1.webp" },
  astrobiologist: {
    name: "Astrobiologist",
    portrait: "scientist-pressure-suit-v2.webp",
  },
  "robotics-specialist": {
    name: "Robotics expert",
    portrait: "robotics-pressure-suit-v1.webp",
  },
  "systems-engineer": {
    name: "Systems engineer",
    portrait: "systems-pressure-suit-v1.webp",
  },
} as const;

/** The player commands the lander; the selected support specialist remains in orbit. */
export function radioCrew(session: WorkshopSession) {
  const commander: RadioCrewMember = {
    id: "commander",
    name: session.progress.playerName || "Commander",
    role: "Commander",
    portrait:
      session.progress.playerGender === "male"
        ? "commander-male-pressure-suit-v1.webp"
        : "commander-pressure-suit-v2.webp",
    location: "Lander",
  };
  const selected = (
    id: CrewId | null,
    role: string,
    location: string,
  ): RadioCrewMember | null => {
    if (!id || id === "commander") return null;
    const person = specialists[id];
    return { id, name: person.name, role, portrait: person.portrait, location };
  };
  return {
    commander,
    scientist: selected(
      session.moon.crew.scientist,
      "Surface scientist",
      "Lander",
    ),
    orbit: selected(session.moon.crew.support, "Orbit pilot", "Lunar orbit"),
  };
}

export type CrewRadioMoment = "handoff" | "touchdown" | "departure";

/** Completed arrival pause state must not silence a later mission's radio. */
export function crewRadioPaused(
  session: WorkshopSession,
  moment: CrewRadioMoment,
): boolean {
  if (moment === "departure") return session.moon.returnFlight.paused;
  if (moment === "handoff") return false;
  return (
    (!session.moon.crewOperations.arrivalComplete &&
      session.moon.crewOperations.paused) ||
    !!session.moon.rover?.paused
  );
}
