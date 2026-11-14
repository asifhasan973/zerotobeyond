import { useState } from "react";
import type { CosmicObject } from "@exo/data/cosmic";
export function SizeComparison({ objects }: { objects: CosmicObject[] }) {
  const [sun, setSun] = useState(false);
  const bodies = objects.filter(
    (o) =>
      (o.kind === "planet" || o.kind === "moon" || (sun && o.id === "10")) &&
      o.radiusKm,
  );
  const largest = Math.max(...bodies.map((o) => o.radiusKm!));
  return (
    <section className="cosmic-size-comparison">
      <h3>Actual size comparison</h3>
      <label>
        <input
          type="checkbox"
          checked={sun}
          onChange={(e) => setSun(e.target.checked)}
        />
        Include Sun
      </label>
      <p>
        Diameters share one linear scale. Distances are omitted. Stellar radii
        are unavailable.
      </p>
      <div className="cosmic-size-row">
        {bodies.map((o) => (
          <figure
            key={o.id}
            style={{ minWidth: Math.max(60, (o.radiusKm! / largest) * 120) }}
          >
            <div
              style={{
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  display: "block",
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: o.color,
                  width: (o.radiusKm! / largest) * 120,
                  height: (o.radiusKm! / largest) * 120,
                }}
              />
            </div>
            <figcaption>
              {o.name}
              <small>{(o.radiusKm! * 2).toLocaleString("en")} km</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
