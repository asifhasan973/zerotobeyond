import { CalendarDays, ChevronDown, Pause, Play, X } from "lucide-react";
interface Props {
  jd: number;
  rate: number;
  now: boolean;
  nowAvailable: boolean;
  canPlay: boolean;
  expanded: boolean;
  bounds: { min: number; max: number };
  onDate(jd: number): void;
  onRate(rate: number): void;
  onToggle(): void;
  onNow(): void;
  onExpand(): void;
}
const iso = (jd: number) =>
  new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 16);
export function SolarTimeline(p: Props) {
  const date = new Date((p.jd - 2440587.5) * 86400000),
    atLimit = p.jd === p.bounds.min || p.jd === p.bounds.max;
  return (
    <nav
      className={`solar-timeline ${p.expanded ? "is-expanded" : ""}`}
      aria-label="Simulation time"
    >
      {p.expanded && (
        <div className="solar-time-expanded">
          <header>
            <strong>Time travel controls</strong>
            <button aria-label="Close time controls" onClick={p.onExpand}>
              <X size={16} />
            </button>
          </header>
          <label>
            Data date · TDB
            <input
              aria-label="Simulation date"
              type="datetime-local"
              onFocus={() => p.onRate(0)}
              min={iso(p.bounds.min)}
              max={iso(p.bounds.max)}
              value={iso(p.jd)}
              onChange={(e) => {
                const value = Date.parse(e.target.value + "Z");
                if (Number.isFinite(value))
                  p.onDate(value / 86400000 + 2440587.5);
              }}
            />
          </label>
          <label>
            Time speed
            <select
              aria-label="Time rate"
              value={p.rate}
              onChange={(e) => p.onRate(Number(e.target.value))}
            >
              <option value={0}>Paused</option>
              <option value={1}>Real time</option>
              <option value={3600}>1 hour / second</option>
              <option value={86400}>1 day / second</option>
              <option value={-86400}>Reverse · 1 day / second</option>
            </select>
          </label>
          <input
            className="solar-time-range"
            aria-label="Simulation timeline"
            type="range"
            onFocus={() => p.onRate(0)}
            min={p.bounds.min}
            max={p.bounds.max}
            step={0.0001}
            value={p.jd}
            onChange={(e) => p.onDate(Number(e.target.value))}
          />
          <p>
            {atLimit
              ? "End of available data. Choose another date to keep exploring."
              : "Positions are available within this dated NASA/JPL snapshot."}
          </p>
        </div>
      )}
      <button
        className="solar-play-button"
        aria-label={p.rate === 0 ? "Play simulation" : "Pause simulation"}
        disabled={!p.canPlay}
        title={
          !p.canPlay
            ? "Choose another date or reverse time to continue"
            : undefined
        }
        onClick={p.onToggle}
      >
        {p.rate === 0 ? (
          <Play size={15} fill="currentColor" />
        ) : (
          <Pause size={15} fill="currentColor" />
        )}
        <span>{p.rate === 0 ? "Play" : "Pause"}</span>
      </button>
      <button
        className="solar-time-date"
        aria-label="Change simulation date"
        onClick={p.onExpand}
      >
        <CalendarDays size={15} />
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })}
      </button>
      <button
        className="solar-time-rate"
        aria-label="Time speed"
        aria-expanded={p.expanded}
        onClick={p.onExpand}
      >
        {atLimit && p.rate === 0
          ? "Data limit"
          : p.rate === 0
            ? "Paused"
            : p.rate === 1
              ? "Real time"
              : `${p.rate < 0 ? "−" : ""}${Math.abs(p.rate) / 3600} hr / sec`}
        <ChevronDown size={13} />
      </button>
      {p.now ? (
        <span className="solar-now-status">
          <i />
          Today
        </span>
      ) : p.nowAvailable ? (
        <button className="solar-return-now" onClick={p.onNow}>
          Back to today
        </button>
      ) : (
        <span className="solar-now-status">Snapshot</span>
      )}
    </nav>
  );
}
