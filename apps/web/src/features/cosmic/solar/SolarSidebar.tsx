import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  Globe2,
  Satellite,
} from "lucide-react";
import {
  SOLAR_DETAILS,
  FEATURED_SPACECRAFT,
  type CosmicObject,
} from "@exo/data/cosmic";
import {
  AU_KM,
  C_KMS,
  distanceLabel,
  durationLabel,
  solarTravel,
} from "@exo/engine/cosmic";
import { COSMIC_TEXTURES, SOLAR_ASSETS } from "../assetRegistry";
export type SolarTab = "info" | "travel";
interface Props {
  objects: CosmicObject[];
  selected: CosmicObject | undefined;
  category: "spacecraft" | "planets";
  onCategory(category: "spacecraft" | "planets"): void;
  onSelect(id: string): void;
  onHome(): void;
  onCollapse(): void;
  distance: number | null;
  departureDistance: number | null;
  departure: number;
  onDeparture(value: number): void;
  speed: number;
  onSpeed(value: number): void;
  bounds: { min: number; max: number };
}
const dateInput = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dateLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
export function SolarSidebar(p: Props) {
  const detail = p.selected && SOLAR_DETAILS[p.selected.id];
  const travel =
    p.departureDistance === null
      ? null
      : solarTravel(p.departureDistance, p.speed, p.departure);
  return (
    <aside
      key={p.selected?.id ?? p.category}
      data-category={p.category}
      className={`solar-sidebar ${p.selected ? "is-object" : "is-featured"}`}
      aria-label="Explore the Solar System"
    >
      <nav className="solar-category-tabs" aria-label="Explorer categories">
        <button
          aria-pressed={p.category === "planets"}
          onClick={() => p.onCategory("planets")}
        >
          <Globe2 size={16} /> Planets
        </button>
        <button
          aria-pressed={p.category === "spacecraft"}
          onClick={() => p.onCategory("spacecraft")}
        >
          <Satellite size={16} /> Spacecraft
        </button>
        <button
          className="solar-collapse"
          aria-label="Collapse sidebar"
          onClick={p.onCollapse}
        >
          <ChevronLeft size={16} />
        </button>
      </nav>
      {p.selected && detail ? (
        <>
          <div className="solar-object-heading">
            <button
              className="solar-back"
              onClick={p.onHome}
              aria-label="Back to object list"
            >
              <ArrowLeft size={15} />
            </button>
            {p.selected.kind === "spacecraft" && detail.card && (
              <img
                className="solar-spacecraft-photo"
                src={SOLAR_ASSETS.photos[detail.card]}
                alt={`${p.selected.name} spacecraft during ground testing · NASA`}
              />
            )}
            <h2>{p.selected.name}</h2>
            <p>
              <i style={{ background: p.selected.color }} />
              {detail.type}
            </p>
          </div>
          <div className="solar-panel-body">
            <section>
              <h3>Description</h3>
              <p>{detail.description}</p>
              <a
                className="solar-read-more"
                href={detail.source}
                target="_blank"
                rel="noreferrer"
              >
                Read More <ArrowUpRight size={13} />
              </a>
            </section>
            <section className="solar-travel">
              <h3>Travel to {p.selected.name}</h3>

              <label>
                Departure date · UTC
                <input
                  aria-label="Departure date"
                  type="date"
                  value={dateInput(p.departure)}
                  min={dateInput((p.bounds.min - 2440587.5) * 86400000)}
                  max={dateInput((p.bounds.max - 2440587.5) * 86400000)}
                  onChange={(e) => {
                    const value = Date.parse(e.target.value + "T00:00:00Z");
                    if (Number.isFinite(value)) p.onDeparture(value);
                  }}
                />
              </label>
              <button
                className="solar-inline-link"
                onClick={() => p.onDeparture(Date.now())}
              >
                Depart today
              </button>
              <label>
                Travel speed
                <select
                  aria-label="Travel speed"
                  value={p.speed}
                  onChange={(e) => p.onSpeed(Number(e.target.value))}
                >
                  <option value={20}>20 km/s · spacecraft comparison</option>
                  <option value={100}>100 km/s · hypothetical</option>
                  <option value={C_KMS * 0.1}>
                    10% light speed · hypothetical
                  </option>
                  <option value={C_KMS}>Light signal comparison</option>
                </select>
              </label>
              <div className="solar-trip-result">
                <small>AT A CONSTANT SPEED</small>
                <strong>
                  {travel ? durationLabel(travel.seconds) : "Unavailable"}
                </strong>
                <span>Estimated arrival · UTC</span>
                <b>
                  {travel
                    ? dateLabel(travel.arrivalMs)
                    : "Choose a covered departure date"}
                </b>
              </div>
              <dl>
                <div>
                  <dt>Departure separation</dt>
                  <dd>
                    {p.departureDistance === null
                      ? "Outside data coverage"
                      : `${(p.departureDistance / AU_KM).toFixed(3)} AU`}
                  </dd>
                </div>
              </dl>
              <p className="solar-assumption">
                Straight-line separation ÷ constant speed. The target is held at
                its departure position; acceleration, braking and orbital
                transfers are not modelled. This is a comparison, not a launch
                prediction.
              </p>
            </section>
            <section className="solar-facts">
              <h3>At a glance</h3>
              <dl>
                <div>
                  <dt>Distance from Earth</dt>
                  <dd>
                    {p.distance === null
                      ? "Outside data coverage"
                      : distanceLabel(p.distance)}
                  </dd>
                </div>
                <div>
                  <dt>One-way light time</dt>
                  <dd>
                    {p.distance === null
                      ? "Unavailable"
                      : durationLabel(p.distance / C_KMS)}
                  </dd>
                </div>
                {!!p.selected.radiusKm && (
                  <div>
                    <dt>Diameter</dt>
                    <dd>
                      {Math.round(p.selected.radiusKm * 2).toLocaleString()} km
                    </dd>
                  </div>
                )}
              </dl>
            </section>
            <section>
              <h3>Related</h3>
              <div className="solar-related">
                {p.objects
                  .filter(
                    (o) =>
                      o.id !== p.selected!.id &&
                      (p.selected!.kind === "spacecraft"
                        ? o.id === "399" || o.id === "10"
                        : o.kind === "planet" || o.id === "301"),
                  )
                  .slice(0, 8)
                  .map((o) => (
                    <button key={o.id} onClick={() => p.onSelect(o.id)}>
                      <i style={{ background: o.color }} />
                      {o.name}
                    </button>
                  ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <header className="solar-feature-heading">
            <span>
              Featured{" "}
              {p.category === "spacecraft" ? "Spacecraft" : "Planets and Moons"}
            </span>
            <button aria-label="Collapse sidebar" onClick={p.onCollapse}>
              <ChevronLeft size={17} />
              <ChevronLeft size={17} />
            </button>
          </header>
          <div className="solar-feature-list">
            {(p.category === "spacecraft"
              ? FEATURED_SPACECRAFT.map((id) =>
                  p.objects.find((o) => o.id === id),
                ).filter((o): o is CosmicObject => !!o)
              : p.objects.filter((o) => o.kind !== "spacecraft")
            ).map((o) => {
              const meta = SOLAR_DETAILS[o.id],
                image = meta?.card
                  ? SOLAR_ASSETS.cards[meta.card]
                  : COSMIC_TEXTURES[o.id];
              return (
                <button
                  className="solar-feature-card"
                  key={o.id}
                  onClick={() => p.onSelect(o.id)}
                  aria-label={`Visit ${o.name}`}
                  style={
                    { "--card-image": `url("${image}")` } as React.CSSProperties
                  }
                >
                  <h2>
                    {o.id === "-170" ? "James Webb Space Telescope" : o.name}
                  </h2>
                  <p>{meta?.caption ?? meta?.type}</p>
                  <span className="solar-card-arrow">↗</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
