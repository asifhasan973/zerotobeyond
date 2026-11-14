import { X, SlidersHorizontal } from "lucide-react";
interface Props {
  orbits: boolean;
  labels: boolean;
  lighting: boolean;
  onOrbits(): void;
  onLabels(): void;
  onLighting(): void;
  onClose(): void;
  onCompare(): void;
}
export function SolarViewSettings(p: Props) {
  return (
    <section className="solar-view-settings" aria-labelledby="solar-view-title">
      <header>
        <h2 id="solar-view-title">
          <SlidersHorizontal size={16} />
          View settings
        </h2>
        <button aria-label="Close view settings" onClick={p.onClose}>
          <X size={17} />
        </button>
      </header>
      <label>
        Orbit paths
        <input type="checkbox" checked={p.orbits} onChange={p.onOrbits} />
      </label>
      <label>
        Object labels
        <input type="checkbox" checked={p.labels} onChange={p.onLabels} />
      </label>
      <label>
        Natural lighting
        <input type="checkbox" checked={p.lighting} onChange={p.onLighting} />
      </label>
      <button className="solar-read-more" onClick={p.onCompare}>
        Compare planet sizes
      </button>
      <p>
        Drag to orbit. Right-drag or use Pan to move sideways. Scroll or pinch
        to zoom.
      </p>
    </section>
  );
}
