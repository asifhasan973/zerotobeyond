import type { CosmicObject } from "@exo/data/cosmic";
export const AU_KM = 149597870.7;
export const LY_KM = 9460730472580.8;
export const C_KMS = 299792.458;
export function separation(a: readonly number[], b: readonly number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
export function positionAt(
  object: CosmicObject,
  jd: number,
): [number, number, number] | null {
  const s = object.samples;
  if (!s) return object.position;
  if (jd < s[0].jd || jd > s[s.length - 1].jd) return null;
  const i = s.findIndex((p) => p.jd >= jd);
  if (i <= 0) return s[0].position;
  const a = s[i - 1],
    b = s[i],
    f = (jd - a.jd) / (b.jd - a.jd);
  return a.position.map((v, k) => v + (b.position[k] - v) * f) as [
    number,
    number,
    number,
  ];
}
export function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumSignificantDigits: 3,
  }).format(value);
}
export function distanceLabel(km: number) {
  if (km < AU_KM * 0.1)
    return `${new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }).format(km)} km`;
  if (km < LY_KM * 0.1)
    return `${new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }).format(km / AU_KM)} AU`;
  const ly = km / LY_KM;
  return `≈${ly >= 10000 ? compactNumber(ly) : new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }).format(ly)} light-years`;
}
export function durationLabel(seconds: number) {
  if (seconds < 60) return `${Number(seconds.toFixed(2))} seconds`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} sec`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)} hr ${Math.floor((seconds % 3600) / 60)} min`;
  if (seconds < 31557600)
    return `${Number((seconds / 86400).toPrecision(3))} days`;
  return `≈${compactNumber(seconds / 31557600)} years`;
}
export function matchesCosmicFilter(
  object: CosmicObject,
  filter: string,
  bookmarks: readonly string[],
) {
  return (
    filter === "all" ||
    (filter === "bookmarks"
      ? bookmarks.includes(object.id)
      : object.kind === filter)
  );
}
export { orbitGuide } from "./orbits";
