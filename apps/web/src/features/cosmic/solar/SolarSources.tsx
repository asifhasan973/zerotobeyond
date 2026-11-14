import { useEffect, useRef } from "react";
import { ArrowUpRight, BookOpen, X } from "lucide-react";
interface Props {
  open: boolean;
  onClose(): void;
  bounds: { min: number; max: number } | null;
}
const date = (jd: number) =>
  new Date((jd - 2440587.5) * 86400000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
export function SolarSources(p: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (p.open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [p.open]);
  return (
    <dialog
      ref={dialog}
      className="solar-sources-dialog"
      aria-labelledby="solar-sources-title"
      onCancel={p.onClose}
    >
      <header>
        <span>
          <BookOpen size={20} />
          <h2 id="solar-sources-title">Sources & credits</h2>
        </span>
        <button aria-label="Close sources" onClick={p.onClose}>
          <X size={20} />
        </button>
      </header>
      <p>The science and inspiration behind your adventure.</p>
      <a
        className="solar-source-card"
        href="https://eyes.nasa.gov/apps/solar-system/"
        target="_blank"
        rel="noreferrer"
      >
        <small>DESIGN INSPIRATION</small>
        <strong>
          NASA’s Eyes on the Solar System <ArrowUpRight size={17} />
        </strong>
        <span>Explore the original NASA/JPL interactive website.</span>
      </a>
      <a
        className="solar-source-card"
        href="https://ssd.jpl.nasa.gov/horizons/"
        target="_blank"
        rel="noreferrer"
      >
        <small>PLANET & SPACECRAFT POSITIONS</small>
        <strong>
          NASA/JPL Horizons <ArrowUpRight size={17} />
        </strong>
        <span>
          {p.bounds
            ? `Bundled data: ${date(p.bounds.min)} – ${date(p.bounds.max)} TDB.`
            : "Dated planetary and spacecraft ephemerides."}{" "}
          Spacecraft locations are predicted or reconstructed, rather than live
          telemetry.
        </span>
      </a>
      <div className="solar-source-media">
        <h3>Images & models</h3>
        <p>
          Earth: NASA Blue Marble. Moon: NASA/LROC. Other planet maps:{" "}
          <a
            href="https://www.solarsystemscope.com/textures/"
            target="_blank"
            rel="noreferrer"
          >
            Solar System Scope / INOVE, CC BY 4.0 ↗
          </a>
          ; some are colour-enhanced. Spacecraft cards:{" "}
          <a href="https://images.nasa.gov/" target="_blank" rel="noreferrer">
            NASA Image Library ↗
          </a>{" "}
          and NASA mission pages.
        </p>
        <p>
          Welcome artwork: AI-generated for Zero To Beyond using the project’s
          existing crew characters. The scene is illustrative.
        </p>
        <p>
          This explorer is built by Zero To Beyond using Three.js. Spacecraft
          models, rings and background stars are illustrative. Travel times
          compare a fixed separation and constant speed; they do not predict an
          actual launch.
        </p>
      </div>
    </dialog>
  );
}
