import { Camera, Ruler, Check, ArrowRight } from "lucide-react";
import { ENGINEERING_INSTRUMENTS } from "@exo/data/engineering";
import { MISSION_OBJECTIVES } from "@exo/engine/engineering";
import type { MissionDraft } from "@exo/engine/engineering";
import type { BlueprintState } from "./useBlueprint";
import { SourceLink } from "./SourcesPanel";
import { MissionDiagram } from "./MissionDiagram";
export function GoalPanel({
  state,
  onSource,
  onNext,
}: {
  state: BlueprintState;
  onSource: (id: string) => void;
  onNext: () => void;
}) {
  const { draft, update, result } = state;
  return (
    <section>
      <div className="bp-panel-title">
        <div>
          <h2>Start with a science question.</h2>
          <p>
            Design a 24-hour lunar survey. What must your orbiter return to
            Earth?
          </p>
        </div>
      </div>
      <label className="bp-field bp-name">
        Mission name
        <input
          maxLength={100}
          value={draft.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </label>
      <fieldset className="bp-objectives">
        <legend>Science objective</legend>
        {Object.entries(MISSION_OBJECTIVES).map(([id, o]) => (
          <label
            key={id}
            className={draft.objective === id ? "is-selected" : ""}
          >
            <input
              type="radio"
              name="bp-objective"
              value={id}
              checked={draft.objective === id}
              onChange={() =>
                update("objective", id as MissionDraft["objective"])
              }
            />
            <span>
              <strong>{o.name}</strong>
              <small>{o.description}</small>
            </span>
            {draft.objective === id && <Check size={17} aria-hidden="true" />}
          </label>
        ))}
      </fieldset>
      <MissionDiagram draft={draft} result={result} />
      <div className="bp-goal-rule">
        <strong>What counts as success?</strong>
        <p>
          Choose the required instruments, stay within resource limits, preserve
          a 20% battery reserve, lose no data to overflow, and return at least
          80% of each required instrument’s planned data.
        </p>
        <SourceLink id="assumptions" onSource={onSource}>
          Lab-defined review thresholds
        </SourceLink>
      </div>
      <button className="bp-primary" onClick={onNext}>
        Choose your instruments <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
export function DesignPanel({
  state,
  onSource,
}: {
  state: BlueprintState;
  onSource: (id: string) => void;
}) {
  const { draft, update } = state;
  const field = (
    key:
      | "batteryWh"
      | "solarW"
      | "storageGbit"
      | "transmitterW"
      | "observationMinutes"
      | "contactMinutes"
      | "massLimitKg"
      | "creditLimit",
    label: string,
    unit: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label className="bp-field" key={key}>
      {label}
      <span className="bp-input-unit">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(draft[key]) ? draft[key] : ""}
          onChange={(e) => update(key, e.target.valueAsNumber)}
        />
        <span>{unit}</span>
      </span>
    </label>
  );
  return (
    <section>
      <h2>Build the smallest mission that works.</h2>
      <p>
        Instruments use NASA’s historical LRO allocations. The supporting
        spacecraft is an explicit educational model.
      </p>
      <div className="bp-section-heading">
        <h3>Science payload</h3>
        <SourceLink id="lro-2007" onSource={onSource}>
          NASA · Tables 2 & 7
        </SourceLink>
      </div>
      <div className="bp-instruments">
        {ENGINEERING_INSTRUMENTS.map((p) => (
          <label
            key={p.id}
            className={`bp-instrument ${draft.instrumentIds.includes(p.id) ? "is-selected" : ""}`}
          >
            <input
              type="checkbox"
              checked={draft.instrumentIds.includes(p.id)}
              onChange={(e) =>
                update(
                  "instrumentIds",
                  e.target.checked
                    ? [...draft.instrumentIds, p.id]
                    : draft.instrumentIds.filter((id) => id !== p.id),
                )
              }
            />
            <span className="bp-instrument-icon">
              {p.id === "lroc" ? <Camera size={22} /> : <Ruler size={22} />}
            </span>
            <span>
              <strong>{p.name}</strong>
              <small>{p.description}</small>
              <span className="bp-instrument-spec">
                {p.massKg} kg <b>·</b> {p.powerW} W <b>·</b>{" "}
                {p.referenceGbitPerDay} Gbit/day reference
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="bp-section-heading">
        <h3>Power, storage & radio</h3>
        <SourceLink id="assumptions" onSource={onSource}>
          Lab assumptions
        </SourceLink>
      </div>
      <div className="bp-fields">
        {field("batteryWh", "Battery capacity", "Wh", 1, 10000)}
        {field("solarW", "Sunlit solar output", "W", 0, 5000)}
        {field("storageGbit", "Science storage", "Gbit", 0.01, 1000, 0.01)}
        {field("transmitterW", "Transmitter electrical power", "W", 1, 100)}
      </div>
      <div className="bp-section-heading">
        <h3>Operations & limits</h3>
        <SourceLink id="assumptions" onSource={onSource}>
          Fixed orbit & credit model
        </SourceLink>
      </div>
      <div className="bp-fields">
        {field("observationMinutes", "Observe per 120-min orbit", "min", 1, 75)}
        {field("contactMinutes", "Downlink per orbit", "min", 0, 45)}
        {field("massLimitKg", "Spacecraft mass limit", "kg", 1, 10000)}
        {field("creditLimit", "Resource budget", "credits", 1, 10000)}
      </div>
      <p className="bp-small">
        75 minutes of sunlight per orbit. Instruments retain their published
        orbit-average power allowance throughout the run. The observation
        schedule scales published daily data volumes; it does not model
        individual images or actual LRO commands.
      </p>
    </section>
  );
}
