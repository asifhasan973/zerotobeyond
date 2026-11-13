import { ENGINEERING_SOURCES } from "@exo/data/engineering";
import type { HorizonsSnapshot } from "@exo/data/engineering";
import { evaluateMission, MISSION_OBJECTIVES } from "@exo/engine/engineering";
import type { MissionDraft } from "@exo/engine/engineering";
import type { SavedDesign } from "./useBlueprint";
export const BLUEPRINT_DERIVATIONS = [
  {
    output: "Payload mass and power",
    sources: ["lro-2007"],
    calculation:
      "Sum selected instrument allocations from Table 7. Treat orbit-average power allocations as constant throughout the educational run.",
  },
  {
    output: "Planned science volume",
    sources: ["lro-2007", "assumptions"],
    calculation:
      "Table 2 Gbit/day × observationMinutes / 120. LROC combines NAC and WAC. During powered observation minutes, generate at the published daily-average rate / 1440.",
  },
  {
    output: "Spacecraft mass (kg)",
    sources: ["lro-2007", "assumptions"],
    calculation:
      "120 kg bus + 3 kg radio + 1 kg storage + batteryWh / 120 + solarW / 50 + selected instrument masses. Storage and radio mass are fixed in this simplified model.",
  },
  {
    output: "Simulation credits",
    sources: ["assumptions"],
    calculation:
      "140 bus + batteryWh × 0.06 + solarW × 0.08 + storageGbit × 0.8 + transmitterW × 0.5 + instrument credits (LROC 35; LOLA 25). Not real procurement cost.",
  },
  {
    output: "Energy timeline",
    sources: ["lro-2007", "assumptions"],
    calculation:
      "Minute demand = (60 W bus + payload allocation W + electrical transmitter W during active downlink) / 60. Solar first supplies loads; battery charge/discharge efficiencies = 90%/95%. Battery starts full and is limited to capacity. Reserve threshold = 20%.",
  },
  {
    output: "Distance and delay",
    sources: ["horizons"],
    calculation:
      "Linearly interpolate hourly Earth-centered Moon vectors; distance = hypot(X,Y,Z) km. One-way vacuum delay = distance / 299792.458 seconds. Displayed link values are at 12:00 TDB; simulation evaluates each minute.",
  },
  {
    output: "Radio capacity",
    sources: ["horizons", "assumptions"],
    calculation:
      "FSPL = 20 log10(4π × distanceKm × 1000 × 32e9 / 299792458). Received dBW = 10 log10(transmitter electrical W × 0.3) + 30 + 60 − FSPL − 3. Mbps = min(100, 10 × 10^((received dBW + 140) / 10)). This assumes fixed gains, bandwidth/noise conditions and proportional power-limited rate, not a validated communications design.",
  },
  {
    output: "Stored and returned science",
    sources: ["lro-2007", "horizons", "assumptions"],
    calculation:
      "Shared storage accepts new science until full; excess is lost. During assumed contacts, downlink at the geometry-dependent capacity, capped by stored data. Storage and downlink are allocated proportionally across instruments. Power shortage stops science/downlink for that minute.",
  },
  {
    output: "Concept review",
    sources: ["mdl", "assumptions"],
    calculation:
      "Check required instruments, mass and credit limits, zero unserved energy, ≥20% battery reserve, zero storage overflow, and ≥80% of each required payload's planned volume returned. No official NASA maturity score is assigned.",
  },
];
export function buildBlueprintReport(
  draft: MissionDraft,
  geometry: HorizonsSnapshot,
  baseline: SavedDesign | null,
) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: "mission-blueprint-v1",
    scope:
      "Educational early mission concept: 24-hour science/power/data study with assumed orbit and contacts. Not flight-qualified or a complete mission design.",
    mission: structuredClone(draft),
    geometry: structuredClone(geometry),
    result: evaluateMission(draft, geometry),
    baseline: baseline
      ? {
          ...structuredClone(baseline),
          result: evaluateMission(baseline.draft, baseline.geometry),
        }
      : null,
    sources: ENGINEERING_SOURCES,
    derivations: BLUEPRINT_DERIVATIONS,
    openRequirements: [
      "Launch and propulsion sizing",
      "Validated orbit, eclipse and ground-station access",
      "Detailed radio noise, coding and pointing",
      "Thermal and radiation protection",
      "Hardware reliability, margins and real costs",
    ],
  };
}
export type BlueprintReport = ReturnType<typeof buildBlueprintReport>;
export function downloadBlueprint(report: BlueprintReport) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mission-blueprint.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escapeHtml = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function blueprintReportHtml(report: BlueprintReport) {
  const { mission: d, result: r, geometry: g } = report;
  const e = escapeHtml;
  const n = (v: number) => v.toFixed(2);
  const dl = (pairs: [string, unknown][]) =>
    `<dl>${pairs.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join("")}</dl>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${e(d.name)} — Mission Blueprint</title><style>@page{size:A4;margin:17mm}*{box-sizing:border-box}body{font:12px/1.55 system-ui,sans-serif;color:#241932;max-width:900px;margin:30px auto;padding:0 20px}h1{font-size:30px;line-height:1.15}h2{font-size:19px;border-bottom:1px solid #aaa;padding-bottom:5px;margin-top:28px}h3{font-size:14px}a{color:#443276;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:170px 1fr;gap:5px 14px}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}.architecture{padding:14px;background:#f1edf5;border:1px solid #ddd;line-height:2}.source{break-inside:avoid;margin:18px 0}.muted{color:#594d65}li{margin:6px 0}footer{margin-top:30px;font-size:10px}@media print{body{padding:0;margin:0;max-width:none}h2,h3{break-after:avoid}tr{break-inside:avoid}}</style></head><body>
  <p>ZERO TO BEYOND · ENGINEERING LAB</p><h1>${e(d.name)}</h1><p>${e(report.scope)}</p>
  ${dl([
    ["Science objective", MISSION_OBJECTIVES[d.objective].name],
    ["Mission date", `${d.date} TDB`],
    ["Duration / orbit", "24 hours / assumed 120-minute orbit"],
    [
      "Concept review",
      r.passed ? "Checks pass within model scope" : "Revision required",
    ],
    ["Generated", report.generatedAt],
  ])}
  <h2>Mission architecture</h2><div class="architecture">Solar array + battery → spacecraft bus → ${e(d.instrumentIds.map((id) => id.toUpperCase()).join(" + ") || "no payload")} → science storage → transmitter → Earth</div>
  <h2>Equipment, schedule & resource limits</h2>${dl([
    ["Selected payload", d.instrumentIds.join(", ")],
    ["Battery / solar", `${d.batteryWh} Wh / ${d.solarW} W`],
    [
      "Storage / transmitter",
      `${d.storageGbit} Gbit / ${d.transmitterW} W electrical`,
    ],
    [
      "Observe / downlink",
      `${d.observationMinutes} / ${d.contactMinutes} min per orbit`,
    ],
    [
      "Mass / budget limits",
      `${d.massLimitKg} kg / ${d.creditLimit} simulation credits`,
    ],
  ])}
  <h2>Calculated results</h2>${dl([
    ["Spacecraft mass", `${n(r.massKg)} kg`],
    ["Resource budget", `${n(r.credits)} simulation credits`],
    ["Minimum / reserve battery", `${n(r.minimumWh)} / ${n(r.reserveWh)} Wh`],
    ["Unserved energy", `${n(r.unmetWh)} Wh`],
    [
      "Planned / returned science",
      `${n(r.plannedGbit)} / ${n(r.deliveredGbit)} Gbit`,
    ],
    ["Stored / lost science", `${n(r.storedGbit)} / ${n(r.lostGbit)} Gbit`],
    [
      "Midpoint distance / signal delay",
      `${n(r.distanceKm)} km / ${n(r.delaySeconds)} s`,
    ],
    [
      "Midpoint path loss / downlink",
      `${n(r.pathLossDb)} dB / ${n(r.downlinkMbps)} Mbps`,
    ],
  ])}
  <h2>Review & recommendations</h2><ul>${r.checks.map((c) => `<li><strong>${c.passed ? "PASS" : "REVISE"} · ${e(c.title)}</strong> — ${e(c.detail)}</li>`).join("")}</ul>
  <h2>Instrument science account</h2><table><thead><tr><th>Payload</th><th>Planned</th><th>Produced</th><th>Returned</th><th>Stored</th><th>Lost (Gbit)</th></tr></thead><tbody>${r.payloads.map((p) => `<tr><td>${e(p.id.toUpperCase())}</td><td>${n(p.plannedGbit)}</td><td>${n(p.producedGbit)}</td><td>${n(p.deliveredGbit)}</td><td>${n(p.storedGbit)}</td><td>${n(p.lostGbit)}</td></tr>`).join("")}</tbody></table>
  ${
    report.baseline
      ? `<h2>Design A comparison</h2>${dl([
          ["Pinned design", report.baseline.draft.name],
          [
            "A date / pinned at",
            `${report.baseline.draft.date} TDB / ${report.baseline.savedAt}`,
          ],
          [
            "A → B mass",
            `${n(report.baseline.result.massKg)} → ${n(r.massKg)} kg`,
          ],
          [
            "A → B credits",
            `${n(report.baseline.result.credits)} → ${n(r.credits)}`,
          ],
          [
            "A → B minimum battery",
            `${n(report.baseline.result.minimumWh)} → ${n(r.minimumWh)} Wh`,
          ],
          [
            "A → B returned data",
            `${n(report.baseline.result.deliveredGbit)} → ${n(r.deliveredGbit)} Gbit`,
          ],
        ])}<p>See JSON export for both complete designs and their exact NASA snapshots. Different dates or multiple changed inputs are not a controlled one-variable experiment.</p>`
      : ""
  }
  <h2>NASA API provenance</h2>${dl([
    ["Target / center", `${g.target} / ${g.center}`],
    ["Frame / time / units", `${g.frame} / ${g.timeScale} / ${g.units}`],
    [
      "Prediction date / samples",
      `${g.date} / ${g.samples.length} hourly vectors`,
    ],
    ["Retrieved / API version", `${g.retrievedAt} / ${g.apiVersion}`],
  ])}<p><a href="${e(g.queryUrl)}">${e(g.queryUrl)}</a></p>
  <h2>Sources and exactly where they are used</h2>${report.sources.map((s) => `<section class="source"><h3>${e(s.title)}</h3><p class="muted">${e(s.kind)} · ${e(s.location)}</p>${s.url ? `<a href="${e(s.url)}">${e(s.url)}</a>` : ""}<p>${e(s.values)}</p><p><strong>Used in:</strong> ${e(s.usedIn.join("; "))}</p><p><strong>Limits:</strong> ${e(s.limitations)}</p></section>`).join("")}
  <h2>Calculation map</h2>${report.derivations.map((v) => `<section class="source"><h3>${e(v.output)}</h3><p>Sources: ${e(v.sources.join(", "))}</p><p>${e(v.calculation)}</p></section>`).join("")}
  <h2>Open engineering requirements</h2><ul>${report.openRequirements.map((v) => `<li>${e(v)}</li>`).join("")}</ul><footer>${e(report.model)} · NASA-sourced references and lab assumptions are distinguished throughout. This report does not imply NASA endorsement.</footer></body></html>`;
}
export function printBlueprint(report: BlueprintReport): boolean {
  const preview = window.open("", "_blank");
  if (!preview) return false;
  preview.opener = null;
  preview.document.open();
  preview.document.write(blueprintReportHtml(report));
  preview.document.close();
  preview.focus();
  setTimeout(() => preview.print(), 300);
  return true;
}
