import type { JourneyState, JourneyEvent } from "./journey";

export function JourneyInstruments({
  journey: j,
  required,
  status,
  disabled,
  dispatch,
}: {
  journey: JourneyState;
  required: number;
  status: string;
  disabled: boolean;
  dispatch(event: JourneyEvent): void;
}) {
  const pct = required ? ((j.dv ?? 0) / required) * 100 : 0;
  return (
    <div className="journey-instruments" aria-label="Burn instruments">
      <label className="journey-instrument">
        <span>
          Alignment <output>{j.angle ?? 0}° · target 0°</output>
        </span>
        <input
          aria-label="Burn alignment"
          type="range"
          min="-90"
          max="90"
          step="1"
          value={j.angle ?? 0}
          disabled={disabled}
          onChange={(e) =>
            dispatch({ type: "journey-pilot", angle: Number(e.target.value) })
          }
        />
      </label>
      <label className="journey-instrument">
        <span>
          Throttle <output>{Math.round((j.throttle ?? 0.5) * 100)}%</output>
        </span>
        <input
          aria-label="Engine throttle"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={j.throttle ?? 0.5}
          disabled={disabled}
          onChange={(e) =>
            dispatch({
              type: "journey-pilot",
              throttle: Number(e.target.value),
            })
          }
        />
      </label>
      <div className="journey-instrument">
        <span>
          Delivered Δv{" "}
          <output>
            {Math.round(j.dv ?? 0)} / {Math.round(required)} m/s
          </output>
        </span>
        <progress
          aria-label="Delivered delta-v"
          max={required}
          value={Math.min(required, j.dv ?? 0)}
        />
        <small>
          {pct.toFixed(1)}% · {j.firing ? "Engine firing" : "Engine off"}
        </small>
      </div>
      <p className="journey-burn-status" role="status">
        {status}
      </p>
    </div>
  );
}
