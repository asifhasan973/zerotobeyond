import type { HorizonsSnapshot } from "@exo/data";
export function isMissionDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function horizonsQuery(date: string): string {
  if (!isMissionDate(date))
    throw new RangeError("Use a valid date between 2000 and 2099.");
  const stop = new Date(`${date}T00:00:00Z`);
  stop.setUTCDate(stop.getUTCDate() + 1);
  const params = new URLSearchParams({
    format: "json",
    COMMAND: "'301'",
    CENTER: "'500@399'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    START_TIME: `'${date}'`,
    STOP_TIME: `'${stop.toISOString().slice(0, 10)}'`,
    STEP_SIZE: "'1 h'",
    OUT_UNITS: "'KM-S'",
    VEC_TABLE: "'2'",
    CSV_FORMAT: "'YES'",
    REF_PLANE: "'FRAME'",
    REF_SYSTEM: "'ICRF'",
    TIME_TYPE: "'TDB'",
    OBJ_DATA: "'NO'",
  });
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;
}
export function validateGeometry(value: unknown): string[] {
  if (!value || typeof value !== "object")
    return ["NASA geometry is unavailable."];
  const g = value as HorizonsSnapshot;
  if (
    g.version !== 1 ||
    !isMissionDate(g.date) ||
    g.target !== "Moon (301)" ||
    g.center !== "Earth (399)" ||
    g.frame !== "ICRF" ||
    g.timeScale !== "TDB" ||
    g.units !== "km"
  )
    return ["NASA geometry has unsupported metadata."];
  if (
    !Number.isFinite(Date.parse(g.retrievedAt)) ||
    typeof g.apiVersion !== "string" ||
    g.queryUrl !== horizonsQuery(g.date)
  )
    return ["NASA geometry is missing valid source provenance."];
  if (!Array.isArray(g.samples) || g.samples.length !== 25)
    return ["NASA geometry must contain 25 hourly samples."];
  const startJd = Date.parse(`${g.date}T00:00:00Z`) / 86400000 + 2440587.5;
  for (const [i, p] of g.samples.entries()) {
    if (
      !p ||
      ![p.jdTdb, p.xKm, p.yKm, p.zKm].every(Number.isFinite) ||
      typeof p.calendarTdb !== "string" ||
      Math.abs(p.jdTdb - (startJd + i / 24)) > 1e-6 ||
      Math.hypot(p.xKm, p.yKm, p.zKm) <= 0
    )
      return ["NASA geometry samples have invalid epochs or vectors."];
  }
  return [];
}
export function parseHorizons(
  value: unknown,
  date: string,
  retrievedAt: string,
): HorizonsSnapshot {
  if (!value || typeof value !== "object")
    throw new Error("NASA geometry response is invalid.");
  const raw = value as {
    result?: unknown;
    error?: unknown;
    signature?: { version?: unknown };
  };
  if (
    raw.error ||
    typeof raw.result !== "string" ||
    typeof raw.signature?.version !== "string"
  )
    throw new Error("NASA geometry is unavailable in this response.");
  const text = raw.result;
  if (
    !/Target body name:\s*Moon \(301\)/.test(text) ||
    !/Center body name:\s*Earth \(399\)/.test(text) ||
    !/Reference frame\s*:\s*ICRF/.test(text) ||
    !/Output units\s*:\s*KM-S/.test(text) ||
    !text.includes("$$EOE")
  )
    throw new Error("NASA geometry has an unsupported frame or target.");
  const section = text.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!section) throw new Error("NASA geometry samples are missing.");
  const snapshot: HorizonsSnapshot = {
    version: 1,
    date,
    retrievedAt,
    queryUrl: horizonsQuery(date),
    apiVersion: raw.signature.version,
    target: "Moon (301)",
    center: "Earth (399)",
    frame: "ICRF",
    timeScale: "TDB",
    units: "km",
    samples: section
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const c = line.split(",").map((part) => part.trim());
        return {
          jdTdb: Number(c[0]),
          calendarTdb: c[1],
          xKm: Number(c[2]),
          yKm: Number(c[3]),
          zKm: Number(c[4]),
        };
      }),
  };
  const errors = validateGeometry(snapshot);
  if (errors.length) throw new Error(errors.join(" "));
  return snapshot;
}
