import { useEffect, useState } from "react";
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
import "./crewRadio.css";

export type { CrewRadioMoment } from "./crewIdentity";
const exchanges = {
  handoff: ["We are moving into the lander.", "I will stay in lunar orbit."],
  touchdown: ["We landed safely.", "I will keep our spacecraft ready."],
  departure: [
    "We are ready to return.",
    "I am ready to meet your ascent cabin.",
  ],
} as const;

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
  useEffect(() => () => controller.stop(), [controller]);
  const paused = crewRadioPaused(session, moment);
  useEffect(() => {
    if (!voiceEnabled) controller.stop();
    else if (paused) controller.pause();
    else controller.resume();
  }, [controller, paused, voiceEnabled]);
  useEffect(() => {
    const stop = () => controller.stop();
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("game-help-open", stop);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("game-help-open", stop);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [controller]);
  const speaker = line === 0 ? crew.commander : crew.orbit;
  const messages = exchanges[moment];
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
            controller.speak(
              messages[line],
              line === 0 ? "commander" : "chief",
              undefined,
              line === 0
                ? session.progress.playerGender
                : session.moon.crew.support === "robotics-specialist"
                  ? "female"
                  : "male",
            );
            setLine((value) => 1 - value);
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
