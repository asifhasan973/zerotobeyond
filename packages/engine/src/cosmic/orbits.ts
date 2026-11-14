import type { CosmicObject } from "@exo/data/cosmic";
type V = [number, number, number];
const dot = (a: V, b: V) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const scale = (a: V, s: number): V => a.map((v) => v * s) as V;
/** Two-body guide inferred from a centred Horizons finite-difference state.
 * Solar GM: https://ssd.jpl.nasa.gov/astro_par.html (km³/s²).
 * This is an illustrative osculating ellipse, never a mission trajectory.
 */
export function orbitGuide(object: CosmicObject): V[] {
  const s = object.samples;
  if (object.kind !== "planet" || !s || s.length < 3) return [];
  const i = Math.floor(s.length / 2),
    r = s[i].position;
  const v = r.map(
    (_, k) =>
      (s[i + 1].position[k] - s[i - 1].position[k]) /
      ((s[i + 1].jd - s[i - 1].jd) * 86400),
  ) as V;
  const mu = 132712440041.27942,
    h = cross(r, v),
    radius = Math.hypot(...r);
  const eccentric = cross(v, h).map((x, k) => x / mu - r[k] / radius) as V;
  const e = Math.hypot(...eccentric);
  if (!Number.isFinite(e) || e >= 1 || e < 1e-8) return [];
  const x = scale(eccentric, 1 / e),
    z = scale(h, 1 / Math.hypot(...h)),
    y = cross(z, x),
    p = dot(h, h) / mu;
  return Array.from({ length: 257 }, (_, i) => {
    const f = (i / 256) * Math.PI * 2,
      d = p / (1 + e * Math.cos(f));
    return x.map((a, k) => d * (a * Math.cos(f) + y[k] * Math.sin(f))) as V;
  });
}
