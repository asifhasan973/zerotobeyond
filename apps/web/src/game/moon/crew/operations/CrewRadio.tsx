import { useCallback, useEffect, useRef, useState } from "react";
import { Radio, Volume2 } from "lucide-react";
import { isEngineFrozen, useLoadingStore } from "@exo/ui";
import {
  NarrationController,
  browserNarrationEnvironment,
} from "../../narrative/voice/narration";
import type { WorkshopSession } from "../../workshop/lander/workshopSession";
import {
  radioCrew,
  crewRadioPaused,
  type CrewRadioMoment,
  type RadioCrewMember,
} from "./crewIdentity";
import { useStoryNavigation } from "../../core/storyNavigationContext";
import "./crewRadio.css";

export type { CrewRadioMoment } from "./crewIdentity";
import { CREW_RADIO_EXCHANGES } from "./crewRadioCopy";
export function CrewPortrait({ member }: { member: RadioCrewMember }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}story/crew-portraits/${member.portrait}`}
      alt=""
      draggable={false}
    />
  );
}

/** A planned story contact, not a computed orbital visibility window. */
export function CrewRadioExchange({
  session,
  moment,
  received,
  voiceEnabled = false,
}: {
  session: WorkshopSession;
  moment: CrewRadioMoment;
  received: boolean;
  voiceEnabled?: boolean;
}) {
  const crew = radioCrew(session);
  const [controller] = useState(
    () => new NarrationController(browserNarrationEnvironment()),
  );
  const [line, setLine] = useState(0);
  const queuedLine = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const navigation = useStoryNavigation();
  const autoplay = navigation?.autoplay !== false && !navigation?.reviewing;
  const paused = crewRadioPaused(session, moment);
  const messages = CREW_RADIO_EXCHANGES[moment];
  const playerGender = session.progress.playerGender;
  const orbitGender =
    session.moon.crew.support === "robotics-specialist" ? "female" : "male";
  const hasOrbitPilot = !!crew.orbit;
  const playLine = useCallback(
    (index: number, onComplete?: () => void) => {
      controller.speak(
        messages[index],
        "commander",
        `crew-exchange-${moment}-${index}`,
        index === 0 ? playerGender : orbitGender,
        onComplete,
      );
      setLine(1 - index);
    },
    [controller, messages, moment, playerGender, orbitGender],
  );
  useEffect(() => {
    if (voiceEnabled && autoplay && !paused) {
      queuedLine.current = setTimeout(() => {
        playLine(0, () => {
          if (hasOrbitPilot) playLine(1);
        });
      }, 0);
    }
    return () => {
      clearTimeout(queuedLine.current);
      controller.stop();
    };
  }, [controller, playLine, voiceEnabled, autoplay, paused, hasOrbitPilot]);
  useEffect(() => {
    const pause = () => controller.pause();
    window.addEventListener("game-help-open", pause);
    return () => window.removeEventListener("game-help-open", pause);
  }, [controller]);
  const speaker = line === 0 ? crew.commander : crew.orbit;
  const commanderPortrait = crew.commander.portrait,
    scientistPortrait = crew.scientist?.portrait,
    orbitPortrait = crew.orbit?.portrait;
  useEffect(() => {
    const portraits = [
      commanderPortrait,
      scientistPortrait,
      orbitPortrait,
    ].filter((portrait): portrait is string => !!portrait);
    const task = Promise.all(
      portraits.map((portrait) => {
        const image = new Image();
        image.src = `${import.meta.env.BASE_URL}story/crew-portraits/${portrait}`;
        return image.decode().catch(() => {});
      }),
    );
    useLoadingStore.getState().registerLoaderTask(task);
  }, [commanderPortrait, scientistPortrait, orbitPortrait]);
  return (
    <section className="crew-radio-exchange" aria-label="Crew radio">
      <div className="crew-radio-caption">
        <Radio size={16} />
        <span>{received ? "Radio check saved" : "Planned radio check"}</span>
      </div>
      {[crew.commander, crew.orbit].map(
        (member, index) =>
          member && (
            <article className="crew-radio-line" key={member.id}>
              <CrewPortrait member={member} />
              <div>
                <strong>{member.name}</strong>
                <small>
                  {index === 1
                    ? "Lunar orbit"
                    : moment === "handoff"
                      ? "Lander"
                      : "Moon surface"}{" "}
                  · {member.role}
                </small>
                <p>{messages[index]}</p>
              </div>
            </article>
          ),
      )}
      {voiceEnabled && speaker ? (
        <button
          type="button"
          className="crew-radio-listen"
          disabled={paused}
          onClick={() => {
            if (isEngineFrozen() || paused) return;
            clearTimeout(queuedLine.current);
            playLine(line);
          }}
        >
          <Volume2 size={15} />
          Listen to {speaker.name}
        </button>
      ) : null}
      <details className="crew-radio-context">
        <summary>About this radio check</summary>
        <p>We use planned contacts in this story.</p>
        <p>The spacecraft moves around the Moon.</p>
        <p>Direct radio needs a clear view.</p>
        <p>Earth has its own communication links.</p>
      </details>
    </section>
  );
}

export function CrewHandoff({
  session,
  voiceEnabled,
}: {
  session: WorkshopSession;
  voiceEnabled?: boolean;
}) {
  const crew = radioCrew(session);
  return (
    <section className="crew-handoff" aria-label="Selected crew handoff">
      <h2>Two land. One stays in orbit.</h2>
      <div className="crew-handoff-roster">
        {[crew.commander, crew.scientist, crew.orbit].map(
          (member, index) =>
            member && (
              <article key={member.id}>
                <CrewPortrait member={member} />
                <strong>{member.name}</strong>
                <small>{member.role}</small>
                <span>{index === 2 ? "Lunar orbit" : "Lander"}</span>
              </article>
            ),
        )}
      </div>
      <CrewRadioExchange
        session={session}
        moment="handoff"
        received={session.moon.crewOperations.handoff}
        voiceEnabled={voiceEnabled}
      />
    </section>
  );
}

export function CrewRadioButton({
  session,
  voiceEnabled,
}: {
  session: WorkshopSession;
  voiceEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="crew-radio-pocket">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Radio size={17} />
        Crew radio
      </button>
      {open ? (
        <div className="crew-radio-pocket-body">
          <strong>Waiting for contact</strong>
          <p>The spacecraft moves around the Moon.</p>
          {session.moon.crewOperations.surfaceCheck ? (
            <CrewRadioExchange
              session={session}
              moment="touchdown"
              received
              voiceEnabled={voiceEnabled}
            />
          ) : (
            <p>No crew radio check is saved.</p>
          )}
        </div>
      ) : null}
    </aside>
  );
}
