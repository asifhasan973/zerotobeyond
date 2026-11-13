import { Download, Printer, FileCheck2 } from "lucide-react";
import { MISSION_OBJECTIVES } from "@exo/engine/engineering";
import type { BlueprintState } from "./useBlueprint";
import {
  buildBlueprintReport,
  BLUEPRINT_DERIVATIONS,
  downloadBlueprint,
  printBlueprint,
} from "./report";
import { MissionDiagram } from "./MissionDiagram";
import { SourceLink } from "./SourcesPanel";
export function BlueprintPanel({
  state,
  onSource,
}: {
  state: BlueprintState;
  onSource: (id: string) => void;
}) {
  const { draft, geometry, baseline, result } = state;
  if (!result)
    return (
      <p>
        Load matching NASA geometry and complete valid inputs before exporting
        your blueprint.
      </p>
    );
  const report = () => buildBlueprintReport(draft, geometry, baseline);
  return (
    <section>
      <div className="bp-document-heading">
        <FileCheck2 size={28} aria-hidden="true" />
        <div>
          <h2>Your first mission blueprint.</h2>
          <p>A traceable concept to discuss, revise and develop further.</p>
        </div>
      </div>
      <div className="bp-document-summary">
        <h3>{draft.name}</h3>
        <p>
          {MISSION_OBJECTIVES[draft.objective].name} · 24-hour study ·{" "}
          {draft.date} TDB
        </p>
        <span className={`bp-label ${result.passed ? "" : "bp-label-amber"}`}>
          {result.passed
            ? "Concept checks pass"
            : "Draft with unresolved constraints"}
        </span>
      </div>
      <MissionDiagram draft={draft} result={result} />
      <div className="bp-export-actions">
        <button
          className="bp-primary"
          onClick={() => {
            downloadBlueprint(report());
            state.setMessage(
              "JSON exported with complete inputs, NASA vectors, sources, derivations and comparison.",
            );
          }}
        >
          <Download size={16} aria-hidden="true" />
          Export JSON
        </button>
        <button
          onClick={() =>
            state.setMessage(
              printBlueprint(report())
                ? "Report opened. Choose Save as PDF in the print dialog; the source and calculation map are included."
                : "The report window was blocked. Allow pop-ups for this site and try again; JSON export remains available.",
            )
          }
        >
          <Printer size={16} aria-hidden="true" />
          Print / Save PDF
        </button>
      </div>
      <p className="bp-small">
        Both reports include equipment, resource budgets, review findings, NASA
        query details, assumptions, source mapping and open engineering
        requirements. JSON also contains the full vectors and pinned comparison.
      </p>
      <div className="bp-section-heading">
        <h3>Calculation → source map</h3>
        <SourceLink id="mdl" onSource={onSource}>
          Review structure · NASA MDL
        </SourceLink>
      </div>
      <div className="bp-derivations">
        {BLUEPRINT_DERIVATIONS.map((v) => (
          <details key={v.output}>
            <summary>{v.output}</summary>
            <p>{v.calculation}</p>
            <div className="bp-source-buttons">
              {v.sources.map((id) => (
                <SourceLink key={id} id={id} onSource={onSource}>
                  {id === "horizons"
                    ? "NASA API"
                    : id === "lro-2007"
                      ? "NASA LRO paper"
                      : id === "mdl"
                        ? "NASA MDL"
                        : "Lab assumptions"}
                </SourceLink>
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="bp-goal-rule">
        <h3>What still needs engineering?</h3>
        <p>
          Launch and propulsion, validated orbit and station access, thermal and
          radiation protection, detailed radio design, hardware reliability and
          real procurement costs.
        </p>
      </div>
    </section>
  );
}
