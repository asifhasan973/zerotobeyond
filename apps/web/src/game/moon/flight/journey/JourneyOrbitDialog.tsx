import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Orbit, X } from "lucide-react";
import { LUNAR_ORBIT_TIERS, type LunarOrbitTierId } from "./transferModel";
import { routeReport } from "./journey";
import type { MoonSession } from "@/game/moon/shared/session";

export function JourneyOrbitDialog({
  moon,
  onSelect,
  onConfirm,
  onCancel,
}: {
  moon: MoonSession;
  onSelect(tier: LunarOrbitTierId): void;
  onConfirm(): void;
  onCancel(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const selected = moon.journey.orbitTier ?? "low";
  const route = moon.journey.route;
  return createPortal(
    <dialog
      ref={dialog}
      className="journey-orbit-dialog hud-modal-container"
      aria-labelledby="journey-orbit-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <header>
        <Orbit size={28} aria-hidden="true" />
        <div>
          <h2 id="journey-orbit-title">Choose your lunar orbit</h2>
          <p>Arrival target · locked at departure</p>
        </div>
        <button
          type="button"
          aria-label="Cancel orbit selection"
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </header>
      <div
        className="journey-orbit-options"
        role="radiogroup"
        aria-label="Target lunar orbit"
      >
        {Object.values(LUNAR_ORBIT_TIERS).map((tier) => {
          const report = route
            ? routeReport(
                { ...moon, journey: { ...moon.journey, orbitTier: tier.id } },
                route,
              )
            : null;
          return (
            <button
              type="button"
              role="radio"
              key={tier.id}
              aria-checked={selected === tier.id}
              onClick={() => onSelect(tier.id)}
            >
              <strong>
                {tier.altitudeKm} km{" "}
                <span>
                  {tier.id === "low"
                    ? "Low"
                    : tier.id === "mid"
                      ? "Mid"
                      : "High"}{" "}
                  orbit
                </span>
              </strong>
              <span>
                Arrival burn {Math.round(report?.loiMS ?? 0)} m/s ·{" "}
                {((report?.loiFuelKg ?? 0) / 1000).toFixed(1)} t fuel
              </span>
              <small>
                {tier.id === "low"
                  ? "More capture fuel · shorter descent"
                  : tier.id === "mid"
                    ? "Balanced capture fuel and descent"
                    : "Less capture fuel · longer descent"}
              </small>
              {!report?.feasible ? (
                <em>Insufficient fuel, energy or supplies</em>
              ) : null}
            </button>
          );
        })}
      </div>
      <footer>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="conversation-next"
          disabled={!route || !routeReport(moon, route).feasible}
          onClick={onConfirm}
        >
          Confirm orbit
        </button>
      </footer>
    </dialog>,
    document.body,
  );
}
