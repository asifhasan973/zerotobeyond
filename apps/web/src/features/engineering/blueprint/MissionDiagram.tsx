import type { MissionDraft, MissionResult } from "@exo/engine/engineering";
export function MissionDiagram({
  draft,
  result,
}: {
  draft: MissionDraft;
  result: MissionResult | null;
}) {
  const selected =
    draft.instrumentIds.map((id) => id.toUpperCase()).join(" + ") ||
    "No instruments";
  return (
    <figure className="bp-diagram">
      <figcaption>
        <strong>Your mission architecture</strong>
        <span>Power in. Science out.</span>
      </figcaption>
      <svg
        viewBox="0 0 600 294"
        role="img"
        aria-labelledby="bp-diagram-title bp-diagram-description"
      >
        <title id="bp-diagram-title">
          Spacecraft power and science data flow
        </title>
        <desc id="bp-diagram-description">
          Solar array and battery supply the spacecraft bus. Selected
          instruments generate data for storage. The transmitter returns stored
          data to Earth during assumed contact windows.
        </desc>
        <defs>
          <marker
            id="bp-arrow-power"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--bp-mint)" />
          </marker>
          <marker
            id="bp-arrow-data"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--bp-amber)" />
          </marker>
        </defs>
        <g className="bp-power-line" markerEnd="url(#bp-arrow-power)">
          <path d="M 184 67 H 222" />
          <path d="M 416 67 H 378" />
          <path d="M 300 102 V 128 H 107 V 159" />
          <path d="M 300 128 H 493 V 159" />
        </g>
        <g className="bp-data-line" markerEnd="url(#bp-arrow-data)">
          <path d="M 184 194 H 222" />
          <path d="M 378 194 H 416" />
          <path d="M 493 229 V 257 H 300" />
        </g>
        <g className="bp-node">
          <rect x="30" y="32" width="154" height="70" rx="10" />
          <rect x="222" y="32" width="156" height="70" rx="10" />
          <rect x="416" y="32" width="154" height="70" rx="10" />
          <rect x="30" y="159" width="154" height="70" rx="10" />
          <rect x="222" y="159" width="156" height="70" rx="10" />
          <rect x="416" y="159" width="154" height="70" rx="10" />
        </g>
        <g className="bp-diagram-titles" textAnchor="middle">
          <text x="107" y="59">
            Solar array
          </text>
          <text x="300" y="59">
            Spacecraft bus
          </text>
          <text x="493" y="59">
            Battery
          </text>
          <text x="107" y="186">
            {selected}
          </text>
          <text x="300" y="186">
            Science storage
          </text>
          <text x="493" y="186">
            Transmitter
          </text>
        </g>
        <g className="bp-diagram-values" textAnchor="middle">
          <text x="107" y="82">
            {Number.isFinite(draft.solarW) ? draft.solarW : "—"} W · assumed
          </text>
          <text x="300" y="82">
            60 W · assumed
          </text>
          <text x="493" y="82">
            {Number.isFinite(draft.batteryWh) ? draft.batteryWh : "—"} Wh ·
            assumed
          </text>
          <text x="107" y="209">
            NASA LRO allocations
          </text>
          <text x="300" y="209">
            {Number.isFinite(draft.storageGbit) ? draft.storageGbit : "—"} Gbit
            · assumed
          </text>
          <text x="493" y="209">
            {Number.isFinite(draft.transmitterW) ? draft.transmitterW : "—"} W
            electrical
          </text>
        </g>
        <text x="287" y="263" textAnchor="end" className="bp-earth-label">
          Earth ·{" "}
          {result
            ? `${result.deliveredGbit.toFixed(1)} Gbit returned`
            : "awaiting valid inputs"}
        </text>
      </svg>
      <div className="bp-diagram-legend">
        <span>
          <i />
          Electrical supply
        </span>
        <span>
          <i />
          Science data
        </span>
      </div>
    </figure>
  );
}
