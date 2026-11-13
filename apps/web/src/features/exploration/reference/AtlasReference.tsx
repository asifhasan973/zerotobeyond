import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLoadingStore, isEngineFrozen } from "@exo/ui";
import { atlasPoint } from "@exo/engine";
import type { AtlasData } from "@exo/engine";
import { loadAtlasReference, atlasAsset, ATLAS_SOURCES } from "./atlasResource";

const REGIONS = [
  { id: "shackleton", name: "Shackleton region" },
  { id: "cabeus", name: "Cabeus region" },
  { id: "malapert", name: "Malapert region" },
];
type Layer = "elevation" | "temperature" | "slope";
const LAYERS: { id: Layer; name: string; legend: string }[] = [
  {
    id: "elevation",
    name: "Terrain",
    legend: "Elevation: −7,000 to +3,000 m. Colors stop at these limits.",
  },
  {
    id: "temperature",
    name: "Temperature",
    legend: "Historical summer maximum: 40–340 K. Dark cells have no data.",
  },
  {
    id: "slope",
    name: "Slope",
    legend: "Coarse slope: 0–25°. This is not a travel safety check.",
  },
];
const value = (n: number | null | undefined, unit: string) =>
  n == null || !Number.isFinite(n) ? "Unavailable" : `${n.toFixed(1)} ${unit}`;

