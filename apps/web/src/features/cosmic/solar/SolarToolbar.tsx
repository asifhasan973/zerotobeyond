import { Plus, Minus, SlidersHorizontal, Move, Orbit } from "lucide-react";
interface Props {
  onZoom(factor: number): void;
  onView(): void;
  onOverview(): void;
  onPan(): void;
  pan: boolean;
  settings: boolean;
}
export function SolarToolbar(p: Props) {
  return (
    <nav className="solar-toolbar" aria-label="3D view controls">
      <div className="solar-zoom-pair">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => p.onZoom(0.65)}
        >
          <Plus />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => p.onZoom(1.55)}
        >
          <Minus />
        </button>
      </div>
      <button
        title={p.pan ? "Switch to orbit" : "Switch to pan"}
        aria-label="Pan view"
        aria-pressed={p.pan}
        onClick={p.onPan}
      >
        <Move />
      </button>
      <button
        title="Show entire Solar System"
        aria-label="Show entire Solar System"
        onClick={p.onOverview}
      >
        <Orbit />
      </button>
      <button
        title="View settings"
        aria-label="View settings"
        aria-expanded={p.settings}
        onClick={p.onView}
      >
        <SlidersHorizontal />
      </button>
    </nav>
  );
}
