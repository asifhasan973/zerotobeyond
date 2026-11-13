/** Earth-centred two-body inbound coast, km/s. Lunar departure is a patched boundary,
 * not an ephemeris solution; solar/lunar perturbations and atmospheric lift are omitted. */
export const RETURN_REFERENCE = {
  earthRadiusKm: 6371,
  mu: 398600.4418,
  moonDistanceKm: 384400,
  perigeeKm: 6401,
  apogeeKm: 600000,
  entryAltitudeKm: 121.92,
  drogueAltitudeKm: 7.3152,
  mainAltitudeKm: 3.048,
} as const;
const a = (RETURN_REFERENCE.perigeeKm + RETURN_REFERENCE.apogeeKm) / 2;
const e = (RETURN_REFERENCE.apogeeKm - RETURN_REFERENCE.perigeeKm) / (2 * a);
const n = Math.sqrt(RETURN_REFERENCE.mu / a ** 3);
const anomaly = (radius: number) =>
  2 * Math.PI - Math.acos((1 - radius / a) / e);
const mean = (E: number) => E - e * Math.sin(E);
const start = mean(anomaly(RETURN_REFERENCE.moonDistanceKm));
const end = mean(
  anomaly(RETURN_REFERENCE.earthRadiusKm + RETURN_REFERENCE.entryAltitudeKm),
);
export const RETURN_COAST_SECONDS = (end - start) / n;
export function sampleReturnTrajectory(fraction: number) {
  const f = Math.max(0, Math.min(1, fraction));
  const M = start + (end - start) * f;
  // Bracket the inbound half-orbit. Newton iteration alone can diverge
  // close to perigee on this high-eccentricity trajectory.
  let lo = Math.PI,
    hi = 2 * Math.PI;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (mean(mid) < M) lo = mid;
    else hi = mid;
  }
  const E = (lo + hi) / 2;
  const radius = a * (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e),
    y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const dE = n / (1 - e * Math.cos(E));
  const vx = -a * Math.sin(E) * dE,
    vy = a * Math.sqrt(1 - e * e) * Math.cos(E) * dE;
  return {
    position: [x, y, 0] as [number, number, number],
    velocity: [vx, vy, 0] as [number, number, number],
    altitudeKm: radius - RETURN_REFERENCE.earthRadiusKm,
    speedKmS: Math.hypot(vx, vy),
    elapsedSeconds: RETURN_COAST_SECONDS * f,
  };
}