export function AtlasReference({
  context,
  objective = "lunar-ice",
  reportMode = false,
  children,
}: {
  context: string;
  objective?: "lunar-ice" | "lunar-geology";
  reportMode?: boolean;
  children?: ReactNode;
}) {
  const [data, setData] = useState<AtlasData>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [region, setRegion] = useState("shackleton");
  const [layer, setLayer] = useState<Layer>("elevation");
  const [zoom, setZoom] = useState(1);
  const [celsius, setCelsius] = useState(false);
  useEffect(() => {
    let active = true;
    const task = loadAtlasReference();
    useLoadingStore.getState().registerLoaderTask(task);
    task.then(
      (loaded) => {
        if (active) setData(loaded);
      },
      (reason) => {
        if (active) setError(String(reason));
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  const choose = (action: () => void) => {
    if (!isEngineFrozen()) action();
  };
  const sources = (
    <nav
      className="report-reference-sources"
      aria-label="NASA reference sources"
    >
      <a href={ATLAS_SOURCES.terrain} target="_blank" rel="noreferrer">
        NASA LOLA terrain
      </a>
      <a href={ATLAS_SOURCES.temperature} target="_blank" rel="noreferrer">
        Diviner temperature and credits
      </a>
    </nav>
  );
  if (!data)
    return (
      <section
        className={`report-atlas ${reportMode ? "is-report-atlas" : ""}`}
      >
        <div className="report-atlas-layout">
          <div className="report-map-loading">
            <h3>NASA reference location</h3>
            <p>{context}</p>
            {error ? (
              <div role="alert">
                <p>The reference map could not load.</p>
                <button
                  onClick={() =>
                    choose(() => {
                      setError("");
                      setAttempt((n) => n + 1);
                    })
                  }
                >
                  Retry reference map
                </button>
              </div>
            ) : (
              <p role="status">Preparing the reference map…</p>
            )}
            {sources}
          </div>
          {children}
        </div>
      </section>
    );
  const preset = data.presets[region];
  if (!preset)
    return (
      <section className="report-atlas">
        <h3>NASA reference location unavailable</h3>
        <p>
          This reference coordinate is missing. Your mission results are still
          available.
        </p>
        {sources}
        {children}
      </section>
    );
  const n = data.metadata.size;
  const point = atlasPoint(preset.lat, preset.lon, data.metadata.extentM, n);
  const width = n / zoom;
  const view = [
    Math.max(0, Math.min(n - width, point.x - width / 2)),
    Math.max(0, Math.min(n - width, point.y - width / 2)),
    width,
    width,
  ].join(" ");
  const temperature =
    preset.temperature == null
      ? null
      : celsius
        ? preset.temperature - 273.15
        : preset.temperature;
  const selectedValue =
    layer === "elevation"
      ? value(preset.elevation, "m")
      : layer === "slope"
        ? value(preset.slope, "°")
        : value(temperature, celsius ? "°C" : "K");
  const regionName =
    REGIONS.find((item) => item.id === region)?.name ?? "Reference region";
  const numericValues = (
    <dl className="report-reference-values">
      <div>
        <dt>Reference coordinate</dt>
        <dd>
          {Math.abs(preset.lat).toFixed(2)}° S, {preset.lon.toFixed(2)}° E
        </dd>
      </div>
      <div>
        <dt>Elevation above the lunar reference sphere</dt>
        <dd>{value(preset.elevation, "m")}</dd>
      </div>
      <div>
        <dt>Historical summer maximum</dt>
        <dd>{value(temperature, celsius ? "°C" : "K")}</dd>
      </div>
      <div>
        <dt>Calculated coarse slope</dt>
        <dd>{value(preset.slope, "°")}</dd>
      </div>
    </dl>
  );
  return (
    <section className={`report-atlas ${reportMode ? "is-report-atlas" : ""}`}>
      {!reportMode && (
        <>
          <h3>NASA reference location</h3>
          <p>{context}</p>
        </>
      )}
      <div className="report-atlas-layout">
        <div className="report-map-panel">
          <div className="report-map-heading">
            {reportMode && <h3>NASA reference location</h3>}
            {reportMode ? (
              <span className="report-current-region">{regionName}</span>
            ) : (
              <label>
                <span>Reference region</span>
                <select
                  value={region}
                  onChange={(event) =>
                    choose(() => {
                      setRegion(event.target.value);
                      setZoom(1);
                    })
                  }
                >
                  {REGIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div
            className="report-layer-buttons"
            role="group"
            aria-label="Reference map layer"
          >
            {LAYERS.map((item) => (
              <button
                key={item.id}
                aria-pressed={layer === item.id}
                onClick={() => choose(() => setLayer(item.id))}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="report-map-frame">
            <svg
              className="report-reference-map"
              viewBox={view}
              role="img"
              aria-label={`${regionName}, ${LAYERS.find((item) => item.id === layer)?.name}. NASA reference coordinate, not your landing point.`}
            >
              <image href={atlasAsset(`${layer}.webp`)} width={n} height={n} />
              <circle
                cx={point.x}
                cy={point.y}
                r={6 / zoom}
                fill="#ffdf89"
                stroke="#20122f"
                strokeWidth={2 / zoom}
              />
            </svg>
            <div
              className="report-map-controls"
              role="group"
              aria-label="Map zoom"
            >
              <button
                disabled={zoom === 1}
                onClick={() =>
                  choose(() => setZoom((current) => Math.max(1, current / 2)))
                }
              >
                Zoom out
              </button>
              <button
                disabled={zoom === 4}
                onClick={() =>
                  choose(() => setZoom((current) => Math.min(4, current * 2)))
                }
              >
                Zoom in
              </button>
            </div>
          </div>
          <div className="report-map-caption">
            <strong>
              {selectedValue}
              <span> at reference marker</span>
            </strong>
            <p>{LAYERS.find((item) => item.id === layer)?.legend}</p>
            <p>
              Amber marker: NASA reference coordinate. Longitude 0° is at the
              top.
            </p>
          </div>
          {reportMode && (
            <p className="report-location-context">
              {context}{" "}
              {layer === "temperature"
                ? "Cold ground alone does not prove ice."
                : layer === "slope"
                  ? "Coarse slope cannot check landing or driving safety."
                  : "The map does not check your game findings."}
            </p>
          )}
        </div>
        <div className="report-location-evidence">
          {reportMode ? (
            <section className="report-place-interest">
              <h3>What makes this place interesting?</h3>
              <p>
                {objective === "lunar-geology"
                  ? preset.slope == null
                    ? "Coarse slope data is unavailable at this reference point."
                    : `This reference point has a coarse slope of ${value(preset.slope, "°")}; terrain helps us compare landforms.`
                  : preset.temperature == null
                    ? "Historical temperature is unavailable at this reference point."
                    : `This reference point had a summer maximum of ${value(preset.temperature, "K")} in the historical data.`}
              </p>
            </section>
          ) : (
            <>
              {numericValues}
              <button
                aria-pressed={celsius}
                onClick={() => choose(() => setCelsius((current) => !current))}
              >
                Show temperature in {celsius ? "Kelvin" : "Celsius"}
              </button>
              <p>
                Cold ground alone does not prove ice. Coarse slope is not a
                safety check. These maps do not show radio coverage.
              </p>
            </>
          )}
          {children}
        </div>
      </div>
      <details className="report-atlas-details">
        <summary>Map sources, values and limits</summary>
        {reportMode && (
          <>
            <label>
              <span>Reference region</span>
              <select
                value={region}
                onChange={(event) =>
                  choose(() => {
                    setRegion(event.target.value);
                    setZoom(1);
                  })
                }
              >
                {REGIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {numericValues}
            <button
              aria-pressed={celsius}
              onClick={() => choose(() => setCelsius((current) => !current))}
            >
              Show temperature in {celsius ? "Kelvin" : "Celsius"}
            </button>
          </>
        )}
        <p>
          Terrain: {data.metadata.terrainProduct}; {data.metadata.terrainPeriod}
          ; {data.metadata.terrainResolution}. Elevation uses a 1,737.4 km
          reference sphere.
        </p>
        <p>
          Slope is calculated across about{" "}
          {Math.round(data.metadata.slopeBaselineM).toLocaleString()} m. It
          cannot certify landing or rover safety.
        </p>
        <p>
          Temperature: {data.metadata.thermalProduct};{" "}
          {data.metadata.thermalPeriod}; about 240 m per source pixel. This is a
          historical summer statistic, not today’s weather.
        </p>
        <p>
          Missing values stay unavailable. Numeric values come from source
          grids; map colors use an overview. Cold alone does not prove ice.
          These layers do not show radio coverage.
        </p>
        {sources}
        <a href={atlasAsset("atlas.json")} target="_blank" rel="noreferrer">
          Numeric grid and full source details
        </a>
      </details>
    </section>
  );
}
