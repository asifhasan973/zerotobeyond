import { SolarShelter, shelterActive } from "./radiation";
import { SourceNotes } from "../../core/learning/SourceNotes";
import {
  TRANSFER_DATES,
  captureOrbit,
  formatDepartureDate,
  LUNAR_ORBIT_TIERS,
} from "./transferModel.ts";
import {
  isEngineFrozen,
  useOrientationLifecycleStore,
  SceneBoundary,
  SceneFallback,
  GameInfo,
} from "@exo/ui";
import { useEffect, useRef, useState } from "react";
import { Check, Info, Pause, Play, RotateCcw, Rocket } from "lucide-react";
import type {
  WorkshopSession,
  MissionEvent,
} from "@/game/moon/workshop/lander/workshopSession";
import type { SelectionFrame } from "@/game/moon/crew/SelectionScreens";
import { StoryShell, StoryControls } from "@/shared/shell";
import { CrewHandoff } from "@/game/moon/crew/operations";
import { JourneyInstruments } from "./JourneyInstruments";
import { JourneyOrbitDialog } from "./JourneyOrbitDialog";
import { useGameSettings } from "@/shared/shell";
import { sound } from "@exo/audio";
import {
  ROUTES,
  routeReport,
  burnSafe,
  coastFraction,
  TRANSFER_MODEL,
  getLoiRequiredDv,
} from "./journey.ts";
import { LearningText } from "@/game/moon/core/learning/Learning";
import { JOURNEY_LINES } from "./journeyCopy.ts";
import "./journey.css";
import { JourneyViewport } from "./JourneyViewport";
export function JourneyScreen({
  session,
  dispatch,
  onBack: _onBack,
  frame,
}: {
  session: WorkshopSession;
  dispatch(event: MissionEvent): void;
  onBack?: () => void;
  frame: SelectionFrame;
}) {
  const { moon, progress, preparation } = session,
    j = moon.journey,
    stormActive = shelterActive(j.storm),
    { effects, gentle } = useGameSettings();
  const [panel, setPanel] = useState<"model" | "back" | "orbit" | null>(null);
  const selection = progress.stepId === "earth-orbit",
    endpoint = progress.stepId === "lunar-orbit",
    windowStage = j.stage.endsWith("window"),
    burning = j.stage.endsWith("burn"),
    complete = j.stage === "complete";
  const route = j.route ? routeReport(moon, j.route) : null;
  const activeTier =
    LUNAR_ORBIT_TIERS[j.orbitTier ?? "low"] ?? LUNAR_ORBIT_TIERS.low;
  const frozen = useOrientationLifecycleStore((state) => state.isFrozen);
  const pilot = j.version === 2,
    pilotBurn = pilot && burning;
  const latest = useRef(j);
  const held = useRef(new Set<string>());
  useEffect(() => {
    latest.current = j;
  }, [j]);
  useEffect(() => {
    if (j.paused || panel || frozen) {
      held.current.clear();
      if (j.firing) dispatch({ type: "journey-pilot", firing: false });
    }
  }, [j.paused, j.firing, panel, frozen, dispatch]);
  const required = route
    ? j.stage.startsWith("loi")
      ? getLoiRequiredDv(j, route.loiMS)
      : route.tliMS
    : 0;
  const orbit = route?.solution
    ? captureOrbit(
        route.arrivalSpeedKmS,
        j.dv ?? 0,
        j.radialDv ?? 0,
        activeTier.altitudeKm,
      )
    : null;
  useEffect(() => {
    if (!frozen && selection && j.stage === "route" && !j.date)
      dispatch({ type: "journey-date", date: TRANSFER_DATES[0] });
  }, [frozen, selection, j.stage, j.date, dispatch]);
  const safe = windowStage && burnSafe(j) && !j.paused,
    correct = j.stage === "loi-window" ? "retrograde" : "prograde";
  const adviceId = complete
    ? "arrived"
    : j.feedback
      ? (Object.entries(JOURNEY_LINES).find(
          ([, line]) => line === j.feedback,
        )?.[0] ?? "early")
      : j.paused
        ? "paused"
        : selection
          ? "route"
          : j.stage === "coast"
            ? "coast"
            : burning
              ? "burn"
              : j.stage === "loi-window"
                ? "loi"
                : "tli";
  const advice = pilotBurn
    ? j.stage === "loi-burn"
      ? "Align to 0° for retrograde braking. Reduce throttle near the target, then check trajectory."
      : "Align with the marker. Hold Space to fire. Cut the engine at the target delta-v."
    : JOURNEY_LINES[adviceId as keyof typeof JOURNEY_LINES];
  useEffect(() => {
    if (
      panel ||
      frozen ||
      selection ||
      complete ||
      j.paused ||
      (windowStage && (j.mode === "guided" || pilot))
    )
      return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (document.hidden || isEngineFrozen()) return;

      const current = latest.current;
      if (!current.paused && pilotBurn) {
        let newAngle = current.angle ?? 0;
        let newThrottle = current.throttle ?? 0.5;
        let changed = false;

        if (held.current.has("left")) {
          newAngle = Math.max(-90, newAngle - 75 * dt);
          changed = true;
        }
        if (held.current.has("right")) {
          newAngle = Math.min(90, newAngle + 75 * dt);
          changed = true;
        }
        if (held.current.has("up")) {
          newThrottle = Math.min(1, newThrottle + 0.6 * dt);
          changed = true;
        }
        if (held.current.has("down")) {
          newThrottle = Math.max(0, newThrottle - 0.6 * dt);
          changed = true;
        }
        if (changed) {
          dispatch({
            type: "journey-pilot",
            angle: Math.round(newAngle),
            throttle: Math.round(newThrottle * 100) / 100,
          });
        }
      }

      dispatch({ type: "journey-tick", seconds: dt });
    }, 50);
    return () => clearInterval(timer);
  }, [
    panel,
    frozen,
    selection,
    complete,
    j.paused,
    j.stage,
    j.mode,
    windowStage,
    pilot,
    pilotBurn,
    dispatch,
  ]);
  useEffect(() => {
    const pause = () => {
      held.current.clear();
      dispatch({ type: "journey-pause" });
    };
    const hide = () => {
      if (document.hidden) pause();
    };
    const hint = () => {
      dispatch({ type: "journey-hint" });
      dispatch({ type: "journey-pause" });
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
    if (burning && !j.paused && (!pilot || j.firing)) sound.startRocketRoar();
    else sound.stopRocketRoar();
    return () => sound.stopRocketRoar();
  }, [effects, burning, j.paused, pilot, j.firing]);
  useEffect(() => {
    sound.setMuted(!effects);
    if (complete) sound.playOrbitHarmony();
  }, [complete, effects]);
  useEffect(() => {
    if (!pilotBurn || panel || frozen) {
      held.current.clear();
      return;
    }
    const down = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        isEngineFrozen() ||
        document.querySelector("dialog[open]")
      )
        return;
      if (e.repeat && e.code === "KeyP") return;
      const target = e.target as HTMLElement;
      if (
        target.closest('input,select,textarea,[role="dialog"]') ||
        target.isContentEditable
      )
        return;
      if (["Space", "Enter"].includes(e.code) && target.closest("button, a"))
        return;
      if (
        [
          "KeyA",
          "KeyD",
          "KeyW",
          "KeyS",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Space",
          "Enter",
          "KeyP",
        ].includes(e.code)
      ) {
        e.preventDefault();
      } else {
        return;
      }
      if (e.code === "KeyP") {
        held.current.clear();
        dispatch({
          type: latest.current.paused ? "journey-resume" : "journey-pause",
        });
        return;
      }
      if (latest.current.paused) return;

      if (e.code === "Enter") {
        held.current.clear();
        dispatch({ type: "journey-finish-burn" });
        return;
      }

      const keyAction =
        e.code === "KeyA" || e.code === "ArrowLeft"
          ? "left"
          : e.code === "KeyD" || e.code === "ArrowRight"
            ? "right"
            : e.code === "KeyW" || e.code === "ArrowUp"
              ? "up"
              : e.code === "KeyS" || e.code === "ArrowDown"
                ? "down"
                : e.code === "Space"
                  ? "fire"
                  : null;

      if (!keyAction) return;

      const wasAlreadyHeld = held.current.has(keyAction);
      held.current.add(keyAction);

      // Instant single-tap response on first keydown
      if (!wasAlreadyHeld) {
        const cur = latest.current;
        if (keyAction === "left") {
          dispatch({
            type: "journey-pilot",
            angle: Math.max(-180, (cur.angle ?? 0) - 2),
          });
        } else if (keyAction === "right") {
          dispatch({
            type: "journey-pilot",
            angle: Math.min(180, (cur.angle ?? 0) + 2),
          });
        } else if (keyAction === "up") {
          dispatch({
            type: "journey-pilot",
            throttle: Math.min(1, (cur.throttle ?? 0.5) + 0.05),
          });
        } else if (keyAction === "down") {
          dispatch({
            type: "journey-pilot",
            throttle: Math.max(0, (cur.throttle ?? 0.5) - 0.05),
          });
        } else if (keyAction === "fire") {
          dispatch({ type: "journey-pilot", firing: true });
        }
      }
    };

    const up = (e: KeyboardEvent) => {
      const keyAction =
        e.code === "KeyA" || e.code === "ArrowLeft"
          ? "left"
          : e.code === "KeyD" || e.code === "ArrowRight"
            ? "right"
            : e.code === "KeyW" || e.code === "ArrowUp"
              ? "up"
              : e.code === "KeyS" || e.code === "ArrowDown"
                ? "down"
                : e.code === "Space"
                  ? "fire"
                  : null;

      if (keyAction) {
        held.current.delete(keyAction);
        if (keyAction === "fire") {
          dispatch({ type: "journey-pilot", firing: false });
        }
      }
    };

    const stop = () => {
      held.current.clear();
      if (latest.current.firing) {
        dispatch({ type: "journey-pilot", firing: false });
      }
    };

    const heldSet = held.current;
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    window.addEventListener("game-orientation-pause", stop);
    return () => {
      heldSet.clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
      window.removeEventListener("game-orientation-pause", stop);
    };
  }, [pilotBurn, panel, frozen, dispatch]);
  const act = (event: MissionEvent) => {
    if (isEngineFrozen()) return;
    held.current.clear();
    sound.setMuted(!effects);
    sound.playRadioBeep();
    dispatch(event);
  };
  const retryNeeded =
    j.feedback?.startsWith("Overburn") ||
    j.feedback?.startsWith("Unsafe capture");
  const needsHandoff = endpoint && !moon.crewOperations.handoff;
  const next = () =>
    needsHandoff
      ? act({ type: "crew-handoff" })
      : pilotBurn && !j.paused
        ? act({ type: "journey-finish-burn" })
        : selection
          ? (act({ type: "journey-pause" }), setPanel("orbit"))
          : complete
            ? act({ type: "next" })
            : j.paused
              ? act({
                  type: retryNeeded ? "journey-retry" : "journey-resume",
                })
              : act({ type: "journey-burn" });
  const nextLabel = endpoint
    ? needsHandoff
      ? "Confirm our crew roles"
      : "Prepare to land"
    : selection
      ? "Confirm route"
      : complete
        ? "View lunar orbit"
        : j.paused
          ? retryNeeded
            ? "Retry burn"
            : "Resume flight"
          : windowStage
            ? pilot
              ? "Take engine control"
              : "Fire engine"
            : pilotBurn
              ? "Check trajectory"
              : burning
                ? "Engine firing…"
                : "Coasting…";
  const supplies = moon.resources.supportUnitsRemaining ?? 0,
    energy = (moon.resources.platformEnergyWh ?? 0) / 1000;
  return (
    <StoryShell
      {...frame}
      controls={
        <StoryControls
          onBack={() => {
            act({ type: "journey-pause" });
            setPanel("back");
          }}
          onNext={next}
          nextLabel={nextLabel}
          nextHidden={stormActive}
          nextDisabled={
            !!panel ||
            frozen ||
            (selection && !j.route) ||
            (pilotBurn &&
              !j.paused &&
              (j.firing ||
                Math.abs(j.angle ?? 0) > 8 ||
                (j.dv ?? 0) < required * 0.992 ||
                (j.dv ?? 0) > required * 1.008)) ||
            (!selection && !complete && !windowStage && !j.paused && !pilotBurn)
          }
          extraActions={
            pilotBurn ? (
              <button
                type="button"
                className="journey-engine"
                aria-pressed={!!j.firing}
                disabled={
                  !pilotBurn ||
                  j.paused ||
                  !!panel ||
                  frozen ||
                  ((j.dv ?? 0) >= required * 0.992 && !j.firing)
                }
                onClick={() =>
                  act({ type: "journey-pilot", firing: !j.firing })
                }
              >
                {j.firing ? "Cut engine" : "Fire engine"}
              </button>
            ) : undefined
          }
          progress={
            <span>
              Journey ·{" "}
              {selection
                ? "Earth orbit"
                : complete
                  ? "Lunar orbit"
                  : "Moon transfer"}
            </span>
          }
          nextHint={
            selection && route && !route.feasible
              ? "Pick another route"
              : windowStage && !j.paused
                ? j.mode === "guided"
                  ? "Choose engine direction"
                  : "Fire while green"
                : undefined
          }
        />
      }
    >
      <main
        data-burn-direction={windowStage ? correct : undefined}
        className={`workshop-main journey-main ${stormActive ? "is-solar" : ""} ${windowStage ? "is-window" : ""} ${pilot ? "is-pilot" : ""}`}
        id="story-content"
        tabIndex={-1}
        aria-labelledby="journey-title"
      >
        <div className="journey-heading">
          <h1 id="journey-title">
            {stormActive
              ? "Protect our crew"
              : selection
                ? "Choose your Moon route"
                : complete
                  ? "Hello, lunar orbit!"
                  : j.stage === "coast"
                    ? "Next stop: the Moon"
                    : j.stage.startsWith("loi")
                      ? "Capture lunar orbit"
                      : "Fly your departure burn"}
          </h1>
          <div className="journey-heading-actions">
            <button
              className="game-info-trigger"
              onClick={() => {
                act({ type: "journey-pause" });
                setPanel("model");
              }}
            >
              <Info size={16} /> Flight model
            </button>
            {!selection && !complete ? (
              <>
                <div className="journey-speed" aria-label="Journey speed">
                  {!pilotBurn
                    ? [1, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          aria-pressed={j.speed === speed}
                          onClick={() => act({ type: "journey-speed", speed })}
                        >
                          {speed}×
                        </button>
                      ))
                    : null}
                  <button
                    aria-label={j.paused ? "Resume journey" : "Pause journey"}
                    onClick={() =>
                      act({
                        type: j.paused ? "journey-resume" : "journey-pause",
                      })
                    }
                  >
                    {j.paused ? <Play size={17} /> : <Pause size={17} />}
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <p className="journey-advice">
            <LearningText
              text={
                stormActive
                  ? "Commander: Prepare the cabin shelter. Keep everyone inside until the all-clear."
                  : advice
              }
            />
          </p>
        </div>
        <div className="journey-layout">
          <section className="journey-console" aria-label="Journey controls">
            {stormActive ? (
              <SolarShelter
                storm={j.storm!}
                session={session}
                disabled={frozen || j.paused || !!panel}
                act={(action) => act({ type: "journey-storm", action })}
              />
            ) : selection ? (
              <>
                <label className="journey-date">
                  Departure date · TDB
                  <select
                    value={j.date ?? ""}
                    onChange={(e) =>
                      act({ type: "journey-date", date: e.target.value })
                    }
                  >
                    {!pilot ? (
                      <option value="">Legacy game profiles</option>
                    ) : null}
                    {TRANSFER_DATES.map((date) => (
                      <option key={date} value={date}>
                        {formatDepartureDate(date)}
                      </option>
                    ))}
                  </select>
                </label>
                {!pilot ? (
                  <div className="journey-mode">
                    {(["guided", "challenge"] as const).map((mode) => (
                      <button
                        key={mode}
                        aria-pressed={j.mode === mode}
                        onClick={() => act({ type: "journey-mode", mode })}
                      >
                        {mode === "guided" ? "Guided" : "Challenge"}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="journey-routes">
                  {ROUTES.map((r) => {
                    const report = routeReport(moon, r.id);
                    return (
                      <button
                        key={r.id}
                        className={!report.feasible ? "is-unavailable" : ""}
                        aria-pressed={j.route === r.id}
                        onClick={() => act({ type: "journey-route", id: r.id })}
                      >
                        <span>
                          <strong>
                            {pilot
                              ? r.id === "fast"
                                ? "Short transfer"
                                : r.id === "balanced"
                                  ? "Medium transfer"
                                  : "Long transfer"
                              : r.name}
                          </strong>
                          <b>{report.days} days</b>
                        </span>
                        <small>
                          Fuel: {Math.round(report.tliFuelKg / 1000)} t
                          departure · {Math.round(report.loiFuelKg / 1000)} t
                          arrival
                        </small>
                        {!report.feasible ? (
                          <em>
                            {!report.solution && pilot
                              ? "Choose another date or route"
                              : !report.fuelOK
                                ? "Fuel / return reserve insufficient"
                                : !report.powerOK
                                  ? "Cabin energy insufficient"
                                  : `Needs ${report.neededDays}+ mission days & supplies`}
                          </em>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : pilotBurn ? (
              <JourneyInstruments
                journey={j}
                required={required}
                disabled={j.paused || !!panel || frozen}
                dispatch={act}
                status={
                  j.paused
                    ? retryNeeded
                      ? j.feedback?.startsWith("Unsafe capture")
                        ? "Unsafe capture · align before firing, then retry"
                        : "Overburn · retry this maneuver"
                      : "Paused · resume to continue"
                    : (j.dv ?? 0) >= required * 0.992
                      ? "Target acquired · engine off · check trajectory"
                      : j.stage === "loi-burn"
                        ? `${orbit?.bound ? "Captured" : "Braking for capture"} · ${activeTier.altitudeKm} km target`
                        : "Align, fire, then reduce throttle near cutoff"
                }
              />
            ) : windowStage ? (
              <>
                <h2>
                  {j.stage === "tli-window"
                    ? "Speed up toward the Moon"
                    : "Slow down for lunar orbit"}
                </h2>
                {j.stage === "loi-window" ? (
                  <p className="journey-briefing">
                    {activeTier.name} · {activeTier.altitudeKm} km
                    <br />
                    Retrograde arrival burn: {Math.round(
                      route?.loiMS ?? 0,
                    )}{" "}
                    m/s. The craft turns to brake along its flight path.
                  </p>
                ) : (
                  <p className="journey-briefing">
                    {activeTier.altitudeKm} km lunar target locked. Departure
                    burn: {Math.round(required)} m/s.
                  </p>
                )}
                {!pilot ? (
                  <div className="journey-directions">
                    {(["prograde", "retrograde"] as const).map((direction) => (
                      <button
                        data-burn-direction={direction}
                        key={direction}
                        className={
                          j.mode === "guided" && correct === direction
                            ? "is-hinted"
                            : ""
                        }
                        aria-pressed={j.direction === direction}
                        onClick={() =>
                          act({ type: "journey-direction", direction })
                        }
                      >
                        <Rocket size={20} />
                        <strong>
                          {direction === "prograde"
                            ? "Point forward →"
                            : "← Point backward"}
                        </strong>
                      </button>
                    ))}
                  </div>
                ) : null}
                {j.mode === "challenge" && !pilot ? (
                  <div
                    className={`journey-window ${safe ? "is-safe" : ""}`}
                    aria-label={
                      safe ? "Safe burn window" : "Wait for safe burn window"
                    }
                  >
                    <span
                      style={{
                        left: `${Math.min(100, (j.elapsed / 4) * 100)}%`,
                      }}
                    />
                    <i />
                    <b>{safe ? "FIRE NOW" : "WAIT FOR GREEN"}</b>
                  </div>
                ) : null}
              </>
            ) : complete ? (
              endpoint ? (
                <CrewHandoff
                  session={session}
                  voiceEnabled={frame.voiceEnabled}
                />
              ) : (
                <div className="journey-arrived">
                  <Check size={45} />
                  <h2>We reached lunar orbit.</h2>
                  <p>Prepare our crew for the landing.</p>
                </div>
              )
            ) : (
              <>
                <h2>
                  {burning
                    ? "Engine burn in progress"
                    : "Coasting through space"}
                </h2>
                <progress
                  max={
                    burning
                      ? TRANSFER_MODEL.burnScreenSeconds
                      : TRANSFER_MODEL.coastScreenSeconds
                  }
                  value={j.elapsed}
                  aria-label="Journey phase progress"
                />
                <p>
                  {burning
                    ? "Fuel follows engine use."
                    : `${((route?.days ?? 0) * coastFraction(j)).toFixed(1)} / ${route?.days ?? 0} travel days`}
                </p>
              </>
            )}
            {j.feedback && !pilotBurn && !stormActive ? (
              <p className="journey-alert" role="alert">
                {j.feedback}
              </p>
            ) : null}
            {!selection && !stormActive ? (
              <>
                <p className="journey-resource-line">
                  Fuel{" "}
                  {(
                    (j.stage.startsWith("tli")
                      ? (moon.resources.upperStagePropellantKg ?? 0)
                      : (moon.resources.returnPropellantKg ?? 0)) / 1000
                  ).toFixed(1)}{" "}
                  t · Return reserve{" "}
                  {((route?.returnReserveKg ?? 0) / 1000).toFixed(1)} t
                </p>
              </>
            ) : null}
          </section>
          <section
            className="journey-scene"
            tabIndex={0}
            aria-label="Earth to Moon scene. Focus here for flight keyboard controls."
          >
            <SceneBoundary
              fallback={
                <SceneFallback
                  scene="journey"
                  label="Mission view"
                  detail="Use the controls to keep playing"
                />
              }
            >
              <JourneyViewport
                journey={j}
                preparation={preparation}
                gentle={gentle}
              />
            </SceneBoundary>
            <div className="journey-scene-heading">
              <span>
                {complete
                  ? `LUNAR ORBIT · ${activeTier.altitudeKm} KM`
                  : j.stage.startsWith("loi")
                    ? `LUNAR APPROACH · ${activeTier.altitudeKm} KM TARGET`
                    : selection
                      ? "EARTH PARKING ORBIT · 200 KM"
                      : "EARTH → MOON"}
              </span>
              <strong>
                {complete || j.stage.startsWith("loi")
                  ? `≈${(route?.circularSpeedKmS ?? activeTier.speedKmS).toFixed(2)} km/s target speed`
                  : selection
                    ? "≈7.79 km/s orbital speed"
                    : "Three crew · capsule + lunar lander"}
              </strong>
            </div>
            <div className="journey-scene-footer">
              <span>
                Body sizes adjusted in map · time compressed
                <br />
                <SourceNotes ids={["horizons"]} />
              </span>
              <span>
                {(moon.resources.elapsedMissionSeconds / 86400).toFixed(2)}{" "}
                mission days elapsed
              </span>
            </div>
          </section>
        </div>
      </main>
      {panel === "orbit" ? (
        <JourneyOrbitDialog
          moon={moon}
          onSelect={(tier) => act({ type: "journey-select-orbit", tier })}
          onCancel={() => setPanel(null)}
          onConfirm={() => {
            act({ type: "journey-confirm-route" });
            setPanel(null);
          }}
        />
      ) : null}
      {panel && panel !== "orbit" ? (
        <GameInfo
          title={
            panel === "back" ? "Mission checkpoints" : "How this flight works"
          }
          onClose={() => setPanel(null)}
          pages={
            panel === "back"
              ? [
                  <div key="checkpoint">
                    <p>Your spacecraft stays at its current position.</p>
                    <button
                      className="game-info-trigger"
                      onClick={() => {
                        act({ type: "journey-restart" });
                        setPanel(null);
                      }}
                    >
                      <RotateCcw size={17} />
                      Retry from Earth orbit
                    </button>
                    <button
                      className="game-info-trigger"
                      onClick={frame.onHome}
                    >
                      Mission home
                    </button>
                    <p>
                      Retry restores the orbit checkpoint and records
                      assistance.
                    </p>
                  </div>,
                ]
              : [
                  <div key="sequence">
                    <p>
                      Earth orbit → upper-stage departure burn → coast →
                      service-engine braking burn → lunar orbit. There is no ISS
                      stop.
                    </p>
                    <p>Forward makes us faster. Backward slows us down.</p>
                    <a
                      href="https://www.nasa.gov/missions/apollo/apollo-10-mission-details/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NASA: Apollo departure and Moon arrival ↗
                    </a>
                  </div>,
                  <div key="accounts">
                    <p>
                      Supplies: {supplies.toFixed(1)} crew-day kits · Cabin
                      energy: {energy.toFixed(1)} kWh · Return reserve:{" "}
                      {((route?.returnReserveKg ?? 0) / 1000).toFixed(1)} t.
                    </p>
                    <p>
                      Target: {activeTier.altitudeKm} km · Arrival burn:{" "}
                      {Math.round(route?.loiMS ?? 0)} m/s. Fuel estimates
                      include a 5% maneuver margin. Burn time is compressed ×20.
                      Alignment within ±8° delivers the maneuver; off-axis
                      thrust spends fuel and adds radial velocity.
                    </p>
                    {orbit && j.stage.startsWith("loi") ? (
                      <p>
                        Calculated orbit: {orbit.bound ? "bound" : "flyby"} ·
                        periapsis {Math.round(orbit.periapsisKm)} km · apoapsis{" "}
                        {Number.isFinite(orbit.apoapsisKm)
                          ? `${Math.round(orbit.apoapsisKm)} km`
                          : "escape"}
                        .
                      </p>
                    ) : null}
                    <p>
                      Bundled date profiles use NASA/JPL Horizons vectors and
                      numerically integrated Earth–Moon–Sun trajectories. Legacy
                      saves retain authored route profiles. Spacecraft masses,
                      thrust, safety thresholds and engine Isp remain authored
                      educational inputs. Fuel uses the ideal rocket equation
                      with a departure/arrival margin.
                    </p>
                    <p>
                      Moon arrival carries the full fueled lander. Earth-return
                      fuel is reserved for the lighter spacecraft after the
                      lander is left behind. Solar charging of the rover is not
                      applied to cabin power.
                    </p>
                    <a
                      href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NASA: ideal rocket equation ↗
                    </a>
                  </div>,
                  <div key="data">
                    <p>
                      Reference data: 1–7 November 2026. Displayed dates cycle
                      through this bundled dataset; no live ephemeris request is
                      made. Earth-centred ICRF, TDB time. Seven-day educational
                      dataset; these are not launch-site windows or
                      NASA-certified flights. Lunar targets use a two-body
                      circular-orbit approximation; the path is an illustrative,
                      smoothly joined display.
                    </p>
                    <a
                      href="https://ssd.jpl.nasa.gov/horizons/manual.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NASA/JPL Horizons data and frames ↗
                    </a>
                  </div>,
                  <p key="limits">
                    Speed changes screen time only. Stage disposal and lander
                    retrieval are compressed at departure. Sounds are cabin/game
                    effects. Radiation, entry heating and full orbital dynamics
                    are not simulated.
                  </p>,
                ]
          }
        />
      ) : null}
    </StoryShell>
  );
}
