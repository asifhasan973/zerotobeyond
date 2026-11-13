import { lazy, Suspense } from "react";
import { isEngineFrozen } from "@exo/ui";
import { sound } from "@exo/audio";
import type { WorkshopSession } from "@/game/moon/workshop/lander/workshopSession";
import {
  downloadMissionCard,
  downloadMissionLog,
} from "@/game/moon/shared/missionCard";
import { missionReport, reportFindings } from "./missionReport";
import { ReportComparison } from "./ReportComparison";
import { ReportMissionLog } from "./ReportMissionLog";
import "./missionReport.css";

const AtlasReference = lazy(() =>
  import("@/features/exploration/reference").then((m) => ({
    default: m.AtlasReference,
  })),
);

export function MissionDebrief({
  session,
  onHome,
  onRetry,
  preview = false,
}: {
  session: WorkshopSession;
  onHome?: () => void;
  onRetry?: () => void;
  preview?: boolean;
}) {
  const report = missionReport(session);
  const d = report.debrief;
  const findings = reportFindings(report);
  const operations = session.moon.crewOperations;
  const act = (action: () => void) => {
    if (isEngineFrozen()) return;
    sound.playClick();
    action();
  };
  const findingsContent = (
    <section
      className="report-findings"
      aria-labelledby="report-findings-title"
    >
      <h3 id="report-findings-title">What we found</h3>
      <p className="report-context-label">Your simulated mission evidence</p>
      {!findings.length ? (
        <p className="report-empty">
          No measurements recorded. Collect a reading on your next mission.
        </p>
      ) : (
        <ol className="report-finding-list">
          {findings.slice(0, 3).map((finding) => (
            <li key={finding.id}>
              <div className="report-finding-heading">
                <h4>{finding.title}</h4>
                <span
                  className="report-delivery-status"
                  data-delivered={finding.receivedOnEarth}
                >
                  {finding.receivedOnEarth
                    ? "Received on Earth"
                    : "Earth receipt not established"}
                </span>
              </div>
              <p className="report-observation-result">{finding.measurement}</p>
              <p>{finding.meaning}</p>
              <p className="report-uncertainty">{finding.uncertainty}</p>
              <small>
                {finding.locationName} · {finding.confidence} confidence
              </small>
            </li>
          ))}
        </ol>
      )}
      {report.observations.length > 0 && (
        <details className="report-all-records">
          <summary>All {report.observations.length} measurements</summary>
          {report.observations.map((record) => (
            <article key={record.id}>
              <h4>
                {record.instrumentName} · {record.locationName}
              </h4>
              <p>
                {record.signal ??
                  record.classification ??
                  record.result ??
                  "Result unavailable"}
              </p>
              <p>{record.meaning}</p>
              <small>
                Quality: {record.quality ?? "Unavailable"} · Confidence:{" "}
                {record.confidence ?? "Unavailable"}
                {record.receivedOnEarth
                  ? " · Received on Earth"
                  : record.transmitted
                    ? " · Sent; Earth receipt not established"
                    : " · Not sent"}
              </small>
            </article>
          ))}
        </details>
      )}
      <div className="report-genuine-actions">
        {report.samples.length > 0 && (
          <p>
            {report.samples.length}{" "}
            {report.samples.length === 1
              ? "sample collected"
              : "samples collected"}{" "}
            · {report.returnedCount} returned to Earth.
          </p>
        )}
        {operations.firstSteps && (
          <p>Both surface astronauts stepped onto the Moon.</p>
        )}
        {operations.flagPlanted && (
          <p>Your ExoVisionaries mission flag was planted.</p>
        )}
      </div>
    </section>
  );

  return (
    <section className="moon-report" aria-labelledby="moon-report-title">
      <header className="moon-report-heading">
        <div>
          <h2 id="moon-report-title">{report.objective} report</h2>
          <p>
            Game mission region: <strong>{report.location.name}</strong>
          </p>
        </div>
        <strong className="report-state" data-recovered={report.recovered}>
          {report.recovered
            ? `${d.card.crewRecovered} of 3 crew home on Earth`
            : "Crew recovery not established"}
        </strong>
      </header>
      {preview && (
        <p className="report-preview-note">
          Reviewing a saved step. This is not a new mission result.
        </p>
      )}
      <div className="moon-report-content">
        <Suspense
          fallback={
            <div className="report-map-loading" role="status">
              Opening the NASA reference map…
            </div>
          }
        >
          <AtlasReference
            context={report.location.explanation}
            objective={session.moon.objective ?? "lunar-ice"}
            reportMode
          >
            {findingsContent}
          </AtlasReference>
        </Suspense>
        <details className="report-flight-details">
          <summary>Flight details</summary>
          <h3>Recorded journey</h3>
          <ol className="report-journey">
            {report.journey.map((item) => (
              <li key={item.name} data-recorded={item.recorded}>
                <strong>{item.name}</strong>
                <span>{item.recorded ? "Recorded" : "Not recorded"}</span>
              </li>
            ))}
          </ol>
          {report.outcome && (
            <ul>
              {report.outcome.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          <h3>Resources and design</h3>
          <dl className="report-resource-list">
            <div>
              <dt>Elapsed model time</dt>
              <dd>{d.resources.elapsedDays.toFixed(2)} days</dd>
            </div>
            <div>
              <dt>Supplies used</dt>
              <dd>
                {d.resources.crewDaysUsed?.toFixed(2) ?? "Unavailable"}{" "}
                crew-days
              </dd>
            </div>
            <div>
              <dt>Cabin energy used</dt>
              <dd>
                {d.resources.cabinUsedKWh?.toFixed(1) ?? "Unavailable"} kWh
              </dd>
            </div>
            <div>
              <dt>Descent propellant used</dt>
              <dd>
                {d.resources.descentUsedKg?.toFixed(0) ?? "Unavailable"} kg
              </dd>
            </div>
            <div>
              <dt>Ascent and docking propellant used</dt>
              <dd>{d.resources.ascentUsedKg.toFixed(0)} kg</dd>
            </div>
            <div>
              <dt>Service propellant used</dt>
              <dd>
                {d.resources.serviceUsedKg?.toFixed(0) ?? "Unavailable"} kg
              </dd>
            </div>
          </dl>
          {d.battery ? (
            <p>
              Surface battery ended at {d.battery.endWh.toFixed(1)} of{" "}
              {d.battery.capacityWh.toFixed(0)} Wh after charging. This is not
              total energy used.
            </p>
          ) : (
            <p>Surface battery accounting is unavailable.</p>
          )}
          <ul>
            {d.decisions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <details>
            <summary>Measurement records and IDs</summary>
            {report.observations.length ? (
              report.observations.map((record) => (
                <article key={record.id}>
                  <h4>
                    {record.instrumentName} · {record.locationName}
                  </h4>
                  <p>
                    <code>
                      {record.id} · {record.instrumentId} · {record.locationId}
                    </code>
                  </p>
                  <p>
                    Depth:{" "}
                    {record.depthCm == null
                      ? "Not recorded"
                      : `${record.depthCm} cm`}
                    . Range:{" "}
                    {record.depthRangeCm
                      ? `${record.depthRangeCm[0]}–${record.depthRangeCm[1]} cm`
                      : "Not recorded"}
                    . {record.points} science points.
                  </p>
                </article>
              ))
            ) : (
              <p>No measurement records.</p>
            )}
          </details>
          <details>
            <summary>Physical samples</summary>
            {report.samples.length ? (
              report.samples.map((sample) => (
                <article key={sample.id}>
                  <h4>
                    {sample.locationName} · {sample.massKg.toFixed(1)} kg
                  </h4>
                  <p>
                    {sample.returned
                      ? "Returned to Earth"
                      : sample.stowed
                        ? "Stowed; Earth return not established"
                        : "Collected; remains on the Moon"}
                  </p>
                  <code>
                    {sample.id} · {sample.location}
                  </code>
                </article>
              ))
            ) : (
              <p>No physical samples recorded.</p>
            )}
          </details>
          <ReportMissionLog session={session} />
          <ReportComparison session={session} preview={preview} />
          <button
            className="report-quiet-action"
            disabled={!report.recovered}
            onClick={() => act(() => downloadMissionLog(session))}
          >
            Export log
          </button>
        </details>
      </div>
      <footer className="moon-report-footer">
        <button
          className="report-quiet-action"
          disabled={!report.recovered}
          onClick={() => act(() => downloadMissionCard(session))}
        >
          Save result
        </button>
        <div className="report-navigation-actions">
          {onHome && (
            <button className="report-home-action" onClick={() => act(onHome)}>
              Home
            </button>
          )}
          {onRetry && (
            <button
              className="report-retry-action"
              onClick={() => act(onRetry)}
            >
              Try another mission
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
