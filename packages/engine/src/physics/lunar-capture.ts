export const LUNAR_MU = 4902.800118;
export const LUNAR_RADIUS_KM = 1737.4;

/** Preserve arrival energy when moving the educational perilune target. */
export function lunarArrival(speedAt100Km: number, altitudeKm: number) {
  const radius = LUNAR_RADIUS_KM + altitudeKm;
  const speedKmS = Math.sqrt(
    Math.max(
      0,
      speedAt100Km ** 2 +
        2 * LUNAR_MU * (1 / radius - 1 / (LUNAR_RADIUS_KM + 100)),
    ),
  );
  const circularKmS = Math.sqrt(LUNAR_MU / radius);
  return {
    speedKmS,
    circularKmS,
    deltaVMS: Math.max(0, (speedKmS - circularKmS) * 1000),
  };
}

/** Osculating two-body orbit at the selected lunar perilune. */
export function captureOrbit(
  speed: number,
  tangentialBurn: number,
  radialBurn: number,
  altitudeKm = 100,
) {
  const mu = 4902.800118,
    r = LUNAR_RADIUS_KM + altitudeKm,
    vt = speed - tangentialBurn / 1000,
    vr = radialBurn / 1000;
  const energy = (vt * vt + vr * vr) / 2 - mu / r,
    h = r * vt,
    e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu)));
  return {
    bound: energy < 0,
    periapsisKm: (h * h) / (mu * (1 + e)) - 1737.4,
    apoapsisKm: energy < 0 ? (-mu / (2 * energy)) * (1 + e) - 1737.4 : Infinity,
  };
}
