import { Check, AlertTriangle, ArrowRight, BookmarkPlus } from "lucide-react";
import type { MissionResult } from "@exo/engine/engineering";
import type { BlueprintState } from "./useBlueprint";
import { SourceLink } from "./SourcesPanel";
const number = (n: number) =>
  n.toLocaleString("en", { maximumFractionDigits: 2 });
export function ResourceTimeline({
  result,
  kind,
}: {
  result: MissionResult;
  kind: "battery" | "storage";
}) {
  const isBattery = kind === "battery";
  const maximum = Math.max(
    1,
    ...result.points.map((p) => (isBattery ? p.batteryWh : p.storedGbit)),
  );
  const y = (n: number) => 126 - (n / maximum) * 100;
  const line = result.points
    .map(
      (p) =>
        `${48 + (p.minute / 1440) * 522},${y(isBattery ? p.batteryWh : p.storedGbit)}`,
    )
    .join(" ");
  return (
    <figure className={`bp-timeline bp-timeline-${kind}`}>
      <figcaption>
        <strong>
          {isBattery
            ? "Battery across 24 hours"
            : "Science waiting for downlink"}
        </strong>
        <span>{isBattery ? "Wh" : "Gbit"}</span>
      </figcaption>
      <svg
        viewBox="0 0 600 160"
        role="img"
        aria-label={
          isBattery
            ? `Battery minimum ${number(result.minimumWh)} watt hours; reserve ${number(result.reserveWh)} watt hours.`
            : `Storage timeline; ${number(result.lostGbit)} gigabits lost to overflow.`
        }
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="48"
              x2="570"
              y1={y(maximum * f)}
              y2={y(maximum * f)}
              className="bp-chart-grid"
            />
            <text x="40" y={y(maximum * f) + 4} textAnchor="end">
              {number(maximum * f)}
            </text>
          </g>
        ))}
        {isBattery && result.reserveWh <= maximum && (
          <>
            <line
              x1="48"
              x2="570"
              y1={y(result.reserveWh)}
              y2={y(result.reserveWh)}
              className="bp-chart-reserve"
            />
            <text x="565" y={y(result.reserveWh) - 5} textAnchor="end">
              20% reserve
            </text>
          </>
        )}
        <polyline points={line} className="bp-chart-line" />
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={48 + (h / 24) * 522} y="150" textAnchor="middle">
            {h}h
          </text>
        ))}
      </svg>
    </figure>
  );
}
export function TestPanel({
  state,
  onSource,
  onDesign,
}: {
  state: BlueprintState;
  onSource: (id: string) => void;
  onDesign: () => void;
}) {
  const r = state.result;
  if (!r)
    return (
      <p>
        Complete valid inputs and load matching NASA geometry to run the
        mission.
      </p>
    );
  return (
    <section>
      <h2>
        {r.passed
          ? "Your concept closes its resource budgets."
          : "A constraint is holding this mission back."}
      </h2>
      <p>
        One-minute resource simulation over 12 assumed lunar orbits. Every check
        explains what to change.
      </p>
      <div className="bp-radio-summary">
        <div className="bp-section-heading">
          <h3>NASA geometry → radio estimate</h3>
          <SourceLink id="horizons" onSource={onSource}>
            Exact API query & calculation
          </SourceLink>
        </div>
        <dl>
          <div>
            <dt>Earth–Moon distance</dt>
            <dd>{number(r.distanceKm)} km</dd>
          </div>
          <div>
            <dt>One-way vacuum delay</dt>
            <dd>{number(r.delaySeconds)} s</dd>
          </div>
          <div>
            <dt>Free-space path loss</dt>
            <dd>{number(r.pathLossDb)} dB</dd>
          </div>
          <div>
            <dt>Estimated downlink</dt>
            <dd>{number(r.downlinkMbps)} Mbps</dd>
          </div>
        </dl>
        <p>
          Displayed at 12:00 TDB. Actual rate in this resource simulation varies
          with the hourly NASA vectors; antenna, receiver and contact
          assumptions are defined by the lab.
        </p>
      </div>
      <ul className="bp-checks">
        {r.checks.map((c) => (
          <li key={c.id} className={c.passed ? "is-pass" : "is-fail"}>
            {c.passed ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <AlertTriangle size={18} aria-hidden="true" />
            )}
            <div>
              <strong>
                {c.title}
                <span>{c.passed ? "Pass" : "Revise"}</span>
              </strong>
              <p>{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="bp-test-actions">
        <button onClick={onDesign}>
          Revise design <ArrowRight size={15} aria-hidden="true" />
        </button>
        <button
          onClick={() => {
            state.update("batteryWh", 30);
          }}
        >
          Try a 30 Wh battery
        </button>
      </div>
      <ResourceTimeline result={r} kind="battery" />
      <ResourceTimeline result={r} kind="storage" />
      <div className="bp-section-heading">
        <h3>Science account</h3>
        <SourceLink id="lro-2007" onSource={onSource}>
          NASA reference volumes → simulated returns
        </SourceLink>
      </div>
      <div className="bp-table-wrap">
        <table>
          <caption>Data per instrument, Gbit</caption>
          <thead>
            <tr>
              <th>Payload</th>
              <th>Planned</th>
              <th>Produced</th>
              <th>Returned</th>
              <th>Stored</th>
              <th>Lost</th>
            </tr>
          </thead>
          <tbody>
            {r.payloads.map((p) => (
              <tr key={p.id}>
                <th>{p.id.toUpperCase()}</th>
                <td>{number(p.plannedGbit)}</td>
                <td>{number(p.producedGbit)}</td>
                <td>{number(p.deliveredGbit)}</td>
                <td>{number(p.storedGbit)}</td>
                <td>{number(p.lostGbit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="bp-equations">
        <summary>Equations, resource accounting & assumptions</summary>
        <p>
          Solar first supplies loads. Battery discharge efficiency is 95%;
          charge efficiency is 90%. Capacity clamps stored energy. Initial
          battery + solar generation = served demand + conversion losses +
          curtailed generation + final battery.
        </p>
        <p>
          Produced science data = delivered + stored + lost. Planned data
          remains the target even during power failures. Radio free-space loss =
          20 log₁₀(4πdf/c). Downlink capacity scales with received power
          relative to an authored 10 Mbps reference, capped at 100 Mbps.
        </p>
        <SourceLink id="assumptions" onSource={onSource}>
          Read every model assumption
        </SourceLink>
      </details>
    </section>
  );
}
export function ComparePanel({ state }: { state: BlueprintState }) {
  const { baseline, baselineResult: a, result: b } = state;
  if (!baseline || !a || !b)
    return (
      <section className="bp-empty">
        <BookmarkPlus size={36} aria-hidden="true" />
        <h2>Keep a reference. Change one decision.</h2>
        <p>
          Pin your current design as Design A, then change battery, storage or
          another input. You’ll see exactly what improved and what it cost.
        </p>
        <button
          className="bp-primary"
          disabled={!b}
          onClick={state.pinBaseline}
        >
          Pin current design as A
        </button>
      </section>
    );
  const changes = Object.keys(state.draft).filter(
    (key) =>
      JSON.stringify(state.draft[key as keyof typeof state.draft]) !==
      JSON.stringify(baseline.draft[key as keyof typeof baseline.draft]),
  );
  const rows: [string, number, number, string][] = [
    ["Spacecraft mass", a.massKg, b.massKg, "kg"],
    ["Budget", a.credits, b.credits, "credits"],
    ["Minimum battery", a.minimumWh, b.minimumWh, "Wh"],
    ["Science returned", a.deliveredGbit, b.deliveredGbit, "Gbit"],
    ["Storage overflow", a.lostGbit, b.lostGbit, "Gbit"],
  ];
  return (
    <section>
      <h2>What did your decision change?</h2>
      <p>
        Design A is a complete snapshot of inputs and NASA geometry. Design B is
        your current draft.
      </p>
      <div className="bp-comparison-note">
        <strong>
          {changes.length} changed {changes.length === 1 ? "input" : "inputs"}
        </strong>
        <span>
          {changes.length
            ? changes.join(", ")
            : "Change an input in Design to begin the experiment."}
        </span>
        {(changes.length > 1 ||
          JSON.stringify(baseline.geometry.samples) !==
            JSON.stringify(state.geometry.samples)) && (
          <p>
            Several conditions differ. This is a design comparison, not a
            controlled one-variable experiment.
          </p>
        )}
      </div>
      <div className="bp-table-wrap">
        <table>
          <caption>Design trade-offs</caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>A · pinned</th>
              <th>B · current</th>
              <th>B − A</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, va, vb, unit]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>
                  {number(va)} {unit}
                </td>
                <td>
                  {number(vb)} {unit}
                </td>
                <td>
                  {vb - va > 0 ? "+" : ""}
                  {number(vb - va)} {unit}
                </td>
              </tr>
            ))}
            <tr>
              <th>Review</th>
              <td>{a.passed ? "Passes" : "Revise"}</td>
              <td>{b.passed ? "Passes" : "Revise"}</td>
              <td>Within model scope</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button onClick={state.pinBaseline}>Replace A with current design</button>
    </section>
  );
}
export function LiveBudget({
  state,
  onSource,
}: {
  state: BlueprintState;
  onSource: (id: string) => void;
}) {
  const r = state.result;
  const metric = (
    label: string,
    value: string,
    detail: string,
    source: string,
    failed = false,
  ) => (
    <div className={`bp-budget-row ${failed ? "is-fail" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <small>{detail}</small>
      <SourceLink id={source} onSource={onSource}>
        {source === "horizons"
          ? "Horizons + lab model"
          : source === "lro-2007"
            ? "LRO + lab model"
            : "Lab assumptions"}
      </SourceLink>
    </div>
  );
  return (
    <aside className="bp-budget" aria-label="Live resource budgets">
      <div className="bp-budget-title">
        <h2>Live budgets</h2>
        <span className="bp-live-dot" />
      </div>
      <p className={`bp-verdict ${r && !r.passed ? "is-fail" : ""}`}>
        {!r
          ? "Awaiting valid inputs"
          : r.passed
            ? "Concept checks pass"
            : `${r.checks.filter((c) => !c.passed).length} checks need revision`}
      </p>
      <dl>
        {metric(
          "Spacecraft mass",
          r ? `${number(r.massKg)} kg` : "—",
          `Limit ${number(state.draft.massLimitKg)} kg`,
          "lro-2007",
          !!r && r.massKg > state.draft.massLimitKg,
        )}
        {metric(
          "Minimum battery",
          r ? `${number(r.minimumWh)} Wh` : "—",
          r ? `Reserve ${number(r.reserveWh)} Wh` : "20% reserve required",
          "lro-2007",
          !!r && !r.checks.find((c) => c.id === "power")?.passed,
        )}
        {metric(
          "Science returned",
          r ? `${number(r.deliveredGbit)} Gbit` : "—",
          r
            ? `${number(r.plannedGbit)} Gbit planned`
            : "Return ≥80% per required payload",
          "lro-2007",
        )}
        {metric(
          "Budget",
          r ? `${number(r.credits)} cr` : "—",
          `${number(state.draft.creditLimit)} simulation credits`,
          "assumptions",
          !!r && r.credits > state.draft.creditLimit,
        )}
        {metric(
          "One-way signal delay",
          r ? `${number(r.delaySeconds)} s` : "—",
          "Geocentric distance / speed of light",
          "horizons",
        )}
      </dl>
      <p className="bp-budget-foot">
        Educational concept review. Thermal, propulsion and detailed orbit
        engineering remain open requirements.
      </p>
    </aside>
  );
}
