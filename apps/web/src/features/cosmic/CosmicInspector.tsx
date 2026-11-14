import { Link } from "react-router";
import { useState } from "react";
import type { CosmicData, CosmicObject } from "@exo/data/cosmic";
import {
  C_KMS,
  compactNumber,
  distanceLabel,
  durationLabel,
  positionAt,
  separation,
} from "@exo/engine/cosmic";
import { SizeComparison } from "./SizeComparison";
interface Props {
  data: CosmicData;
  selected: CosmicObject;
  jd: number;
  distance: number | null;
  hidden: boolean;
  physical: boolean;
  saved: boolean;
  tracking: boolean;
  onTrack(): void;
  onFocus(fit: boolean): void;
  onBookmark(): void;
  onShare(): void;
  notice: string;
}
export function CosmicInspector(p: Props) {
  const [tab, setTab] = useState("journey"),
    [speed, setSpeed] = useState(20),
    [compare, setCompare] = useState("301");
  const cosmic = p.selected.kind === "galaxy" || p.selected.kind === "quasar";
  const target = positionAt(p.selected, p.jd),
    other = p.data.objects.find((o) => o.id === compare),
    otherPoint = other && positionAt(other, p.jd);
  return (
    <section className="cosmic-inspector">
      <div className="cosmic-inspector-title">
        <span className="cosmic-eyebrow">YOUR EXPLORATION DESK</span>
        <h2>{p.selected.name}</h2>
        <span className="cosmic-tag">
          {p.selected.kind} ·{" "}
          {p.selected.samples ? "JPL ephemeris" : "catalogue observation"}
        </span>
      </div>
      <div className="cosmic-focus-actions">
        <button onClick={() => p.onFocus(true)}>Fly to object ↗</button>
        <button onClick={() => p.onFocus(false)}>Centre</button>
        {p.selected.samples && (
          <button aria-pressed={p.tracking} onClick={p.onTrack}>
            {p.tracking ? "Stop tracking" : "Track"}
          </button>
        )}
      </div>
      {p.hidden && <p className="cosmic-warning">Hidden by category filter.</p>}
      <div className="cosmic-telemetry">
        <div>
          <small>{cosmic ? "Comoving distance" : "From Earth"}</small>
          <strong>
            {p.distance === null ? "Unavailable" : distanceLabel(p.distance)}
          </strong>
        </div>
        <div>
          <small>{cosmic ? "Lookback time" : "Light delay · one way"}</small>
          <strong>
            {cosmic
              ? `${p.selected.lookbackGyr?.toFixed(2)}B years`
              : p.distance === null
                ? "Unavailable"
                : durationLabel(p.distance / C_KMS)}
          </strong>
        </div>
      </div>
      <div
        className="cosmic-feature-tabs"
        role="tablist"
        aria-label="Exploration tools"
      >
        {[
          ["journey", "Travel time"],
          ["compare", "Compare sizes"],
          ["details", "Science"],
        ].map(([id, label]) => (
          <button
            role="tab"
            id={`cosmic-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="cosmic-tool-panel"
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="cosmic-tool-panel"
        role="tabpanel"
        aria-labelledby={`cosmic-tab-${tab}`}
        className="cosmic-feature-content"
      >
        {tab === "journey" &&
          (cosmic ? (
            <>
              <h3>Looking into the past</h3>
              <p>
                Redshift z = {p.selected.redshift?.toFixed(4)}. Cosmological
                expansion makes distance ÷ speed unsuitable for a galaxy
                journey. Compare its comoving distance and lookback time above.
              </p>
            </>
          ) : (
            <>
              <h3>Your journey, your speed</h3>
              <label>
                Travel speed
                <select
                  aria-label="Travel speed"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={20}>Spacecraft · 20 km/s</option>
                  <option value={100}>Fast probe · 100 km/s</option>
                  <option value={C_KMS * 0.1}>
                    Hypothetical · 10% light speed
                  </option>
                  <option value={C_KMS}>Light speed comparison</option>
                  {![20, 100, C_KMS * 0.1, C_KMS].includes(speed) && (
                    <option value={speed}>
                      Custom · {compactNumber(speed)} km/s
                    </option>
                  )}
                </select>
              </label>
              <div className="cosmic-arrival">
                <small>Constant-speed travel estimate</small>
                <strong>
                  {p.distance === null
                    ? "Unavailable"
                    : durationLabel(p.distance / speed)}
                </strong>
              </div>
              <details>
                <summary>Custom speed & assumptions</summary>
                <label>
                  Custom speed (km/s)
                  <input
                    type="number"
                    value={speed}
                    min={0.001}
                    max={C_KMS}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (n > 0 && n <= C_KMS) setSpeed(n);
                    }}
                  />
                </label>
                <p>
                  Static separation ÷ speed. No acceleration, braking, target
                  motion or fuel. This is not a rocket flight prediction.
                </p>
              </details>
            </>
          ))}
        {tab === "compare" && (
          <>
            <SizeComparison objects={p.data.objects} />
            <label>
              Distance to another object
              <select
                value={compare}
                onChange={(e) => setCompare(e.target.value)}
              >
                {p.data.objects
                  .filter((o) => o.samples)
                  .map((o) => (
                    <option value={o.id} key={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
            <p>
              {target && otherPoint && !cosmic
                ? distanceLabel(separation(target, otherPoint))
                : "Select a Solar System object for a local comparison."}
            </p>
          </>
        )}
        {tab === "details" && (
          <>
            <h3>What the data tells us</h3>
            <p>{p.selected.epoch}</p>
            <p>{p.selected.method}</p>
            <p>
              {p.selected.radiusKm
                ? `Radius: ${p.selected.radiusKm.toLocaleString()} km. ${p.physical ? "Physical radii enabled." : "Readable markers enlarge small bodies."}`
                : p.selected.magnitude !== undefined
                  ? `Apparent magnitude ${p.selected.magnitude}. Physical radius unavailable.`
                  : "Locator glyph; actual shape and size unavailable."}
            </p>
            <a href={p.selected.source} target="_blank" rel="noreferrer">
              Scientific source ↗
            </a>
            <p>
              Planet surface maps and orientations are illustrative. Sunlight is
              modelled; this is not a live camera.
            </p>
          </>
        )}
      </div>
      <div className="cosmic-desk-actions">
        <Link to="/?explore=engineering">Plan a mission ↗</Link>
        <button onClick={p.onBookmark}>{p.saved ? "★ Saved" : "☆ Save"}</button>
        <button onClick={p.onShare}>Share ↗</button>
      </div>
      <p role="status" className="cosmic-notice">
        {p.notice}
      </p>
    </section>
  );
}
