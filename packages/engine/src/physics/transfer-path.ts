import { LUNAR_RADIUS_KM } from "./lunar-capture";

/** Display-space transfer geometry; distances are thousands of kilometres. */
export type FlightVector = [number, number, number];
const add = (a: FlightVector, b: FlightVector): FlightVector =>
  a.map((v, i) => v + b[i]) as FlightVector;
const sub = (a: FlightVector, b: FlightVector): FlightVector =>
  a.map((v, i) => v - b[i]) as FlightVector;
const scale = (a: FlightVector, s: number): FlightVector =>
  a.map((v) => v * s) as FlightVector;
const norm = (v: FlightVector): FlightVector =>
  scale(v, 1 / (Math.hypot(...v) || 1));
const dot = (a: FlightVector, b: FlightVector) =>
  a.reduce((s, v, i) => s + v * b[i], 0);
const display = (p: number[]): FlightVector => [
  p[0] / 1000,
  p[2] / 1000,
  -p[1] / 1000,
];
export interface TransferPath {
  points: FlightVector[];
  tangents: FlightVector[];
  moon: FlightVector;
  radial: FlightVector;
  along: FlightVector;
  radius: number;
}

/** Join the sampled transfer to a circular lunar arc with a shared tangent. */
export function createTransferPath(
  source: number[][],
  moonPosition: number[],
  altitudeKm: number,
): TransferPath {
  const points = source.map(display);
  const moon = display(moonPosition);
  const radius = (LUNAR_RADIUS_KM + altitudeKm) / 1000;
  const last = points.length - 1;
  const radial = norm(sub(points[last], moon));
  const incoming = sub(points[last], points[last - 1]);
  const along = norm(sub(incoming, scale(radial, dot(incoming, radial))));
  points[last] = add(moon, scale(radial, radius));
  // Keep the near-Earth craft clear of the illustrative planet surface.
  points[0] = scale(norm(points[0]), Math.max(7.8, Math.hypot(...points[0])));
  const tangents = points.map((p, i) => {
    const before = points[Math.max(0, i - 1)],
      after = points[Math.min(last, i + 1)];
    const length = Math.min(
      i ? Math.hypot(...sub(p, before)) : Infinity,
      i < last ? Math.hypot(...sub(after, p)) : Infinity,
    );
    return scale(norm(sub(after, before)), length);
  });
  tangents[last] = scale(
    along,
    Math.min(radius * 0.5, Math.hypot(...sub(points[last], points[last - 1]))),
  );
  return { points, tangents, moon, radial, along, radius };
}

/** Fractional cubic interpolation shared by craft placement and trajectory drawing. */
export function sampleTransferPath(
  path: TransferPath,
  progress: number,
): FlightVector {
  const step = Math.max(0, Math.min(1, progress)) * (path.points.length - 1);
  const i = Math.min(path.points.length - 2, Math.floor(step)),
    t = step - i;
  const point = add(
    add(
      scale(path.points[i], 2 * t ** 3 - 3 * t ** 2 + 1),
      scale(path.tangents[i], t ** 3 - 2 * t ** 2 + t),
    ),
    add(
      scale(path.points[i + 1], -2 * t ** 3 + 3 * t ** 2),
      scale(path.tangents[i + 1], t ** 3 - t ** 2),
    ),
  );
  // The moving-Moon ephemeris is drawn around its arrival position. Keep that
  // display-space approach outside the chosen orbit with a C1 radial join.
  const relative = sub(point, path.moon);
  const distance = Math.hypot(...relative);
  const width = path.radius * 0.3;
  if (distance >= path.radius + width) return point;
  const blend = Math.max(0, (distance - path.radius) / width);
  const radius = path.radius + width * blend * blend * (2 - blend);
  return add(
    path.moon,
    scale(distance > 1e-9 ? norm(relative) : path.radial, radius),
  );
}
export function sampleCapturePath(
  path: TransferPath,
  angle: number,
): FlightVector {
  return add(
    path.moon,
    scale(
      add(
        scale(path.radial, Math.cos(angle)),
        scale(path.along, Math.sin(angle)),
      ),
      path.radius,
    ),
  );
}
