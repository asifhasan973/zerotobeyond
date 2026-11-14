import { Link } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, Rocket } from "lucide-react";
import { SOLAR_ASSETS } from "../assetRegistry";
interface Props {
  ready: boolean;
  error: boolean;
  onStart(): void;
  onRetry(): void;
  onSources(): void;
}
export function SolarWelcome(p: Props) {
  return (
    <section className="solar-welcome" aria-labelledby="solar-welcome-title">
      <div className="solar-welcome-backdrop" aria-hidden="true">
        <img src={SOLAR_ASSETS.welcome} alt="" fetchPriority="high" />
      </div>
      <header>
        <Link to="/" aria-label="Back to mission control">
          <ArrowLeft size={18} />
          Back to home
        </Link>
        <button onClick={p.onSources}>
          <BookOpen size={17} />
          Sources & credits
        </button>
      </header>
      <main className="solar-welcome-layout">
        <div className="solar-welcome-copy">
          <span className="solar-welcome-eyebrow">
            <span /> COSMIC EXPLORER
          </span>
          <h1 id="solar-welcome-title">
            Explore our
            <br />
            <em>Solar System.</em>
          </h1>
          <p>
            Explore the planets. Discover how far they are,
            <br className="solar-welcome-break" /> and how long the journey
            could take.
          </p>
          <div className="solar-welcome-actions">
            <button
              className="solar-launch-button"
              disabled={!p.ready || p.error}
              onClick={p.onStart}
            >
              <Rocket size={19} />
              {p.ready ? "Let’s travel" : "Getting ready…"}
              <ArrowRight size={19} />
            </button>
            <span>Depart from Earth. Find your next horizon.</span>
          </div>
          {p.error ? (
            <p className="solar-welcome-error" role="alert">
              We couldn’t load the destinations.{" "}
              <button onClick={p.onRetry}>Try again</button>
            </p>
          ) : (
            <small className="solar-welcome-hint">
              Real NASA/JPL positions. Travel times are comparisons.
            </small>
          )}
        </div>
      </main>
      <footer>
        Inspired by{" "}
        <a
          href="https://eyes.nasa.gov/apps/solar-system/"
          target="_blank"
          rel="noreferrer"
        >
          NASA’s Eyes on the Solar System ↗
        </a>
        <span>·</span>Position data:{" "}
        <a
          href="https://ssd.jpl.nasa.gov/horizons/"
          target="_blank"
          rel="noreferrer"
        >
          NASA/JPL Horizons ↗
        </a>
      </footer>
    </section>
  );
}
