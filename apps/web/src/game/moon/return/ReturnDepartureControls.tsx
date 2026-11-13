import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crosshair,
  Flame,
  Orbit,
  Pause,
  Play,
  Rocket,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { canDock, returnFrameLimit } from "./return";
import type { ReturnAction, ReturnEvent, ReturnState } from "./return";

const stops = [
  { name: "Lift off", detail: "Leave the Moon", Icon: Rocket },
  { name: "Dock", detail: "Bring the crew together", Icon: Orbit },
  { name: "Earth burn", detail: "Set a course home", Icon: Flame },
  { name: "Re-entry", detail: "Protect the capsule", Icon: ShieldCheck },
  { name: "Home", detail: "Ocean recovery", Icon: Waves },
];

export function ReturnJourneyTrail({ stage }: { stage: number }) {
  return (
    <ol className="return-journey-trail" aria-label="Journey home">
      {stops.map(({ name, detail, Icon }, index) => (
        <li
          key={name}
          className={
            index < stage ? "is-done" : index === stage ? "is-current" : ""
          }
          aria-current={index === stage ? "step" : undefined}
        >
          <span className="return-stop-icon">
            {index < stage ? <Check size={17} /> : <Icon size={19} />}
          </span>
          <span>
            <strong>{name}</strong>
            <small>{detail}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ReturnDepartureControls({
  flight: r,
  feasible,
  fuelOK,
  supplyOK,
  energyOK,
  action,
  pilot,
  onPause,
  onResume,
  disabled = false,
}: {
  flight: ReturnState;
  feasible: boolean;
  fuelOK: boolean;
  supplyOK: boolean;
  energyOK: boolean;
  action(value: ReturnAction): void;
  pilot(value: Extract<ReturnEvent, { type: "return-burn-pilot" }>): void;
  onPause(): void;
  onResume(): void;
  disabled?: boolean;
}) {
  const docking = r.stage === "rendezvous";
  const burn = r.stage === "burning";
  const departure = r.stage === "docked" || burn || r.stage === "coast";
  const aligned = docking
    ? Math.abs(r.alignment) <= 0.2
    : Math.abs(r.burnAngle ?? 0) <= 8;
  const slow = r.closingMS <= 0.25;
  const percent = Math.min(
    100,
    Math.round((r.frame / returnFrameLimit(r)) * 100),
  );
  const phase = departure ? 3 : docking ? 2 : 1;
  const title = docking
    ? canDock(r)
      ? "Make the connection."
      : "A gentle approach."
    : r.stage === "docked"
      ? "Together. Ready for Earth."
      : burn
        ? "Point home. Build speed."
        : r.stage === "coast"
          ? "Earth is calling."
          : r.stage === "ascending"
            ? "Climbing to orbit."
            : "Leave a little behind.";
  return (
    <div className="departure-task">
      <div className="departure-task-heading">
        <span>YOUR NEXT MOVE</span>
        <span>0{phase} / 03</span>
      </div>
      <h2>{title}</h2>
      <p className="departure-instruction">
        {docking
          ? "Slow down, center the marker, then join the cabins."
          : burn
            ? "Keep the pointer in the green zone. Fire the engine to build return speed."
            : r.stage === "docked"
              ? "All three explorers are aboard. The empty lander stays at the Moon."
              : r.stage === "ascending"
                ? "Your cabin is heading for the spacecraft waiting above the Moon."
                : r.stage === "coast"
                  ? "The engine is off. Your spacecraft is now on its journey home."
                  : "The landing legs and rover stay on the Moon. Your crew goes home."}
      </p>
      <fieldset disabled={disabled}>
        {r.stage === "ready" && (
          <>
            <div className="departure-checks">
              {[
                [fuelOK, "Return fuel"],
                [supplyOK, "Crew supplies"],
                [energyOK, "Cabin power"],
              ].map(([ok, label]) => (
                <div
                  key={String(label)}
                  className={ok ? "is-ready" : "is-warn"}
                >
                  <span>{ok ? <Check size={15} /> : "!"}</span>
                  {String(label)}
                  <small>{ok ? "Ready" : "Check"}</small>
                </div>
              ))}
            </div>
            <button
              className="departure-primary"
              disabled={!feasible}
              onClick={() => action("launch")}
            >
              <Rocket size={19} />
              Lift off from the Moon
              <ArrowRight size={18} />
            </button>
          </>
        )}
        {r.stage === "ascending" && (
          <>
            <div className="departure-flight-progress">
              <Rocket size={31} />
              <strong>
                {percent}
                <small>%</small>
              </strong>
              <span>Moon surface → lunar orbit</span>
            </div>
            <progress
              max={100}
              value={percent}
              aria-label="Ascent to lunar orbit"
            />
          </>
        )}
        {docking && (
          <>
            <div
              className={`departure-reticle ${aligned && slow ? "is-ready" : ""}`}
              role="img"
              aria-label={`Docking marker ${aligned ? "centered" : r.alignment > 0 ? "right of center" : "left of center"}`}
            >
              <div className="departure-reticle-ring" />
              <span className="departure-reticle-axis" />
              <Crosshair
                className="departure-docking-marker"
                size={34}
                style={{ left: `${50 + r.alignment * 34}%` }}
              />
              <small>
                {aligned ? "CENTERED" : "MOVE THE MARKER TO THE CENTER"}
              </small>
            </div>
            <div className="departure-readouts">
              <div data-ready={slow}>
                <span>Approach speed</span>
                <strong>
                  {r.closingMS.toFixed(2)} <small>m/s</small>
                </strong>
                <small>Goal: 0.25 or less</small>
              </div>
              <div data-ready={aligned}>
                <span>Cabin alignment</span>
                <strong>{aligned ? "On target" : "Adjust"}</strong>
                <small>Goal: inside the ring</small>
              </div>
            </div>
            <div className="departure-nudges">
              <button aria-label="Align left" onClick={() => action("left")}>
                <ArrowLeft size={18} />
                Left
              </button>
              <button
                aria-label="Brake approach"
                onClick={() => action("brake")}
              >
                Slow down
              </button>
              <button aria-label="Align right" onClick={() => action("right")}>
                Right
                <ArrowRight size={18} />
              </button>
            </div>
            <button
              className="departure-primary"
              disabled={!canDock(r)}
              onClick={() => action("dock")}
            >
              <Orbit size={19} />
              {canDock(r) ? "Dock the cabins" : "Slow down & align to dock"}
            </button>
            <small className="departure-key-hint">
              ← → steer · Space slows · E docks
            </small>
          </>
        )}
        {r.stage === "docked" && (
          <>
            <div className="departure-reunion">
              <span>03</span>
              <div>
                <strong>One crew. One spacecraft.</strong>
                <small>Everyone is safely aboard.</small>
              </div>
              <Check size={24} />
            </div>
            <button
              className="departure-primary"
              onClick={() => action("depart")}
            >
              <Flame size={19} />
              Start the Earth-return burn
              <ArrowRight size={18} />
            </button>
          </>
        )}
        {burn && (
          <>
            <label className="departure-control">
              <span>
                Point toward Earth
                <strong>{Math.round(r.burnAngle ?? 0)}°</strong>
              </span>
              <div className="departure-angle-scale">
                <i />
                <b
                  style={{ left: `${50 + ((r.burnAngle ?? 0) / 90) * 45}%` }}
                />
              </div>
              <input
                aria-label="Spacecraft alignment angle"
                type="range"
                min={-90}
                max={90}
                value={r.burnAngle ?? 0}
                onChange={(e) =>
                  pilot({
                    type: "return-burn-pilot",
                    angle: Number(e.target.value),
                  })
                }
              />
              <small>
                {aligned
                  ? "On target · keep it here"
                  : "Move into the green zone to make progress"}
              </small>
            </label>
            <label className="departure-control">
              <span>
                Engine power
                <strong>{Math.round((r.burnThrottle ?? 0.5) * 100)}%</strong>
              </span>
              <input
                aria-label="Engine throttle scale"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={r.burnThrottle ?? 0.5}
                onChange={(e) =>
                  pilot({
                    type: "return-burn-pilot",
                    throttle: Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="departure-burn-progress">
              <span>
                Return speed gained
                <strong>{Math.round(percent * 12)} / 1200 m/s</strong>
              </span>
              <progress
                max={100}
                value={percent}
                aria-label="Earth-return burn progress"
              />
            </div>
            <button
              className={`departure-primary ${r.burnFiring ? "is-firing" : ""}`}
              aria-pressed={!!r.burnFiring}
              onClick={() =>
                pilot({ type: "return-burn-pilot", firing: !r.burnFiring })
              }
            >
              <Flame size={19} />
              {r.burnFiring ? "Cut the engine" : "Fire the engine"}
            </button>
            <small className="departure-key-hint">
              ← → aim · ↑ ↓ power · Space engine on/off
            </small>
          </>
        )}
        {r.stage === "coast" && (
          <>
            <div className="departure-reunion">
              <Check size={28} />
              <div>
                <strong>Earth course set</strong>
                <small>Three explorers are heading home.</small>
              </div>
            </div>
            <button
              className="departure-primary"
              onClick={() => action("skip-coast")}
            >
              Continue to Earth
              <ArrowRight size={18} />
            </button>
          </>
        )}
        {r.paused ? (
          <button className="departure-pause" onClick={onResume}>
            <Play size={15} />
            Resume flight
          </button>
        ) : r.stage === "ascending" || burn ? (
          <button className="departure-pause" onClick={onPause}>
            <Pause size={15} />
            Pause flight
          </button>
        ) : null}
      </fieldset>
    </div>
  );
}
