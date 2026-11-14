import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BookOpen, ChevronRight, Orbit, X } from "lucide-react";
import { useLoadingStore, useOrientationLifecycleStore } from "@exo/ui";
import { COSMIC_SOLAR_URL, type CosmicData } from "@exo/data/cosmic";
import {
  advanceSolarClock,
  positionAt,
  separation,
  solarDateBounds,
} from "@exo/engine/cosmic";
import {
  SolarSidebar,
  SolarTimeline,
  SolarToolbar,
  SolarWelcome,
  SolarNav,
  SolarSources,
  SolarViewSettings,
  type SolarCamera,
} from "./solar";
import { SizeComparison } from "./SizeComparison";
import "./solar-system.css";
import "./solar/solar-welcome.css";
const SolarViewport = lazy(() =>
  import("./solar/SolarViewport").then((module) => ({
    default: module.SolarViewport,
  })),
);
const toJd = (ms: number) => ms / 86400000 + 2440587.5;
export default function SolarSystem() {
  const [data, setData] = useState<CosmicData | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(() =>
      new URLSearchParams(location.search).get("target"),
    );
  const [sidebar, setSidebar] = useState(true),
    [category, setCategory] = useState<"spacecraft" | "planets">("planets");
  const [todayJd] = useState(() => toJd(Date.now()));
  const [jd, setJd] = useState(todayJd),
    [rate, setRate] = useState(1),
    [resumeRate, setResumeRate] = useState(1),
    [now, setNow] = useState(true),
    [expanded, setExpanded] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0),
    [overview, setOverview] = useState(false),
    [pan, setPan] = useState(false);
  const [orbits, setOrbits] = useState(true),
    [labels, setLabels] = useState(true),
    [lighting, setLighting] = useState(true);
  const [compare, setCompare] = useState(false),
    [sources, setSources] = useState(false),
    [settings, setSettings] = useState(false),
    [ready, setReady] = useState(false);
  const [departure, setDeparture] = useState(Date.now),
    [speed, setSpeed] = useState(20);
  const [compact, setCompact] = useState(
    () => window.innerWidth < 800 || window.innerHeight < 500,
  );
  const camera = useRef<SolarCamera | null>(null),
    compareDialog = useRef<HTMLDialogElement>(null),
    clock = useRef(jd);
  const frozen = useOrientationLifecycleStore((s) => s.isFrozen);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const task = fetch(COSMIC_SOLAR_URL, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("Ephemerides unavailable");
        const next: CosmicData = await r.json();
        const bounds = solarDateBounds(next.objects ?? []);
        if (!bounds) throw Error("Invalid ephemerides");
        if (active) {
          setData({
            ...next,
            objects: next.objects.filter((o) => o.samples?.length),
          });
          const current = toJd(Date.now());
          if (current < bounds.min || current > bounds.max) {
            setJd((bounds.min + bounds.max) / 2);
            setNow(false);
            setRate(0);
          }
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    useLoadingStore.getState().registerLoaderTask(task);
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  const bounds = useMemo(
    () => (data ? solarDateBounds(data.objects) : null),
    [data],
  );
  const nowAvailable =
    !!bounds && todayJd >= bounds.min && todayJd <= bounds.max;
  useEffect(() => {
    clock.current = jd;
  }, [jd]);
  useEffect(() => {
    if (!entered || !bounds || rate === 0) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const time = performance.now(),
        elapsed = (time - last) / 1000;
      last = time;
      if (document.hidden || frozen) return;
      const next = advanceSolarClock(
        clock.current,
        rate,
        elapsed,
        bounds,
        now ? toJd(Date.now()) : undefined,
      );
      clock.current = next.jd;
      setJd(next.jd);
      if (next.atLimit) {
        setRate(0);
        setNow(false);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [entered, bounds, rate, now, frozen]);
  useEffect(() => {
    const resize = () =>
      setCompact(window.innerWidth < 800 || window.innerHeight < 500);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const select = useCallback((id: string) => {
    setSelectedId(id);
    setSidebar(true);
    setSettings(false);
    setFocusVersion((v) => v + 1);
  }, []);
  const home = useCallback((wide = false) => {
    setSelectedId(null);
    setSidebar(true);
    setOverview(wide);
    setSettings(false);
    setFocusVersion((v) => v + 1);
  }, []);
  const changeRate = useCallback((value: number) => {
    if (value) setResumeRate(value);
    setRate(value);
    setNow(false);
  }, []);
  useEffect(() => {
    if (!entered) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        setCompare(false);
        setSources(false);
        setSettings(false);
        return;
      }
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        document.querySelector("dialog[open]") ||
        (e.target instanceof HTMLElement &&
          e.target.closest("input,select,textarea,[contenteditable=true]"))
      )
        return;
      if (
        e.key === " " &&
        e.target instanceof HTMLElement &&
        e.target.closest("button,a")
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        changeRate(rate === 0 ? resumeRate : 0);
      } else if (e.key === "Home") {
        e.preventDefault();
        home();
      } else if (e.key === "+" || e.key === "=") camera.current?.zoom(0.65);
      else if (e.key === "-") camera.current?.zoom(1.55);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [entered, home, rate, resumeRate, changeRate]);
  useEffect(() => {
    if (compare) compareDialog.current?.showModal();
    else compareDialog.current?.close();
  }, [compare]);
  const onReady = useCallback(() => setReady(true), []);
  const selected = data?.objects.find((o) => o.id === selectedId),
    earth = data?.objects.find((o) => o.id === "399");
  const distanceAt = (date: number) => {
    if (!selected || !earth) return null;
    const a = positionAt(earth, date),
      b = positionAt(selected, date);
    return a && b ? separation(a, b) : null;
  };
  const showNow = () => {
    if (!bounds || !nowAvailable) return;
    setJd(toJd(Date.now()));
    setRate(1);
    setResumeRate(1);
    setNow(true);
  };
  const showDate = (date: number) => {
    if (!bounds || date < bounds.min || date > bounds.max) return;
    setJd(date);
    setRate(0);
    setNow(false);
  };
  const retry = () => {
    setError(false);
    setAttempt((v) => v + 1);
  };
  const credits = (
    <SolarSources
      open={sources}
      onClose={() => setSources(false)}
      bounds={bounds}
    />
  );
  if (!entered)
    return (
      <div className="solar-native solar-entry">
        <SolarWelcome
          ready={!!data}
          error={error}
          onRetry={retry}
          onSources={() => setSources(true)}
          onStart={() => {
            const startJd = nowAvailable ? toJd(Date.now()) : jd;
            setJd(startJd);
            setDeparture(
              nowAvailable ? Date.now() : (startJd - 2440587.5) * 86400000,
            );
            setRate(nowAvailable ? 1 : 0);
            setResumeRate(1);
            setNow(nowAvailable);
            setSpeed(20);
            setReady(false);
            setSelectedId(null);
            setCategory("planets");
            setOverview(true);
            setSidebar(true);
            setSettings(false);
            setPan(false);
            setFocusVersion((v) => v + 1);
            setEntered(true);
          }}
        />
        {credits}
      </div>
    );
  const panelWidth = sidebar ? (compact ? 280 : 352) : 0;
  return (
    <main
      className={`solar-eyes solar-native ${sidebar ? "has-sidebar" : ""} ${selected ? "has-selection" : ""}`}
      aria-label="Solar System explorer"
      style={
        {
          "--solar-sidebar-width": `${compact ? 280 : 352}px`,
          "--solar-panel-offset": `${panelWidth}px`,
        } as React.CSSProperties
      }
    >
      {data && (
        <Suspense fallback={null}>
          <SolarViewport
            objects={data.objects}
            selectedId={selected?.id ?? null}
            focusVersion={focusVersion}
            overview={overview}
            jd={jd}
            rate={rate}
            panelWidth={panelWidth}
            orbits={orbits}
            labels={labels}
            lighting={lighting}
            pan={pan}
            cameraRef={camera}
            onSelect={select}
            onReady={onReady}
          />
        </Suspense>
      )}
      <SolarNav
        objects={data?.objects ?? []}
        onSources={() => setSources(true)}
        onSelect={select}
      />
      {data && bounds && sidebar && (
        <SolarSidebar
          objects={data.objects}
          selected={selected}
          category={
            selected
              ? selected.kind === "spacecraft"
                ? "spacecraft"
                : "planets"
              : category
          }
          onCategory={(next) => {
            home();
            setCategory(next);
          }}
          onSelect={select}
          onHome={() => {
            home();
            setCategory(
              selected?.kind === "spacecraft" ? "spacecraft" : "planets",
            );
          }}
          onCollapse={() => setSidebar(false)}
          distance={distanceAt(jd)}
          departureDistance={distanceAt(toJd(departure))}
          departure={departure}
          onDeparture={setDeparture}
          speed={speed}
          onSpeed={setSpeed}
          bounds={bounds}
        />
      )}
      {!sidebar && (
        <button
          className="solar-show-sidebar"
          aria-label="Show destinations"
          onClick={() => setSidebar(true)}
        >
          <ChevronRight size={17} />
          Destinations
        </button>
      )}
      <SolarToolbar
        onZoom={(factor) => camera.current?.zoom(factor)}
        onView={() => setSettings((v) => !v)}
        onOverview={() => {
          home(true);
          setCategory("planets");
        }}
        onPan={() => setPan((v) => !v)}
        pan={pan}
        settings={settings}
      />
      {settings && (
        <SolarViewSettings
          orbits={orbits}
          labels={labels}
          lighting={lighting}
          onOrbits={() => setOrbits((v) => !v)}
          onLabels={() => setLabels((v) => !v)}
          onLighting={() => setLighting((v) => !v)}
          onClose={() => setSettings(false)}
          onCompare={() => {
            setSettings(false);
            setCompare(true);
          }}
        />
      )}
      {bounds && (
        <SolarTimeline
          jd={jd}
          rate={rate}
          now={now && rate === 1}
          nowAvailable={nowAvailable}
          canPlay={
            rate !== 0 ||
            !(
              bounds &&
              ((jd === bounds.max && resumeRate > 0) ||
                (jd === bounds.min && resumeRate < 0))
            )
          }
          expanded={expanded}
          bounds={bounds}
          onDate={showDate}
          onRate={changeRate}
          onToggle={() => changeRate(rate === 0 ? resumeRate : 0)}
          onNow={showNow}
          onExpand={() => setExpanded((v) => !v)}
        />
      )}
      <footer className="solar-credit">
        <a
          href="https://eyes.nasa.gov/apps/solar-system/"
          target="_blank"
          rel="noreferrer"
        >
          NASA Eyes · design inspiration ↗
        </a>
        <span>·</span>
        <a
          href="https://ssd.jpl.nasa.gov/horizons/"
          target="_blank"
          rel="noreferrer"
        >
          NASA/JPL · position data ↗
        </a>
        <button onClick={() => setSources(true)}>
          <BookOpen size={12} />
          All sources
        </button>
      </footer>
      {!ready && !error && (
        <div className="solar-loading" role="status">
          <Orbit size={37} />
          <span>Getting your journey ready…</span>
        </div>
      )}
      {error && (
        <div className="solar-loading" role="alert">
          <h2>We couldn’t load the Solar System</h2>
          <button onClick={retry}>Try again</button>
          <button onClick={() => setEntered(false)}>
            Choose a destination
          </button>
        </div>
      )}
      <dialog
        className="solar-compare-dialog"
        ref={compareDialog}
        onCancel={() => setCompare(false)}
        aria-labelledby="solar-compare-title"
      >
        <header>
          <h2 id="solar-compare-title">How big are these worlds?</h2>
          <button
            aria-label="Close size comparison"
            onClick={() => setCompare(false)}
          >
            <X size={20} />
          </button>
        </header>
        {data && <SizeComparison objects={data.objects} />}
        <p>
          Planet diameters use kilometres. Spacecraft models in the explorer are
          enlarged for visibility.
        </p>
      </dialog>
      {credits}
    </main>
  );
}
