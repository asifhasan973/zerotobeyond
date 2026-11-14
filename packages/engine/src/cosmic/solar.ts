import { AU_KM, C_KMS } from "./index";

/** Equatorial ICRF kilometres to a Three.js ecliptic scene, in AU (Y is north). */
export function solarCoordinates(
  position: readonly number[],
): [number, number, number] {
  const obliquity = (23.43928 * Math.PI) / 180;
  const y =
    position[1] * Math.cos(obliquity) + position[2] * Math.sin(obliquity);
  const z =
    -position[1] * Math.sin(obliquity) + position[2] * Math.cos(obliquity);
  return [position[0] / AU_KM, z / AU_KM, -y / AU_KM];
}
/** Constant-speed comparison, not a moving-target rendezvous or propulsion model. */
export function solarTravel(
  distanceKm: number,
  speedKmS: number,
  departureMs: number,
) {
  if (
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    !Number.isFinite(speedKmS) ||
    speedKmS <= 0 ||
    speedKmS > C_KMS ||
    !Number.isFinite(departureMs)
  )
    return null;
  const seconds = distanceKm / speedKmS;
  const arrivalMs = departureMs + seconds * 1000;
  if (Math.abs(arrivalMs) > 8.64e15) return null;
  return { seconds, arrivalMs };
}
export function solarDateBounds(objects: { samples?: { jd: number }[] }[]) {
  const sampled = objects.filter((o) => o.samples?.length);
  if (!sampled.length) return null;
  const min = Math.max(...sampled.map((o) => o.samples![0].jd));
  const max = Math.min(...sampled.map((o) => o.samples!.at(-1)!.jd));
  return min <= max ? { min, max } : null;
}

/** Stops at snapshot boundaries instead of leaving a running clock on a frozen date. */
export function advanceSolarClock(
  jd: number,
  rate: number,
  elapsedSeconds: number,
  bounds: { min: number; max: number },
  currentJd?: number,
) {
  const target = currentJd ?? jd + (elapsedSeconds * rate) / 86400;
  const next = Math.max(bounds.min, Math.min(bounds.max, target));
  const atLimit =
    (rate > 0 && target >= bounds.max) || (rate < 0 && target <= bounds.min);
  return { jd: next, rate: atLimit ? 0 : rate, atLimit };
}
