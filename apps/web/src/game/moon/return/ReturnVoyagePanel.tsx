import { SourceNotes } from "../core/learning/SourceNotes";
import {
  ArrowRight,
  Check,
  Flame,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { RETURN_COAST_SECONDS, sampleReturnTrajectory } from "@exo/engine";
import { returnFrameLimit, returnVisualFrame } from "./return";
import type { ReturnState, ReturnAction, ReturnEvent } from "./return";
export function ReturnVoyagePanel({
  flight: r,
  action,
  pilot,
  resume,
  pause,
  finish,
  disabled = false,
}: {
  flight: ReturnState;
  action(a: ReturnAction): void;
  pilot(e: Extract<ReturnEvent, { type: "return-burn-pilot" }>): void;
  resume(): void;
  pause(): void;
  finish(): void;
  disabled?: boolean;
}) {
  const p = Math.min(1, returnVisualFrame(r, 0) / returnFrameLimit(r));
  const coast = sampleReturnTrajectory(
    r.stage === "coast"
      ? p
      : r.stage === "burning" || r.stage === "docked"
        ? 0
        : 1,
  );
  const entry = r.stage === "entry";
  const chutes = r.stage === "chutes";
  const altitude = entry
    ? 121.92 * (1 - p) + 7.3152 * p
    : chutes
      ? p < 0.35
        ? 7.3152 - ((7.3152 - 3.048) * p) / 0.35
        : 3.048 * (1 - (p - 0.35) / 0.65)
      : r.stage === "chute-ready"
        ? 7.3152
        : r.stage === "splashdown"
          ? 0
          : coast.altitudeKm;
  const titles = {
    docked: "Departure clearance",
    burning: "Leave lunar orbit",
    coast: "The long way home",
    "entry-ready": "Only the capsule returns",
    entry: "Let the atmosphere brake",
    "chute-ready": "Slow enough for parachutes",
    chutes:
      p < 0.35
        ? "Drogues stabilize the cabin"
        : "Three mains. One safe landing.",
    splashdown: "Welcome home, explorers.",
  };
  const copy = {
    docked:
      "The lunar cabin stays behind. Point along the departure heading, then fire the service engine.",
    burning:
      "Match the departure heading. This fixed-thrust engine changes your orbit; it does not point straight at Earth.",
    coast:
      "The engine is off. Gravity curves your path toward Earth. Watch in Craft or Trajectory view.",
    "entry-ready": r.serviceSeparated
      ? "The heat shield is exposed. Turn the capsule blunt-end first before entering the atmosphere."
      : "Release the service module before entry. It cannot land with the crew capsule.",
    entry:
      "Compressed air heats the shield. Atmospheric drag removes speed; no rocket engine is firing.",
    "chute-ready":
      "Entry has slowed the capsule. Deploy the drogue system first; the main parachutes follow lower down.",
    chutes:
      p < 0.35
        ? "Two small drogues steady the capsule. Main parachutes deploy near 3 km in this Apollo-style sequence."
        : "Three large canopies slow the capsule for an ocean landing. The heat shield stays underneath.",
    splashdown:
      "The capsule is floating in the Pacific. All three explorers and their mission records are home.",
  };
  return (
    <div className="voyage-panel" data-phase={r.stage}>
      <span className="voyage-eyebrow">
        RETURN FLIGHT ·{" "}
        {r.stage === "coast"
          ? "UNPOWERED COAST"
          : r.stage === "entry"
            ? "ATMOSPHERIC ENTRY"
            : "CREW OPERATIONS"}
      </span>
      <h2>{titles[r.stage as keyof typeof titles]}</h2>
      <p>{copy[r.stage as keyof typeof copy]}</p>
      <fieldset disabled={disabled}>
        {r.stage === "burning" && (
          <>
            <label className="voyage-aim">
              Departure heading <strong>{Math.round(r.burnAngle ?? 0)}°</strong>
              <input
                type="range"
                min={-90}
                max={90}
                value={r.burnAngle ?? 0}
                aria-label="Departure heading error"
                onChange={(e) =>
                  pilot({
                    type: "return-burn-pilot",
                    angle: Number(e.target.value),
                  })
                }
              />
              <small>
                {Math.abs(r.burnAngle ?? 0) <= 8
                  ? "Heading acquired"
                  : "Center the pointer before continuing"}
              </small>
            </label>
            <progress
              max={100}
              value={p * 100}
              aria-label="Departure burn completion"
            />
            <span className="voyage-readout">
              Burn complete <strong>{Math.round(p * 100)}%</strong>
            </span>
            <button
              className="voyage-primary"
              aria-pressed={!!r.burnFiring}
              onClick={() => {
                if (r.paused) resume();
                pilot({
                  type: "return-burn-pilot",
                  firing: !r.burnFiring,
                  throttle: 1,
                });
              }}
            >
              <Flame size={18} />
              {r.burnFiring ? "Engine cutoff" : "Ignite service engine"}
            </button>
          </>
        )}
        {r.stage === "coast" && (
          <>
            <div className="voyage-stats">
              <div>
                <small>Earth altitude</small>
                <strong>
                  {Math.round(coast.altitudeKm).toLocaleString()}
                  <em>km</em>
                </strong>
              </div>
              <div>
                <small>Earth-relative speed</small>
                <strong>
                  {coast.speedKmS.toFixed(2)}
                  <em>km/s</em>
                </strong>
              </div>
            </div>
            <progress max={1} value={p} aria-label="Journey toward Earth" />
            <span className="voyage-readout">
              Model flight time
              <strong>
                {(coast.elapsedSeconds / 86400).toFixed(1)} /{" "}
                {(RETURN_COAST_SECONDS / 86400).toFixed(1)} days
              </strong>
            </span>
            <button
              className="voyage-primary"
              onClick={() => action("skip-coast")}
            >
              Time warp to Earth approach
              <ArrowRight size={18} />
            </button>
          </>
        )}
        {(entry || chutes || r.stage === "chute-ready") && (
          <>
            <div className="voyage-stats">
              <div>
                <small>Profile altitude</small>
                <strong>
                  {altitude.toFixed(1)}
                  <em>km</em>
                </strong>
              </div>
              <div>
                <small>{entry ? "Entry progress" : "Recovery sequence"}</small>
                <strong>
                  {entry
                    ? `${Math.round(p * 100)}%`
                    : chutes
                      ? p < 0.35
                        ? "Drogues"
                        : "Mains"
                      : "Armed"}
                </strong>
              </div>
            </div>
            <progress
              max={1}
              value={p}
              aria-label="Atmospheric recovery progress"
            />
          </>
        )}
        {r.stage === "docked" && (
          <button className="voyage-primary" onClick={() => action("depart")}>
            <Flame size={18} />
            Begin departure burn
          </button>
        )}
        {r.stage === "entry-ready" && (
          <>
            <div className="voyage-sequence">
              <span className={r.serviceSeparated ? "done" : "current"}>
                <Check size={15} />
                Release service module
              </span>
              <span className={r.serviceSeparated ? "current" : ""}>
                <ShieldCheck size={15} />
                Heat shield into the airflow
              </span>
            </div>
            <button
              className="voyage-primary"
              onClick={() => action(r.serviceSeparated ? "shield" : "separate")}
            >
              {r.serviceSeparated
                ? "Orient shield & begin entry"
                : "Separate service module"}
              <ArrowRight size={18} />
            </button>
          </>
        )}
        {r.stage === "chute-ready" && (
          <button className="voyage-primary" onClick={() => action("chutes")}>
            Deploy recovery parachutes
            <ArrowRight size={18} />
          </button>
        )}
        {r.stage === "splashdown" && (
          <>
            <div className="voyage-recovered">
              <Check size={25} />
              <strong>3 explorers recovered</strong>
            </div>
            <button className="voyage-primary" onClick={finish}>
              Open mission debrief
              <ArrowRight size={18} />
            </button>
          </>
        )}
        {!["splashdown", "docked", "entry-ready", "chute-ready"].includes(
          r.stage,
        ) && (
          <button
            className="voyage-secondary"
            onClick={r.paused ? resume : pause}
          >
            {r.paused ? <Play size={15} /> : <Pause size={15} />}{" "}
            {r.paused ? "Resume flight" : "Pause flight"}
          </button>
        )}
      </fieldset>
      <SourceNotes
        ids={
          ["docked", "burning", "coast"].includes(r.stage)
            ? ["return"]
            : ["entry"]
        }
      />
    </div>
  );
}
