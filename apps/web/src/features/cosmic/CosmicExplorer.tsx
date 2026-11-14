import { useEffect, useMemo, useRef, useState } from "react";
import { useLoadingStore, useOrientationLifecycleStore } from "@exo/ui";
import { COSMIC_CATALOGUE_URL } from "@exo/data/cosmic";
import type { CosmicData } from "@exo/data/cosmic";
import {
  matchesCosmicFilter,
  distanceLabel,
  positionAt,
  separation,
} from "@exo/engine/cosmic";
import { CosmicInspector } from "./CosmicInspector";
import { TutorButton } from "@/shared/tutor/SpaceTutor";
import { CosmicViewport } from "./CosmicViewport";
import "./cosmic.css";
const TOUR = [
  {
    id: "399",
    zoom: 4.6,
    title: "Our home",
    text: "Begin with Earth. All objects in this explorer come from observations or published ephemerides.",
  },
  {
    id: "301",
    zoom: 6,
    title: "Our nearest neighbour",
    text: "The Moon is close on cosmic scales. Compare its distance with a spacecraft.",
  },
  {
    id: "-170",
    zoom: 7,
    title: "A telescope, not a distant galaxy",
    text: "Webb observes distant galaxies while travelling around the Sun–Earth L2 region.",
  },
  {
    id: "10",
    zoom: 10,
    title: "The Solar System",
    text: "Planet positions come from JPL Horizons. Symbols are enlarged so you can find them.",
  },
  {
    id: "-31",
    zoom: 11,
    title: "Humanity reaches outward",
    text: "Voyager remains extremely close to home when compared with even the nearest stars.",
  },
  {
    id: "10",
    zoom: 16,
    title: "Our stellar neighbourhood",
    text: "All-sky measured bright and nearby stars from HYG. Glyph size represents apparent brightness, not stellar radius. Catalogue gaps are not empty space.",
  },
  {
    id: "10",
    zoom: 19,
    title: "Our incomplete stellar census",
    text: "This quality-filtered sample is incomplete. It does not trace every spiral arm or every star.",
  },
  {
    id: "10",
    zoom: 23,
    title: "Galaxy surveys",
    text: "Galaxies and quasars are real spectroscopic detections. Their comoving distances use Planck18 cosmology. Survey boundaries are not the edge of the universe.",
  },
];
function readBookmarks(): string[] {
  try {
    const v: unknown = JSON.parse(
      localStorage.getItem("ztb_cosmic_bookmarks_v1") ?? "[]",
    );
    return Array.isArray(v)
      ? v.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}
export default function CosmicExplorer() {
  const [data, setData] = useState<CosmicData | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const task = fetch(COSMIC_CATALOGUE_URL)
      .then(async (r) => {
        if (!r.ok) throw Error("Catalogue unavailable");
        const d: CosmicData = await r.json();
        if (d.chunks?.length) {
          const parts = await Promise.all(
            d.chunks.map(async (url) => {
              const response = await fetch(url);
              if (!response.ok) throw Error("Catalogue part unavailable");
              return (await response.json()) as CosmicData["objects"];
            }),
          );
          d.objects = parts.flat();
        }
        if (
          d.version !== 1 ||
          !d.objects?.length ||
          d.objects.some(
            (o) =>
              o.position.length !== 3 ||
              o.position.some((v) => !Number.isFinite(v)),
          )
        )
          throw Error("Invalid catalogue");
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    useLoadingStore.getState().registerLoaderTask(task);
    return () => {
      active = false;
    };
  }, [attempt]);
  if (error)
    return (
      <main className="cosmic-error">
        <h1>Cosmic Explorer</h1>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            setError("");
            setAttempt((v) => v + 1);
          }}
        >
          Retry catalogue
        </button>
      </main>
    );
  return data ? (
    <Workspace data={data} />
  ) : (
    <p role="status">Preparing measured universe…</p>
  );
}
function Workspace({ data }: { data: CosmicData }) {
  const query = new URLSearchParams(location.search),
    [selectedId, setSelected] = useState(query.get("target") ?? "10"),
    [exponent, setExponent] = useState(() => {
      const z = Number(query.get("zoom"));
      return query.has("zoom") && Number.isFinite(z)
        ? Math.max(3, Math.min(24, z))
        : 9.9;
    }),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [bookmarks, setBookmarks] = useState(readBookmarks),
    [tour, setTour] = useState<number | null>(null),
    [playing, setPlaying] = useState(false),
    [clockPlaying, setClockPlaying] = useState(false),
    [notice, setNotice] = useState(""),
    [sources, setSources] = useState(false),
    [navigation, setNavigation] = useState("pan"),
    [physical, setPhysical] = useState(false),
    [grid, setGrid] = useState(false),
    [focusId, setFocusId] = useState(query.get("target") ?? "10"),
    [focusVersion, setFocusVersion] = useState(0),
    [page, setPage] = useState(0),
    [browserOpen, setBrowserOpen] = useState(false),
    [follow, setFollow] = useState(false),
    [orbits, setOrbits] = useState(true),
    [light, setLight] = useState(true);
  const frozen = useOrientationLifecycleStore((s) => s.isFrozen);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSources(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const index = useMemo(
    () => new Map(data.objects.map((o) => [o.id, o])),
    [data],
  );
  const selected = index.get(selectedId) ?? index.get("399")!;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [selected.id]);
  const bounds = index.get("399")!.samples!,
    min = bounds[0].jd,
    max = bounds[bounds.length - 1].jd;
  const [jd, setJd] = useState(() => {
    const initial =
      Number(query.get("jd")) || Date.now() / 86400000 + 2440587.5;
    return Math.max(min, Math.min(max, initial));
  });
  useEffect(() => {
    if (!clockPlaying || frozen) return;
    const timer = setInterval(() => {
      if (!document.hidden) setJd((value) => Math.min(max, value + 1 / 24));
    }, 500);
    return () => clearInterval(timer);
  }, [clockPlaying, frozen, max]);
  const filtered = useMemo(
    () => data.objects.filter((o) => matchesCosmicFilter(o, filter, bookmarks)),
    [data, filter, bookmarks],
  );
  const results = useMemo(
    () =>
      filtered.filter(
        (o) => !search || o.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [filtered, search],
  );
  const visible = results.slice(page * 24, (page + 1) * 24);
  function choose(id: string) {
    setFollow(false);
    setSelected(id);
    setBrowserOpen(false);
  }
  function focus(id: string, fit = false) {
    setSelected(id);
    setFocusId(id);
    setFocusVersion((v) => v + 1);
    const o = index.get(id);
    if (fit && o)
      setExponent(
        o.samples
          ? o.kind === "spacecraft"
            ? 7
            : Math.max(
                3,
                Math.log10((o.radiusKm ?? 6000) * (o.id === "699" ? 4.2 : 1.8)),
              )
          : Math.min(24, Math.log10(Math.hypot(...o.position)) + 0.5),
      );
  }
  function step(n: number) {
    const i = Math.max(0, Math.min(TOUR.length - 1, n));
    setFollow(false);
    setTour(i);
    setSelected(TOUR[i].id);
    setFocusId(TOUR[i].id);
    setFocusVersion((v) => v + 1);
    setFilter("all");
    setSearch("");
    setPage(0);
    setExponent(TOUR[i].zoom);
  }
  useEffect(() => {
    if (!playing || frozen) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      if (tour === null) step(0);
      else if (tour < TOUR.length - 1) step(tour + 1);
      else setPlaying(false);
    }, 8000);
    return () => clearInterval(id);
  }, [playing, tour, frozen]);
  const earth = positionAt(index.get("399")!, jd),
    point = positionAt(selected, jd);
  const distance = earth && point ? separation(earth, point) : null;
  function bookmark() {
    const next = bookmarks.includes(selected.id)
      ? bookmarks.filter((id) => id !== selected.id)
      : [...bookmarks, selected.id];
    setBookmarks(next);
    try {
      localStorage.setItem("ztb_cosmic_bookmarks_v1", JSON.stringify(next));
    } catch {
      setNotice("Bookmark kept for this session; browser storage unavailable.");
    }
  }
  async function share() {
    const url = new URL(location.href);
    url.search = new URLSearchParams({
      explore: "cosmic",
      target: selected.id,
      jd: String(jd),
      zoom: String(exponent),
    }).toString();
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Object link copied.");
    } catch {
      setNotice(url.href);
    }
  }
  return (
    <main className="cosmic" aria-label="Cosmic Explorer">
      <header className="cosmic-heading">
        <div>
          <span className="cosmic-eyebrow">
            ZERO TO BEYOND / OBSERVATION ATLAS
          </span>
          <h1>
            Cosmic Explorer<span>Our place in everything.</span>
          </h1>
        </div>
        <div className="cosmic-actions">
          <button
            onClick={() => {
              step(0);
              setPlaying(true);
            }}
          >
            ↗ Guided tour
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setTour(null);
              focus("399", true);
            }}
          >
            ⌂ Earth
          </button>
          <button onClick={() => setSources(!sources)}>Data & sources</button>
          <button
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else document.querySelector("main.cosmic")?.requestFullscreen();
            }}
          >
            ⛶ Fullscreen
          </button>
        </div>
      </header>
      <div className="cosmic-workspace">
        <section className="cosmic-stage" aria-label="Universe viewport">
          <CosmicViewport
            objects={filtered}
            selected={selected}
            exponent={exponent}
            jd={jd}
            focusId={focusId}
            focusVersion={focusVersion}
            navigation={navigation}
            physical={physical}
            grid={grid}
            orbits={orbits}
            light={light}
            follow={follow}
            onSelect={(id) => {
              setPlaying(false);
              choose(id);
            }}
            onZoom={(d) => setExponent((v) => Math.max(3, Math.min(24, v + d)))}
          />
          <nav className="cosmic-destinations" aria-label="Quick destinations">
            {[
              ["10", "Solar System", 9.9],
              ["399", "Earth", 4.1],
              ["-170", "Webb", 7],
              ["-31", "Voyager 1", 11.2],
              ["10", "Stars", 16],
              ["10", "Galaxies", 23],
            ].map(([id, label, z]) => (
              <button
                key={label}
                onClick={() => {
                  setFollow(false);
                  setTour(null);
                  setPlaying(false);
                  setFilter("all");
                  setSearch("");
                  setBrowserOpen(false);
                  setSelected(String(id));
                  setFocusId(String(id));
                  setFocusVersion((v) => v + 1);
                  setExponent(Number(z));
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="cosmic-stage-label">
            <span>
              {tour !== null && tour >= 5
                ? "GUIDED SURVEY LAYER"
                : "SELECTED OBJECT · CLICK FOCUS TO CENTRE"}
            </span>
            <strong>
              {tour !== null && tour >= 5 ? TOUR[tour].title : selected.name}
            </strong>
            <small>
              {exponent < 12
                ? "SOLAR SYSTEM"
                : exponent < 20
                  ? "STELLAR CATALOGUE"
                  : "EXTRAGALACTIC SURVEY"}
            </small>
          </div>
          {(filter === "galaxy" || filter === "quasar") && exponent < 20 && (
            <div className="cosmic-scale-hint">
              These objects lie beyond the current view scale.
              <button
                onClick={() => {
                  setExponent(23);
                  setFocusId("10");
                  setFocusVersion((v) => v + 1);
                  setBrowserOpen(false);
                }}
              >
                Show distant survey
              </button>
            </div>
          )}
          <div className="cosmic-scale">
            <label>
              View scale · {distanceLabel(10 ** exponent)}
              <input
                aria-label="Cosmic zoom scale"
                type="range"
                min="3"
                max="24"
                step="0.05"
                value={exponent}
                onChange={(e) => {
                  setPlaying(false);
                  setExponent(Number(e.target.value));
                }}
              />
            </label>
            <div>
              <span>Planet</span>
              <span>Stars</span>
              <span>Galaxies</span>
            </div>
            <small>
              Drag in the selected mode · scroll / pinch toward cursor to zoom ·
              right-drag pans
            </small>
          </div>
        </section>
        <aside ref={panel} className="cosmic-panel">
          {tour !== null && (
            <aside className="cosmic-tour">
              <span>
                GUIDED JOURNEY · {tour + 1}/{TOUR.length}
              </span>
              <h2>{TOUR[tour].title}</h2>
              <p>{TOUR[tour].text}</p>
              <div>
                <button
                  onClick={() => {
                    setPlaying(false);
                    step(tour - 1);
                  }}
                  disabled={tour === 0}
                >
                  ← Previous
                </button>
                <button onClick={() => setPlaying(!playing)}>
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    step(tour + 1);
                  }}
                  disabled={tour === TOUR.length - 1}
                >
                  Next →
                </button>
                <button
                  onClick={() => {
                    setFollow(false);
                    setTour(null);
                    setPlaying(false);
                  }}
                >
                  Explore ×
                </button>
              </div>
            </aside>
          )}
          {tour !== null && tour >= 5 && (
            <section>
              <h3>What this layer means</h3>
              <p className="cosmic-method">
                {tour < 7
                  ? "Measured bright / nearby stars across the sky; star sizes indicate apparent brightness. The sample is not a complete census or a photograph of the Milky Way."
                  : "Measured galaxy and quasar detections, limited by the SDSS survey footprint. Distances are cosmology-derived. Empty directions may simply have no loaded observations."}
              </p>
              <p className="cosmic-method">
                {filtered.length.toLocaleString()} objects in the active
                category. Select an object after leaving the tour to inspect its
                own measurements.
              </p>
            </section>
          )}
          {!(tour !== null && tour >= 5) && (
            <CosmicInspector
              data={data}
              selected={selected}
              jd={jd}
              distance={distance}
              hidden={!filtered.some((o) => o.id === selected.id)}
              physical={physical}
              saved={bookmarks.includes(selected.id)}
              onFocus={(fit) => focus(selected.id, fit)}
              tracking={follow}
              onTrack={() => {
                setFollow(!follow);
                if (!follow) {
                  focus(selected.id);
                  setClockPlaying(true);
                }
              }}
              onBookmark={bookmark}
              onShare={share}
              notice={notice}
            />
          )}
        </aside>
      </div>
      <footer className="cosmic-browser">
        <details className="cosmic-view-controls">
          <summary>View controls · pan, size & layers</summary>
          <div className="cosmic-toolbar">
            <TutorButton />
            <label>
              <input
                type="checkbox"
                checked={orbits}
                onChange={(e) => setOrbits(e.target.checked)}
              />
              Orbit guides
            </label>
            <label>
              <input
                type="checkbox"
                checked={light}
                onChange={(e) => setLight(e.target.checked)}
              />
              Sunlight
            </label>
            <label>
              Navigation
              <select
                aria-label="Navigation mode"
                value={navigation}
                onChange={(e) => setNavigation(e.target.value)}
              >
                <option value="pan">Pan · drag sideways</option>
                <option value="orbit">Orbit · rotate</option>
                <option value="fly">Fly · WASD / QE</option>
              </select>
            </label>
            <label>
              Body size
              <select
                aria-label="Body size mode"
                value={physical ? "physical" : "markers"}
                onChange={(e) => setPhysical(e.target.value === "physical")}
              >
                <option value="markers">Readable markers</option>
                <option value="physical">Physical radii</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={grid}
                onChange={(e) => setGrid(e.target.checked)}
              />
              Coordinate grid
            </label>
            <button onClick={() => setBrowserOpen(!browserOpen)}>
              {browserOpen ? "Hide objects" : "Browse objects"} (
              {results.length.toLocaleString()})
            </button>
          </div>
        </details>
        <div className="cosmic-coverage">
          {exponent >= 12 && exponent < 20
            ? "HYG all-sky bright / nearby sample · incomplete census, not the Milky Way’s full shape"
            : exponent >= 20
              ? "SDSS survey footprint · missing directions are unsurveyed, not empty space"
              : "JPL heliocentric ephemerides · dated, not live telemetry"}{" "}
          · ● stars (brightness) · ▰ galaxies · ◇ probes / quasars
        </div>
        <button
          className="cosmic-clock"
          disabled={jd >= max && !clockPlaying}
          onClick={() => setClockPlaying(!clockPlaying)}
        >
          {clockPlaying ? "Pause time" : "Play time · 1h / step"}
        </button>
        <div className="cosmic-browser-controls">
          <label>
            Find an object
            <input
              placeholder="Search planets, spacecraft or catalogue IDs…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setBrowserOpen(true);
                setPage(0);
              }}
            />
          </label>
          <label>
            Show
            <select
              aria-label="Object category"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setBrowserOpen(true);
                setPage(0);
              }}
            >
              {[
                "all",
                "planet",
                "moon",
                "spacecraft",
                "star",
                "galaxy",
                "quasar",
                "bookmarks",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Solar-system time ·{" "}
            {new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 16)}{" "}
            TDB
            <input
              aria-label="Ephemeris time"
              type="range"
              min={min}
              max={max}
              step="0.01"
              value={jd}
              onChange={(e) => setJd(Number(e.target.value))}
            />
          </label>
        </div>
        {browserOpen && (
          <div className="cosmic-results" aria-label="Search results">
            {visible.map((o) => (
              <button
                key={o.id}
                aria-pressed={selected.id === o.id}
                onClick={() => {
                  setPlaying(false);
                  choose(o.id);
                }}
              >
                {o.name}
              </button>
            ))}
            {!visible.length && <p>No matching catalogue objects.</p>}
          </div>
        )}
        {browserOpen && (
          <div className="cosmic-pagination">
            <button disabled={page === 0} onClick={() => setPage((v) => v - 1)}>
              Previous objects
            </button>
            <span>
              {results.length ? page * 24 + 1 : 0}–
              {Math.min(results.length, (page + 1) * 24)} of{" "}
              {results.length.toLocaleString()} · list and 3D share the same
              category
            </span>
            <button
              disabled={(page + 1) * 24 >= results.length}
              onClick={() => setPage((v) => v + 1)}
            >
              Next objects
            </button>
          </div>
        )}
        <small>
          {data.objects.length.toLocaleString()} real catalogue objects · no
          generated stars or galaxies · catalogue coverage is incomplete
        </small>
      </footer>
      {sources && (
        <section className="cosmic-sources" aria-label="Data and sources">
          <button onClick={() => setSources(false)}>Close sources ×</button>
          <h2>A map of observations, not everything that exists.</h2>
          {data.limits.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <p>
            Retrieved: {data.retrieved}. Stars use published HYG catalogue
            distances; galaxy/quasar radial positions use Planck18 comoving
            distance. These are different distance conventions. HYG derived star
            data © David Nash / Astronexus, CC BY-SA 4.0. Planet maps © Solar
            System Scope / INOVE, CC BY 4.0: NASA-derived, colour-enhanced with
            reconstructed gaps; not unmodified true-colour photographs. Saturn’s
            ring and body orientation are illustrative. Solar-system time does
            not evolve the distant universe. Orbit guides are two-body ellipses
            inferred from centred finite-difference Horizons states, not mission
            predictions. Solar GM: JPL DE440. Sun lighting, atmosphere and
            orientations are illustrative.
          </p>
          {data.sources.map((s, i) => (
            <p key={i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name} ↗
              </a>
              <small>SHA-256: {s.sha256}</small>
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
