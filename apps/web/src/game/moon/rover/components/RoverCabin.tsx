import { useEffect, useState, useSyncExternalStore } from "react";
import { Volume2 } from "lucide-react";
import {
  NarrationController,
  browserNarrationEnvironment,
} from "@/game/moon/narrative/voice/narration";
import { useStoryNavigation } from "@/game/moon/core/storyNavigationContext";
import { useCargoRoverImage } from "../useCargoRoverImage";
import { useLoadingStore } from "@exo/ui";
import type { PreparationSelection } from "@/game/moon/core/design";
import { ROVER_TALKS } from "../roverCopy";
import "./roverCabin.css";
import type { RoverState } from "../rover";
import type { RadioCrewMember } from "../../crew/operations";
import type { MoonSession } from "@/game/moon/shared/session";

const cabinSpecialists = {
  astrobiologist: {
    name: "Astrobiologist",
    portrait: "scientist-pressure-suit-v2.webp",
  },
  geologist: {
    name: "Geologist",
    portrait: "geologist-pressure-suit-v1.webp",
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

export function RoverCabin({
  rover,
  moon,
  preparation,
  voiceEnabled,
  operator,
  playerGender,
}: {
  rover: RoverState;
  moon: MoonSession;
  preparation: PreparationSelection;
  voiceEnabled: boolean;
  operator: RadioCrewMember;
  playerGender: "male" | "female";
}) {
  const [controller] = useState(
      () => new NarrationController(browserNarrationEnvironment()),
    ),
    navigation = useStoryNavigation();
  const narration = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const roverImage = useCargoRoverImage(preparation, true);
  const scientist =
    moon.crew.scientist === "astrobiologist" ||
    moon.crew.scientist === "geologist"
      ? cabinSpecialists[moon.crew.scientist]
      : null;
  const scientistPortrait = scientist
    ? `story/crew-portraits/${scientist.portrait}`
    : null;
  const supportPortrait = `story/crew-portraits/${operator.portrait}`;
  useEffect(() => {
    const loading = useLoadingStore.getState();
    if (!loading.isLoading)
      void loading.startLoading("custom", "Opening the crew control cabin…");
    const task = Promise.all(
      ["story/lunar-cabin-v1.webp", scientistPortrait, supportPortrait]
        .filter((path): path is string => path !== null)
        .map((path) => {
          const image = new Image();
          image.src = `${import.meta.env.BASE_URL}${path}`;
          return image.decode().catch(() => {});
        }),
    );
    loading.registerLoaderTask(task);
  }, [scientistPortrait, supportPortrait]);
  const line = ROVER_TALKS[rover.talk][rover.line],
    commander = line.speaker === "Commander";
  const gender = commander
    ? playerGender
    : moon.crew.scientist === "geologist"
      ? "female"
      : "male";
  useEffect(() => {
    if (
      voiceEnabled &&
      navigation?.autoplay !== false &&
      !navigation?.reviewing
    )
      controller.speak(
        line.text,
        "commander",
        `rover-run-${rover.talk}-${rover.line}`,
        gender,
      );
    return () => controller.stop();
  }, [
    controller,
    line.text,
    commander,
    rover.talk,
    rover.line,
    voiceEnabled,
    gender,
    navigation?.autoplay,
    navigation?.reviewing,
  ]);
  return (
    <section
      className="rover-cabin"
      aria-label="Selected surface crew controlling the rover from the lander"
    >
      <div
        className="rover-cabin-scene"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}story/lunar-cabin-v1.webp)`,
        }}
        aria-hidden="true"
      />
      <span className="rover-cabin-location">
        SURFACE CREW · LANDER CONTROL
      </span>
      <div className="rover-cabin-crew">
        <div
          className={`rover-cabin-person rover-cabin-support ${commander ? "is-speaking" : ""}`}
        >
          {supportPortrait ? (
            <img
              className="rover-cabin-portrait"
              src={`${import.meta.env.BASE_URL}${supportPortrait}`}
              alt={`${operator.name} at the lander control console`}
            />
          ) : null}
          <span>{operator.name} · Lander commander</span>
        </div>
        <div
          className={`rover-cabin-person rover-cabin-scientist ${!commander ? "is-speaking" : ""}`}
          data-speaking={!commander && narration.status === "speaking"}
        >
          {scientistPortrait ? (
            <img
              className="rover-cabin-portrait"
              src={`${import.meta.env.BASE_URL}${scientistPortrait}`}
              alt={`${scientist?.name} seated at the lander's remote-control console`}
            />
          ) : null}
          <span>
            {scientist?.name ?? "Science seat unassigned"} · Lander scientist
          </span>
        </div>
      </div>
      <div className="rover-cabin-console">
        <div className="rover-cabin-screen">
          <small>ROVER LINK · LIVE</small>
          {roverImage ? (
            <img
              src={roverImage}
              alt="Your rover controlled from inside the lander"
            />
          ) : null}
          <span>REMOTE CONTROL ACTIVE</span>
        </div>
        <div className="rover-cabin-readings">
          <span>
            SELECTED CREW <b>{1 + Number(!!scientist)} / 2</b>
          </span>
          <span>
            SAMPLES DELIVERED <b>{rover.deposited.length} / 2</b>
          </span>
          <span>
            BATTERY{" "}
            <b>{Math.round((rover.batteryWh / rover.capacityWh) * 100)}%</b>
          </span>
        </div>
        <div className="rover-cabin-switches" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <strong>COMMS ●</strong>
        </div>
      </div>
      <div className="rover-cabin-dialogue">
        <strong>
          {commander ? operator.name : (scientist?.name ?? "Scientist")}
        </strong>
        <p>{line.text}</p>
        <button
          aria-label="Replay conversation"
          disabled={!voiceEnabled}
          onClick={() =>
            controller.speak(
              line.text,
              "commander",
              `rover-run-${rover.talk}-${rover.line}`,
              gender,
            )
          }
        >
          <Volume2 size={20} />
        </button>
        <small>{rover.line + 1} / 2</small>
      </div>
    </section>
  );
}
