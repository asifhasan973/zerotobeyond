import {
  SceneBoundary,
  SceneFallback,
  GameInfo,
  isEngineFrozen,
  useLoadingStore,
} from "@exo/ui";
import { GEOLOGY_LABELS } from "@/game/moon/science/geologyCopy";
import { lazy, Suspense, useEffect, useState, useEffectEvent } from "react";
import { Info, TriangleAlert } from "lucide-react";
import type {
  WorkshopSession,
  MissionEvent,
} from "@/game/moon/workshop/lander/workshopSession";
import type { SelectionFrame } from "@/game/moon/crew/SelectionScreens";
import { StoryShell, StoryControls } from "@/shared/shell";
import { useStoryNavigation } from "@/game/moon/core/storyNavigationContext";
import { useGameSettings } from "@/shared/shell";
import { CrewRadioExchange } from "@/game/moon/crew/operations";
import { Term } from "@/game/moon/core/learning/Learning";
import { sound } from "@exo/audio";
import {
  canDock,
  returnActive,
  returnComplete,
  returnReport,
} from "./return.ts";
import type { ReturnAction } from "./return.ts";
import { nextReturnAction } from "@/game/moon/shared/expedition/moonExpedition";
import { usePageNarration } from "../narrative/hooks/usePageNarration";
import { RETURN_LINES } from "./returnCopy.ts";
import {
  missionCard,
  downloadMissionCard,
} from "@/game/moon/shared/missionCard";
import "./return.css";
import "./returnDeparture.css";
import "./returnVoyage.css";
import { ReturnVoyagePanel } from "./ReturnVoyagePanel";
import {
  ReturnDepartureControls,
  ReturnJourneyTrail,
} from "./ReturnDepartureControls";
const MissionDebrief = lazy(() => {
  const task = import("./debrief/MissionDebrief.tsx");
  useLoadingStore.getState().registerLoaderTask(task);
  return task.then((m) => ({ default: m.MissionDebrief }));
});
const ReturnViewport = lazy(() =>
  import("./ReturnViewport.tsx").then((m) => ({ default: m.ReturnViewport })),
);
const ReturnVoyageViewport = lazy(() => {
  const task = import("./ReturnVoyageViewport");
  useLoadingStore.getState().registerLoaderTask(task);
  return task.then((m) => ({ default: m.ReturnVoyageViewport }));
});
const TITLES = {
  ready: "Time to come home",
  ascending: "Lift off from the Moon",
  rendezvous: "Meet your orbit crew",
  docked: "Three crew. One cabin.",
  burning: "Next stop: Earth",
  coast: "On our way home",
  "entry-ready": "Prepare for Earth entry",
  entry: "Through Earth’s air",
  "chute-ready": "Open the parachutes",
  chutes: "Nearly home!",
  splashdown: "Welcome back, explorers!",
} as const;
export function ReturnScreen({
  session,
  dispatch,
  frame,
}: {
  session: WorkshopSession;
  dispatch(e: MissionEvent): void;
  frame: SelectionFrame;
}) {
  const r = session.moon.returnFlight,
    { effects, gentle } = useGameSettings(),
    [panel, setPanel] = useState<"notes" | "back" | "retry" | null>(null),
    geo = session.moon.objective === "lunar-geology",
    debrief = session.progress.stepId === "mission-debrief";
  const reviewing = !!useStoryNavigation()?.reviewing;
  const active = returnActive(r),
    complete = returnComplete(r, session.moon.designSignature),
    report = returnReport(session.moon, r),
    card = debrief ? missionCard(session) : null;
  const act = (e: MissionEvent) => {
      if (reviewing || isEngineFrozen()) return;
      sound.setMuted(!effects);
      sound.playClick();
      dispatch(e);
    },
    action = (a: ReturnAction) => {
      // Hint/help pauses the clock. An explicit cockpit action is also an intent
      // to continue; otherwise the highlighted Brake/Align/Shield button is inert.
      if (reviewing || isEngineFrozen()) return;
      if (r.paused) dispatch({ type: "return-resume" });
      act({ type: "return-action", action: a });
    };
  useEffect(() => {
    if (!active || r.paused || debrief || reviewing) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden && !isEngineFrozen())
        dispatch({ type: "return-tick", seconds: (now - last) / 1000 });
      last = now;
    }, 100);
    return () => clearInterval(timer);
  }, [active, r.paused, debrief, reviewing, dispatch]);
  useEffect(() => {
    const pause = () => dispatch({ type: "return-pause" }),
      hide = () => {
        if (document.hidden) pause();
      },
      hint = () => {
        dispatch({ type: "return-hint" });
        pause();
      };
    window.addEventListener("game-help-open", pause);
    window.addEventListener("replay-game-help", hint);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("game-help-open", pause);
      window.removeEventListener("replay-game-help", hint);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [dispatch]);
  useEffect(() => {
    sound.setMuted(!effects);
    if (reviewing) return;
    if (complete) sound.playFanfare();
    else if (["docked", "chutes"].includes(r.stage)) sound.playStagingThud();
    else if (r.stage === "entry-ready") sound.playRadioBeep();
  }, [r.stage, complete, effects, reviewing]);
  useEffect(() => {
    sound.setMuted(!effects);
    if (
      !reviewing &&
      !r.paused &&
      (r.stage === "ascending" || (r.stage === "burning" && r.burnFiring))
    )
      sound.startRocketRoar();
    else sound.stopRocketRoar();
    return () => sound.stopRocketRoar();
  }, [r.stage, r.paused, r.burnFiring, effects, reviewing]);
  const primary = nextReturnAction(r),
    keyboardAction = useEffectEvent((selected: ReturnAction) => {
      if (r.stage === "ready" && !session.moon.crewOperations.returnCheck)
        act({ type: "crew-return-check" });
      else action(selected);
    });
  useEffect(() => {
    if (reviewing || debrief || panel) return;
    const key = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (
        event.repeat ||
        event.defaultPrevented ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input,textarea,select,[contenteditable=true],[role=dialog]",
          )) ||
        (event.key === " " && event.target instanceof HTMLButtonElement)
      )
        return;
      let choice: ReturnAction | null = null;
      if (r.stage === "burning") {
        if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
          event.preventDefault();
          dispatch({
            type: "return-burn-pilot",
            angle: Math.max(-90, (r.burnAngle ?? 0) - 5),
          });
          return;
        }
        if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
          event.preventDefault();
          dispatch({
            type: "return-burn-pilot",
            angle: Math.min(90, (r.burnAngle ?? 0) + 5),
          });
          return;
        }
        if (event.key === " ") {
          event.preventDefault();
          if (r.paused) dispatch({ type: "return-resume" });
          dispatch({
            type: "return-burn-pilot",
            firing: !r.burnFiring,
            throttle: 1,
          });
          return;
        }
      } else if (r.stage === "rendezvous") {
        if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
          choice = "left";
        else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
          choice = "right";
        else if (event.key === " " || event.key.toLowerCase() === "s")
          choice = "brake";
        else if (event.key.toLowerCase() === "e" && canDock(r)) choice = "dock";
      } else if (event.key.toLowerCase() === "e") choice = primary;
      if (choice) {
        event.preventDefault();
        keyboardAction(choice);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [r, primary, reviewing, debrief, panel, dispatch]);
  const voyage = !["ready", "ascending", "rendezvous"].includes(r.stage);
  const needsReturnCheck =
    r.stage === "ready" && !session.moon.crewOperations.returnCheck;
  const nextLabel = needsReturnCheck
    ? "Check in before liftoff"
    : debrief
      ? "Mission home"
      : r.paused
        ? "Resume"
        : complete
          ? "See our mission"
          : r.stage === "ready"
            ? "Launch ascent cabin"
            : r.stage === "rendezvous"
              ? r.closingMS > 0.25
                ? "Slow the approach"
                : Math.abs(r.alignment) > 0.2
                  ? "Line up the cabins"
                  : "Dock gently"
              : r.stage === "docked"
                ? "Fire Earth-return engine"
                : r.stage === "entry-ready"
                  ? "Choose heat shield"
                  : r.stage === "chute-ready"
                    ? "Open Earth parachutes"
                    : r.stage === "coast"
                      ? "Continue to Earth"
                      : "Pause";
  const next = () =>
    !reviewing && needsReturnCheck
      ? act({ type: "crew-return-check" })
      : reviewing
        ? dispatch({ type: "next" })
        : debrief
          ? frame.onHome?.()
          : r.paused
            ? act({ type: "return-resume" })
            : complete
              ? act({ type: "next" })
              : primary
                ? action(primary)
                : active
                  ? act({ type: "return-pause" })
                  : undefined;
  const warning = ["unsafeDock", "wrongShield", "fuel", "reserve"].includes(
      r.feedback,
    ),
    stageIndex = ["ready", "ascending"].includes(r.stage)
      ? 0
      : r.stage === "rendezvous"
        ? 1
        : ["docked", "burning", "coast"].includes(r.stage)
          ? 2
          : ["entry-ready", "entry", "chute-ready", "chutes"].includes(r.stage)
            ? 3
            : 4;
  const narrationId =
    r.feedback in RETURN_LINES
      ? r.feedback
      : r.stage === "entry"
        ? "shield"
        : r.stage;
  usePageNarration(
    RETURN_LINES[narrationId as keyof typeof RETURN_LINES] ?? "",
    `return-${narrationId}`,
    !!frame.voiceEnabled && !debrief && r.stage !== "ready",
    !!panel,
  );
  return (
    <StoryShell
      {...frame}
      controls={
        <StoryControls
          onBack={() => {
            dispatch({ type: "return-pause" });
            dispatch({ type: "back" });
          }}
          onNext={next}
          nextHidden={debrief}
          nextLabel={nextLabel}
          nextDisabled={
            !reviewing &&
            !debrief &&
            !r.paused &&
            (r.stage === "entry-ready" ||
              (r.stage === "ready" && !report.feasible))
          }
          progress={
            <span>
              {debrief
                ? complete
                  ? "Moon mission · report"
                  : "Mission record · recovery incomplete"
                : "Return · " + (stageIndex + 1) + "/5"}
            </span>
          }
          nextHint={
            !debrief && r.stage === "rendezvous" && !canDock(r)
              ? "Slow down and line up"
              : undefined
          }
        />
      }
    >
      <main
        className={`workshop-main return-main ${debrief ? "is-debrief" : "return-expedition"} ${!debrief ? "return-departure" : ""}`}
        data-return-stage={r.stage}
        id="story-content"
        tabIndex={-1}
        aria-labelledby="return-title"
      >
        <div className="return-heading">
          <div>
            <span>{debrief ? "MISSION LOG" : "CREW RETURN"}</span>
            <h1 id="return-title">
              {debrief
                ? card?.crewRecovered === 3
                  ? "You brought everyone home."
                  : "Mission debrief"
                : (TITLES as Record<string, string>)[r.stage]}
            </h1>
          </div>
          <button
            className="game-info-trigger"
            onClick={() => {
              act({ type: "return-pause" });
              setPanel("notes");
            }}
          >
            <Info size={17} />
            {debrief ? "Full mission log" : "Flight notes"}
          </button>
        </div>
        {debrief && card ? (
          <Suspense
            fallback={
              <p role="status">Opening your recorded mission report…</p>
            }
          >
            <MissionDebrief
              session={session}
              onHome={frame.onHome}
              onRetry={() => setPanel("retry")}
              preview={reviewing}
            />
          </Suspense>
        ) : (
          <>
            <ReturnJourneyTrail stage={stageIndex} />
            <div className="return-layout">
              <section className="return-console" aria-label="Return controls">
                {r.stage === "ready" ? (
                  <div className="return-radio-preparation">
                    <h2>
                      {needsReturnCheck
                        ? "Ready to meet our orbit pilot?"
                        : "Our orbit pilot is ready."}
                    </h2>
                    <p>Check in before the ascent cabin launches.</p>
                    <CrewRadioExchange
                      session={session}
                      moment="departure"
                      received={!needsReturnCheck}
                      voiceEnabled={frame.voiceEnabled}
                    />
                    <button
                      type="button"
                      className="return-radio-action voyage-primary"
                      disabled={reviewing || !report.feasible}
                      onClick={() =>
                        needsReturnCheck
                          ? act({ type: "crew-return-check" })
                          : action("launch")
                      }
                    >
                      {needsReturnCheck
                        ? "Check in before liftoff"
                        : "Launch ascent cabin"}
                    </button>
                  </div>
                ) : voyage ? (
                  <ReturnVoyagePanel
                    flight={r}
                    action={action}
                    pilot={act}
                    pause={() => act({ type: "return-pause" })}
                    resume={() => act({ type: "return-resume" })}
                    finish={() => act({ type: "next" })}
                    disabled={reviewing}
                  />
                ) : (
                  <ReturnDepartureControls
                    flight={r}
                    feasible={report.feasible}
                    fuelOK={report.fuelOK}
                    supplyOK={report.supplyOK}
                    energyOK={report.energyOK}
                    action={action}
                    pilot={act}
                    onPause={() => act({ type: "return-pause" })}
                    onResume={() => act({ type: "return-resume" })}
                    disabled={reviewing}
                  />
                )}
                {warning ? (
                  <div className="return-alert" role="alert">
                    <TriangleAlert size={23} />
                    <strong>
                      {(RETURN_LINES as Record<string, string>)[r.feedback]}
                    </strong>
                  </div>
                ) : null}
              </section>
              <section className="return-scene">
                <SceneBoundary
                  fallback={
                    <SceneFallback
                      scene="return"
                      label="Mission view"
                      detail="Use the controls to keep playing"
                    />
                  }
                >
                  <Suspense
                    fallback={
                      <div className="return-fallback">
                        Opening return flight…
                      </div>
                    }
                  >
                    {voyage ? (
                      <ReturnVoyageViewport flight={r} gentle={gentle} />
                    ) : (
                      <ReturnViewport flight={r} gentle={gentle} />
                    )}
                  </Suspense>
                </SceneBoundary>
                {!voyage && (
                  <div className="return-scene-label">
                    <span>
                      {r.stage === "splashdown"
                        ? "EARTH · RECOVERY"
                        : r.stage === "entry-ready"
                          ? "EARTH · APPROACH"
                          : ["chutes", "chute-ready", "entry"].includes(r.stage)
                            ? "EARTH · ATMOSPHERE"
                            : r.stage === "coast"
                              ? "MOON → EARTH"
                              : "MOON · CREW RETURN"}
                    </span>
                    <strong>
                      {r.stage === "coast"
                        ? "3-day return"
                        : r.stage === "rendezvous"
                          ? canDock(r)
                            ? "Docking alignment ready"
                            : "Brake and align"
                          : r.stage === "ascending"
                            ? "Ascent in progress"
                            : "Bring the crew home"}
                    </strong>
                  </div>
                )}
                {!voyage && (
                  <div className="return-scene-note">
                    Cinematic scale · time compressed · <Term term="gravity" />
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      {panel ? (
        <GameInfo
          title={
            panel === "retry"
              ? "Try another mission?"
              : panel === "back"
                ? "Return checkpoint"
                : "Crew return · evidence & model"
          }
          onClose={() => setPanel(null)}
          pages={
            panel === "retry"
              ? [
                  <div key="retry">
                    <p>
                      Save your mission card to compare. Your crew and blueprint
                      stay; flight and science start fresh on Earth.
                    </p>
                    <button
                      className="game-info-trigger"
                      onClick={() => downloadMissionCard(session)}
                    >
                      Save this result
                    </button>
                    <button
                      className="conversation-next"
                      onClick={() => {
                        act({ type: "return-new-attempt" });
                        setPanel(null);
                      }}
                    >
                      Start new attempt
                    </button>
                  </div>,
                ]
              : panel === "back"
                ? [
                    <div key="back">
                      <p>Mission paused. Continue here, or return home.</p>
                      <button
                        className="game-info-trigger"
                        onClick={frame.onHome}
                      >
                        Mission home
                      </button>
                    </div>,
                  ]
                : [
                    <div key="account">
                      <h3>Three crew accounted for</h3>
                      <p>
                        Commander + scientist leave the Moon in the ascent
                        cabin. Their support specialist waits in the
                        command/service spacecraft. After docking, all three
                        transfer to the command module. The empty ascent cabin
                        is released, then the service engine performs Earth
                        departure.
                      </p>
                      <p>
                        Food reserve:{" "}
                        {(
                          (report.resources.supportUnitsRemaining ?? 0) / 3
                        ).toFixed(1)}{" "}
                        days for three crew. Ascent fuel:{" "}
                        {Math.round(report.resources.ascentPropellantKg ?? 0)}{" "}
                        kg. Service fuel:{" "}
                        {Math.round(report.resources.returnPropellantKg ?? 0)}{" "}
                        kg.
                      </p>
                      <p>
                        The rover and descent stage stay on the Moon.{" "}
                        {geo || session.moon.rover
                          ? `Sealed sample box contains ${report.physicalSampleKg.toFixed(1)} kg; samples were collected and stowed through real actions.`
                          : "This Ice mission measured exposed cuttings; no physical sample was stowed for return."}{" "}
                        The manifest’s 10-kg sample allowance remains
                        conservative allocated mass in the fuel equation.
                      </p>
                    </div>,
                    <div key="model">
                      <h3>Physical rule. Authored numbers.</h3>
                      <p>
                        Fuel uses the ideal rocket equation and the approved dry
                        masses. Ascent uses 2,100 m/s; rendezvous adds 20 m/s;
                        Earth departure uses 1,260 m/s. These are game
                        allowances. The earlier outward course correction is not
                        charged again.
                      </p>
                      <p>
                        Ascent: 10 virtual min. Rendezvous: 60 min. Earth burn:
                        3 min. Coast uses the two-body orbit flight time (about
                        3 days). Entry: 10 min. Chutes: 3 min. Each uses the
                        same 600-W cabin load and three crew-days per day.
                        Pausing, replaying speech and changing speed do not
                        consume extra mission time.
                      </p>
                      <p>
                        The coast follows an Earth-centred Kepler orbit, with
                        the Moon and Sun omitted after departure. Entry starts
                        at 121.92 km; two drogues at 7.3 km and three mains near
                        3 km follow the Apollo recovery sequence. Entry altitude
                        and visual scale are illustrative. Docking limits and
                        re-entry/parachute gates are teaching constraints, not
                        validated trajectory, aerothermal or parachute models.
                        Cabin power is an aggregate allocation including
                        return-capsule power.
                      </p>
                      <a
                        href="https://www.nasa.gov/history/apollo-11-mission-overview/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        NASA: Apollo ascent, docking and return ↗
                      </a>
                      <p>
                        <a
                          href="https://www.nasa.gov/history/55-years-ago-two-months-until-the-moon-landing/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          NASA: Apollo 10 entry and parachute sequence ↗
                        </a>
                      </p>
                    </div>,
                    <div key="result">
                      <h3>Evidence over guesses</h3>
                      <p>
                        {session.moon.outcome?.reasons.join(" ") ??
                          "Crew recovery is credited only after splashdown."}
                      </p>
                      <p>
                        {r.mistakes} return choice corrections.{" "}
                        {r.assisted
                          ? "Assistance used."
                          : "Challenge mode without added assistance."}{" "}
                        {session.moon.science.fieldworkStopped
                          ? "Surface work stopped early."
                          : ""}
                      </p>
                      <p>
                        Scene distances, maneuvers, thermal effects and timers
                        are simplified. This is a game, not a forecast or flight
                        certification.
                      </p>
                    </div>,
                    ...(debrief
                      ? session.moon.science.records.map((obs: any) => (
                          <div key={obs.id}>
                            <h3>
                              {obs.instrumentId.toUpperCase()} ·{" "}
                              {obs.locationId}
                            </h3>
                            <p>
                              {obs.signal}.{" "}
                              {obs.classification
                                ? (GEOLOGY_LABELS as Record<string, string>)[
                                    obs.classification
                                  ]
                                : (obs.result ?? "Uninterpreted clue")}{" "}
                              · {obs.quality ?? obs.confidence} quality.{" "}
                              {obs.transmitted
                                ? "Transmitted"
                                : "Not transmitted"}
                              .
                            </p>
                            <p>
                              {obs.points} new-measurement points.{" "}
                              {obs.depthRangeCm
                                ? `Sampled ${obs.depthRangeCm[0]}–${obs.depthRangeCm[1]} cm.`
                                : "Surface scan."}
                            </p>
                          </div>
                        ))
                      : []),
                    ...(debrief
                      ? session.moon.science.hazards.log.map((log: any) => (
                          <div key={log.id}>
                            <h3>
                              {log.kind} · {log.status}
                            </h3>
                            <p>{log.reason}</p>
                            <p>
                              {log.actions
                                .map((a: any) => a.action)
                                .join(" → ")}
                            </p>
                          </div>
                        ))
                      : []),
                  ]
          }
        />
      ) : null}
    </StoryShell>
  );
}
