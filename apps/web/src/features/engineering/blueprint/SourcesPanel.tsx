import { ExternalLink, Database, Info } from "lucide-react";
import { ENGINEERING_SOURCES } from "@exo/data/engineering";
import type { HorizonsSnapshot } from "@exo/data/engineering";
export function SourceLink({
  id,
  onSource,
  children,
}: {
  id: string;
  onSource: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="bp-source-link"
      onClick={() => onSource(id)}
    >
      <Database size={12} aria-hidden="true" />
      {children}
    </button>
  );
}
export function SourcesPanel({
  geometry,
  origin,
  focusId,
}: {
  geometry: HorizonsSnapshot;
  origin: string;
  focusId: string;
}) {
  return (
    <section className="bp-sources" aria-labelledby="bp-source-title">
      <h2 id="bp-source-title">Every number has a source.</h2>
      <p>
        NASA predictions and published allocations feed the calculations below.
        Operational schedules, spacecraft sizing and review thresholds are lab
        assumptions.
      </p>
      <div className="bp-source-key">
        <span>NASA API → geometry</span>
        <span>NASA publication → instrument budgets</span>
        <span>Lab model → calculated outcomes</span>
      </div>
      {ENGINEERING_SOURCES.map((s) => (
        <article
          key={s.id}
          id={`bp-source-${s.id}`}
          className={`bp-source-entry ${focusId === s.id ? "is-highlighted" : ""}`}
          tabIndex={-1}
        >
          <div className="bp-source-heading">
            <span
              className={`bp-label ${s.id === "assumptions" ? "bp-label-amber" : ""}`}
            >
              {s.kind}
            </span>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer">
                Open original <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
          <h3>{s.title}</h3>
          <p className="bp-mono">{s.location}</p>
          <p>{s.values}</p>
          <dl>
            <dt>Used in this lab</dt>
            <dd>{s.usedIn.join(" · ")}</dd>
            <dt>Limits & interpretation</dt>
            <dd>{s.limitations}</dd>
          </dl>
          {s.id === "horizons" && (
            <div className="bp-query">
              <dl>
                <dt>Current source</dt>
                <dd>{origin}</dd>
                <dt>Prediction interval</dt>
                <dd>
                  {geometry.date} 00:00 → next day 00:00 TDB ·{" "}
                  {geometry.samples.length} hourly vectors
                </dd>
                <dt>Retrieved</dt>
                <dd>{geometry.retrievedAt}</dd>
                <dt>NASA API version</dt>
                <dd>{geometry.apiVersion}</dd>
              </dl>
              <a href={geometry.queryUrl} target="_blank" rel="noreferrer">
                Open exact NASA API query{" "}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          )}
        </article>
      ))}
      <div className="bp-note">
        <Info size={17} aria-hidden="true" />
        <p>
          Signal distance uses linearly interpolated geocentric vectors. The
          link metrics display the mission midpoint; the simulation recalculates
          the link each minute. The fixed contact schedule does not imply actual
          ground-station visibility.
        </p>
      </div>
    </section>
  );
}
