import { SourceNotes } from "../../core/learning/SourceNotes";
import { lazy, Suspense, useEffect } from "react";
import { Check, Flag, Pause, Play, Radio } from "lucide-react";
import {
  SceneBoundary,
  SceneFallback,
  isEngineFrozen,
  useLoadingStore,
} from "@exo/ui";
import { sound } from "@exo/audio";
import { StoryShell, StoryControls, useGameSettings } from "@/shared/shell";
import {
  StoryNavigationContext,
  useStoryNavigation,
} from "../../core/storyNavigationContext";
import type { SelectionFrame } from "../../crew/SelectionScreens";
import { CrewRadioExchange, radioCrew } from "../../crew/operations";
import type {
  MissionEvent,
  WorkshopSession,
} from "../../workshop/lander/workshopSession";
import { CREW_EGRESS_FRAMES, CREW_PLANTING_FRAMES } from "./crewOperations";
import "../surface.css";
import "./surfaceArrival.css";

const SurfaceViewport = lazy(() => {
  const task = import("../SurfaceViewport");
  useLoadingStore.getState().registerLoaderTask(task);
  return task.then((module) => ({ default: module.SurfaceViewport }));
});

/** Arrival lives within the existing surface mission step, before rover deployment. */
export function SurfaceArrivalScreen({
  session,
  dispatch,
  frame,
}: {
  session: WorkshopSession;
  dispatch(event: MissionEvent): void;
  frame: SelectionFrame;
}) {
  const state = session.moon.crewOperations,
    navigation = useStoryNavigation();
  const { effects, gentle } = useGameSettings();
  const crew = radioCrew(session),
    moving = state.stage === "egress" || state.stage === "planting";
  const act = (event: MissionEvent) => {
    if (isEngineFrozen() || navigation?.reviewing) return;
    sound.setMuted(!effects);
    sound.playClick();
    dispatch(event);
  };
  useEffect(() => {
    if (!moving || state.paused || navigation?.reviewing) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden && !isEngineFrozen())
        dispatch({
          type: "crew-tick",
          seconds: Math.min(0.25, (now - last) / 1000),
        });
      last = now;
    }, 50);
    return () => clearInterval(timer);
  }, [moving, state.paused, navigation?.reviewing, dispatch]);
  useEffect(() => {
    const pause = () => dispatch({ type: "crew-pause" });
    const hide = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("game-help-open", pause);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("game-help-open", pause);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [dispatch]);
  useEffect(() => {
    if (!state.flagPlanted || navigation?.reviewing) return;
    sound.setMuted(!effects);
    sound.playSnap();
  }, [state.flagPlanted, effects, navigation?.reviewing]);
  const back = () => {
    if (
      navigation?.reviewing ||
      (state.stage === "inside" && !state.surfaceCheck)
    ) {
      if (navigation) navigation.back();
      else dispatch({ type: "back" });
    } else act({ type: "crew-back" });
  };
  const replay = () => {
    if (navigation?.reviewing) {
      navigation.replay?.();
      return;
    }
    act({
      type:
        state.stage === "inside" && !state.surfaceCheck
          ? "crew-replay"
          : "crew-back",
    });
  };
  const next = () => {
    if (navigation?.reviewing) {
      navigation.forward();
      return;
    }
    if (state.paused) {
      act({ type: "crew-resume" });
      return;
    }
    act({
      type:
        state.stage === "ready"
          ? "crew-begin-exploring"
          : state.stage === "outside"
            ? "crew-plant-flag"
            : state.surfaceCheck
              ? "crew-step-out"
              : "crew-check-in",
    });
  };
  const nextLabel = state.paused
    ? "Resume arrival"
    : moving
      ? state.stage === "egress"
        ? "Taking our first steps…"
        : "Planting our flag…"
      : state.stage === "ready"
        ? "Begin exploring"
        : state.stage === "outside"
          ? "Plant our mission flag"
          : state.surfaceCheck
            ? "Step onto the Moon"
            : "Check in with orbit";
  const title =
    state.stage === "ready"
      ? "Our mission flag is planted."
      : state.stage === "planting" || state.stage === "outside"
        ? "A flag for our mission"
        : state.stage === "egress"
          ? "Our first steps"
          : "Hello, Moon.";
  const localNavigation = navigation
    ? {
        ...navigation,
        back,
        replay,
        skip: undefined,
      }
    : null;
  return (
    <StoryNavigationContext.Provider value={localNavigation}>
      <StoryShell
        {...frame}
        controls={
          <StoryControls
            onBack={back}
            onNext={next}
            nextLabel={nextLabel}
            nextDisabled={moving && !state.paused}
            skipHidden
            hintHidden
            progress={<span>First steps</span>}
          />
        }
      >
        <main
          className="workshop-main surface-main arrival-main"
          id="story-content"
          tabIndex={-1}
          aria-labelledby="arrival-title"
          data-arrival-stage={state.stage}
        >
          <header className="arrival-heading">
            <h1 id="arrival-title">{title}</h1>
            {moving ? (
              <button
                type="button"
                onClick={() =>
                  act({ type: state.paused ? "crew-resume" : "crew-pause" })
                }
              >
                {state.paused ? <Play size={17} /> : <Pause size={17} />}{" "}
                {state.paused ? "Resume" : "Pause"}
              </button>
            ) : null}
          </header>
          <div className="arrival-layout">
            <section
              className="surface-scene arrival-scene"
              aria-label="Two selected astronauts arrive on the Moon"
            >
              <SceneBoundary
                fallback={
                  <SceneFallback
                    scene="surface"
                    label="Your Moon arrival"
                    detail="The arrival controls still work"
                  />
                }
              >
                <Suspense
                  fallback={<p role="status">Preparing our first steps…</p>}
                >
                  <SurfaceViewport
                    surface={session.moon.surface}
                    preparation={session.preparation}
                    moon={session.moon}
                    gentle={gentle}
                  />
                </Suspense>
              </SceneBoundary>
              <span className="arrival-scene-caption">
                {state.stage === "inside"
                  ? "Touchdown confirmed"
                  : state.stage === "egress"
                    ? "Two explorers leave the lander"
                    : "Our fictional ExoVisionaries mission"}
              </span>
            </section>
            <aside className="arrival-panel">
              <ol className="arrival-progress" aria-label="Arrival steps">
                <li className={state.surfaceCheck ? "is-done" : ""}>
                  <Radio size={15} />
                  Radio
                </li>
                <li className={state.firstSteps ? "is-done" : ""}>
                  <Check size={15} />
                  First steps
                </li>
                <li className={state.flagPlanted ? "is-done" : ""}>
                  <Flag size={15} />
                  Flag
                </li>
              </ol>
              <div className="arrival-crew-places">
                <strong>
                  {crew.commander.name} &amp; {crew.scientist?.name}
                </strong>
                <span>{state.firstSteps ? "Moon surface" : "Lander"}</span>
                <strong>{crew.orbit?.name}</strong>
                <span>Lunar orbit</span>
              </div>
              {state.stage === "inside" ? (
                state.surfaceCheck ? (
                  <CrewRadioExchange
                    session={session}
                    moment="touchdown"
                    received
                    voiceEnabled={frame.voiceEnabled}
                  />
                ) : (
                  <div className="arrival-copy">
                    <h2>First, a radio check.</h2>
                    <p>Tell our orbit pilot we landed safely.</p>
                    <p>Both explorers stay inside for this check.</p>
                  </div>
                )
              ) : state.stage === "egress" ? (
                <div className="arrival-copy">
                  <h2>One explorer at a time.</h2>
                  <p>Use the ladder to reach the ground.</p>
                  <progress
                    max={CREW_EGRESS_FRAMES}
                    value={state.frame}
                    aria-label="First steps progress"
                  />
                </div>
              ) : (
                <div className="arrival-copy">
                  <h2>
                    {state.flagPlanted
                      ? "A small moment to remember."
                      : "Plant it beside the lander."}
                  </h2>
                  <p>
                    {state.flagPlanted
                      ? "Our flag stays here as we explore."
                      : "Keep the ladder and rover path clear."}
                  </p>
                  <p>The top bar holds the flag open.</p>
                  <p>There is no lunar wind.</p>
                  {state.stage === "planting" ? (
                    <progress
                      max={CREW_PLANTING_FRAMES}
                      value={state.frame}
                      aria-label="Flag planting progress"
                    />
                  ) : null}
                </div>
              )}
              {state.firstSteps ? (
                <p className="arrival-outside-note">
                  Both explorers are outside.
                </p>
              ) : null}
            </aside>
          </div>
          <SourceNotes ids={["crew-radio", "first-steps"]} />
        </main>
      </StoryShell>
    </StoryNavigationContext.Provider>
  );
}
