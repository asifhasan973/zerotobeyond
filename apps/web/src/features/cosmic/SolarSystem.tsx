import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Calculator,
  ExternalLink,
  Maximize,
  Orbit,
  RotateCcw,
  Ruler,
  X,
} from "lucide-react";
import { useLoadingStore } from "@exo/ui";
import { COSMIC_SOLAR_URL } from "@exo/data/cosmic";
import type { CosmicData } from "@exo/data/cosmic";
import {
  C_KMS,
  distanceLabel,
  durationLabel,
  positionAt,
  separation,
} from "@exo/engine/cosmic";
import { SizeComparison } from "./SizeComparison";
import "./solar-system.css";
const EYES = "https://eyes.nasa.gov/apps/solar-system/";
const TARGETS = [
  ["10", "Sun", "sun"],
  ["199", "Mercury", "mercury"],
  ["299", "Venus", "venus"],
  ["399", "Earth", "earth"],
  ["301", "Moon", "moon"],
  ["499", "Mars", "mars"],
  ["599", "Jupiter", "jupiter"],
  ["699", "Saturn", "saturn"],
  ["799", "Uranus", "uranus"],
  ["899", "Neptune", "neptune"],
  ["-170", "James Webb", "sc_jwst"],
  ["-31", "Voyager 1", "sc_voyager_1"],
] as const;
export default function SolarSystem() {
  const [initialJulianDate] = useState(() => Date.now() / 86400000 + 2440587.5);
  const [source, setSource] = useState(EYES + "#/home"),
    [revision, setRevision] = useState(0),
    [loaded, setLoaded] = useState(false),
    [tool, setTool] = useState<"travel" | "compare" | null>(null);
  const [data, setData] = useState<CosmicData | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0),
    [targetId, setTargetId] = useState("499"),
    [speed, setSpeed] = useState(20);
  useEffect(() => {
    if (!tool || data) return;
    let active = true;
    const task = fetch(COSMIC_SOLAR_URL)
      .then(async (r) => {
        if (!r.ok) throw Error("Catalogue unavailable");
        const d: CosmicData = await r.json();
        if (!d.objects?.length) throw Error("Invalid catalogue");
        if (active)
          setData({ ...d, objects: d.objects.filter((o) => o.samples) });
      })
      .catch(() => {
        if (active) setError(true);
      });
    useLoadingStore.getState().registerLoaderTask(task);
    return () => {
      active = false;
    };
  }, [tool, data, attempt]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTool(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const target = data?.objects.find((o) => o.id === targetId),
    earth = data?.objects.find((o) => o.id === "399");
  const bounds = earth?.samples,
    jd = bounds
      ? Math.max(bounds[0].jd, Math.min(bounds.at(-1)!.jd, initialJulianDate))
      : 0;
  const a = earth && positionAt(earth, jd),
    b = target && positionAt(target, jd),
    distance = a && b ? separation(a, b) : null;
  function destination() {
    const item = TARGETS.find((t) => t[0] === targetId);
    if (item) {
      setLoaded(false);
      setSource(EYES + "#/" + item[2]);
      setRevision((v) => v + 1);
      setTool(null);
    }
  }
  return (
    <main className="solar-eyes" aria-label="Solar System explorer">
      <iframe
        key={revision}
        className="solar-eyes-frame"
        title="NASA Eyes on the Solar System — official interactive viewer"
        src={source}
        allow="accelerometer; fullscreen"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="solar-connection" role="status">
          <Orbit size={17} /> Connecting to NASA Eyes…{" "}
          <a href={EYES + "#/home"} target="_blank" rel="noreferrer">
            Open viewer <ExternalLink size={12} />
          </a>
        </div>
      )}
      <nav
        className="solar-tools"
        aria-label="Zero To Beyond exploration tools"
      >
        <a className="solar-home" href="/" aria-label="Back to Zero To Beyond">
          <ArrowLeft size={15} />
          <span>Zero To Beyond</span>
        </a>
        <span className="solar-tools-divider" />
        <button
          aria-expanded={tool === "travel"}
          onClick={() => setTool(tool === "travel" ? null : "travel")}
        >
          <Calculator size={15} />
          <span>Travel time</span>
        </button>
        <button
          aria-expanded={tool === "compare"}
          onClick={() => setTool(tool === "compare" ? null : "compare")}
        >
          <Ruler size={15} />
          <span>Compare sizes</span>
        </button>
        <a href="/?explore=engineering">
          <ArrowUpRight size={15} />
          <span>Plan a mission</span>
        </a>
        <button
          aria-label="Fullscreen explorer"
          onClick={() => {
            const result = document.fullscreenElement
              ? document.exitFullscreen()
              : document.querySelector(".solar-eyes")?.requestFullscreen();
            result?.catch(() => {});
          }}
        >
          <Maximize size={15} />
        </button>
      </nav>
      {tool && (
        <aside className="solar-tool-panel" aria-label="Our exploration tools">
          <header>
            <div>
              <small>ZERO TO BEYOND TOOLS</small>
              <h2>
                {tool === "travel"
                  ? "How long would it take?"
                  : "Compare actual sizes"}
              </h2>
            </div>
            <button aria-label="Close tools" onClick={() => setTool(null)}>
              <X size={18} />
            </button>
          </header>
          <p className="solar-calculator-note">
            Our calculator uses its own target and dated snapshot, separately
            from the NASA viewer.
          </p>
          {!data ? (
            error ? (
              <div role="alert">
                <p>
                  Our catalogue could not load. NASA’s viewer remains available.
                </p>
                <button
                  onClick={() => {
                    setError(false);
                    setAttempt((v) => v + 1);
                  }}
                >
                  Retry tools
                </button>
              </div>
            ) : (
              <p role="status">Loading our measurement tools…</p>
            )
          ) : tool === "compare" ? (
            <SizeComparison objects={data.objects} />
          ) : (
            <>
              <label>
                Calculator target
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  {TARGETS.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="solar-view-target" onClick={destination}>
                View this target in NASA Eyes <ArrowUpRight size={14} />
              </button>
              <div className="solar-measurements">
                <div>
                  <small>Distance from Earth</small>
                  <strong>
                    {distance === null
                      ? "Unavailable"
                      : distanceLabel(distance)}
                  </strong>
                </div>
                <div>
                  <small>Light delay · one way</small>
                  <strong>
                    {distance === null
                      ? "Unavailable"
                      : durationLabel(distance / C_KMS)}
                  </strong>
                </div>
              </div>
              <label>
                Hypothetical speed
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={20}>20 km/s</option>
                  <option value={100}>100 km/s</option>
                  <option value={C_KMS * 0.1}>10% light speed</option>
                  <option value={C_KMS}>Light speed comparison</option>
                </select>
              </label>
              <div className="solar-travel-result">
                <small>Constant-speed estimate</small>
                <strong>
                  {distance === null
                    ? "Unavailable"
                    : durationLabel(distance / speed)}
                </strong>
              </div>
              <details>
                <summary>Data date & assumptions</summary>
                <p>
                  Local JPL Horizons snapshot at{" "}
                  {new Date((jd - 2440587.5) * 86400000)
                    .toISOString()
                    .slice(0, 16)}{" "}
                  TDB. This calculator uses its own target and date; it does not
                  follow selections or time changes inside NASA Eyes.
                </p>
                <p>
                  Static separation ÷ speed, with no acceleration, braking, fuel
                  or moving-target trajectory. Not a rocket flight prediction.
                </p>
              </details>
            </>
          )}
        </aside>
      )}
      <div className="solar-viewer-links">
        <span>3D viewer: NASA/JPL</span>
        <a href="/?explore=cosmic&mode=catalogue">
          Our catalogue atlas <ArrowUpRight size={11} />
        </a>
        <button
          onClick={() => {
            setLoaded(false);
            setSource(EYES + "#/home");
            setRevision((v) => v + 1);
          }}
          aria-label="Reload NASA viewer"
        >
          <RotateCcw size={12} />
        </button>
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          aria-label="Open NASA viewer in a new tab"
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </main>
  );
}
