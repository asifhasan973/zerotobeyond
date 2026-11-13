import { ENGINEERING_INSTRUMENTS } from "@exo/data/engineering";
import type { HorizonsSnapshot, InstrumentId } from "@exo/data";
import { isMissionDate, validateGeometry } from "./horizons";
import type { MissionDraft, MissionResult, PayloadResult } from "./types";
export const DEFAULT_MISSION: MissionDraft = {
  version: 1,
  name: "Lunar surface survey",
  date: "2026-11-13",
  objective: "combined",
  instrumentIds: ["lroc", "lola"],
  batteryWh: 260,
  solarW: 280,
  storageGbit: 12,
  transmitterW: 20,
  observationMinutes: 24,
  contactMinutes: 15,
  massLimitKg: 180,
  creditLimit: 300,
};
export const MISSION_OBJECTIVES = {
  imagery: {
    name: "Surface imagery",
    description: "Return detailed images of the lunar surface.",
    required: ["lroc"],
  },
  topography: {
    name: "Surface heights",
    description: "Return laser-altimeter measurements of lunar topography.",
    required: ["lola"],
  },
  combined: {
    name: "Images + topography",
    description: "Return both camera and altimeter data in one mission.",
    required: ["lroc", "lola"],
  },
} as const;
export function validateMission(value: unknown): string[] {
  if (!value || typeof value !== "object")
    return ["Choose a valid mission draft."];
  const d = value as MissionDraft;
  const errors: string[] = [];
  if (d.version !== 1) errors.push("Unsupported draft version.");
  if (typeof d.name !== "string" || !d.name.trim() || d.name.length > 100)
    errors.push("Mission name must contain 1–100 characters.");
  if (!isMissionDate(d.date))
    errors.push("Choose a real date between 2000 and 2099 (TDB).");
  if (!Object.hasOwn(MISSION_OBJECTIVES, d.objective))
    errors.push("Choose a science objective.");
  if (
    !Array.isArray(d.instrumentIds) ||
    d.instrumentIds.some(
      (id) => !ENGINEERING_INSTRUMENTS.some((p) => p.id === id),
    ) ||
    new Set(d.instrumentIds).size !== d.instrumentIds.length
  )
    errors.push("Choose unique instruments from the reference catalog.");
  const bounds: [keyof MissionDraft, number, number, string][] = [
    ["batteryWh", 1, 10000, "Battery capacity: 1–10,000 Wh."],
    ["solarW", 0, 5000, "Solar output: 0–5,000 W."],
    ["storageGbit", 0.01, 1000, "Storage: 0.01–1,000 Gbit."],
    ["transmitterW", 1, 100, "Transmitter electrical power: 1–100 W."],
    ["observationMinutes", 1, 75, "Observe for 1–75 whole minutes per orbit."],
    ["contactMinutes", 0, 45, "Downlink for 0–45 whole minutes per orbit."],
    ["massLimitKg", 1, 10000, "Mass limit: 1–10,000 kg."],
    ["creditLimit", 1, 10000, "Budget: 1–10,000 simulation credits."],
  ];
  for (const [key, lo, hi, message] of bounds) {
    const n = d[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < lo || n > hi)
      errors.push(message);
  }
  if (
    !Number.isInteger(d.observationMinutes) ||
    !Number.isInteger(d.contactMinutes)
  )
    errors.push("Schedule durations must be whole minutes.");
  return errors;
}
function geometryAt(g: HorizonsSnapshot, minute: number) {
  const h = Math.min(23, Math.floor(minute / 60));
  const a = g.samples[h],
    b = g.samples[h + 1],
    fraction = (minute - h * 60) / 60;
  return Math.hypot(
    a.xKm + (b.xKm - a.xKm) * fraction,
    a.yKm + (b.yKm - a.yKm) * fraction,
    a.zKm + (b.zKm - a.zKm) * fraction,
  );
}
export function radioLink(distanceKm: number, electricalW: number) {
  const pathLossDb =
    20 * Math.log10((4 * Math.PI * distanceKm * 1000 * 32e9) / 299792458);
  const receivedDbw =
    10 * Math.log10(electricalW * 0.3) + 30 + 60 - pathLossDb - 3;
  return {
    pathLossDb,
    downlinkMbps: Math.min(100, 10 * 10 ** ((receivedDbw + 140) / 10)),
    delaySeconds: distanceKm / 299792.458,
  };
}
/** Minute-resolved educational resource accounts; never a flight trajectory or safety assessment. */
export function evaluateMission(
  d: MissionDraft,
  g: HorizonsSnapshot,
): MissionResult {
  const errors = [...validateMission(d), ...validateGeometry(g)];
  if (d.date !== g?.date)
    errors.push("Mission date and NASA geometry date must match.");
  if (errors.length) throw new RangeError(errors.join(" "));
  const instruments = ENGINEERING_INSTRUMENTS.filter((p) =>
    d.instrumentIds.includes(p.id),
  );
  const payloadPowerW = instruments.reduce((s, p) => s + p.powerW, 0);
  const massKg =
    120 +
    4 +
    d.batteryWh / 120 +
    d.solarW / 50 +
    instruments.reduce((s, p) => s + p.massKg, 0);
  const credits =
    140 +
    d.batteryWh * 0.06 +
    d.solarW * 0.08 +
    d.storageGbit * 0.8 +
    d.transmitterW * 0.5 +
    instruments.reduce((s, p) => s + p.credits, 0);
  const payloads: PayloadResult[] = instruments.map((p) => ({
    id: p.id,
    plannedGbit: (p.referenceGbitPerDay * d.observationMinutes) / 120,
    producedGbit: 0,
    deliveredGbit: 0,
    storedGbit: 0,
    lostGbit: 0,
  }));
  const sum = (
    key:
      | "producedGbit"
      | "plannedGbit"
      | "storedGbit"
      | "deliveredGbit"
      | "lostGbit",
  ) => payloads.reduce((s, p) => s + p[key], 0);
  let wh = d.batteryWh,
    minimumWh = wh,
    generatedWh = 0,
    servedWh = 0,
    unmetWh = 0,
    lossWh = 0,
    curtailedWh = 0;
  const points = [
    { minute: 0, batteryWh: wh, storedGbit: 0, deliveredGbit: 0 },
  ];
  for (let minute = 0; minute < 1440; minute++) {
    const orbitMinute = minute % 120;
    const sunlight = orbitMinute < 75;
    const observing = orbitMinute < d.observationMinutes;
    const contact =
      d.contactMinutes > 0 &&
      orbitMinute >= 120 - d.contactMinutes &&
      sum("storedGbit") > 0;
    const demand = (60 + payloadPowerW + (contact ? d.transmitterW : 0)) / 60;
    const solar = sunlight ? d.solarW / 60 : 0;
    generatedWh += solar;
    const direct = Math.min(solar, demand);
    const deficit = demand - direct;
    const batteryOutput = Math.min(deficit, wh * 0.95);
    const drained = batteryOutput / 0.95;
    wh -= drained;
    servedWh += direct + batteryOutput;
    unmetWh += Math.max(0, deficit - batteryOutput);
    lossWh += drained - batteryOutput;
    const surplus = solar - direct;
    const stored = Math.min(d.batteryWh - wh, surplus * 0.9);
    wh += stored;
    lossWh += stored / 0.9 - stored;
    curtailedWh += surplus - stored / 0.9;
    minimumWh = Math.min(minimumWh, wh);
    const powered = deficit - batteryOutput < 1e-8;
    if (observing && powered) {
      const production = instruments.map((p) => p.referenceGbitPerDay / 1440);
      const total = production.reduce((s, v) => s + v, 0);
      const acceptance =
        total > 0
          ? Math.min(1, Math.max(0, d.storageGbit - sum("storedGbit")) / total)
          : 1;
      payloads.forEach((p, i) => {
        p.producedGbit += production[i];
        p.storedGbit += production[i] * acceptance;
        p.lostGbit += production[i] * (1 - acceptance);
      });
    }
    if (contact && powered) {
      const available = sum("storedGbit");
      const sent = Math.min(
        available,
        (radioLink(geometryAt(g, minute + 0.5), d.transmitterW).downlinkMbps *
          60) /
          1000,
      );
      for (const p of payloads) {
        const portion = available > 0 ? (sent * p.storedGbit) / available : 0;
        p.storedGbit = Math.max(0, p.storedGbit - portion);
        p.deliveredGbit += portion;
      }
    }
    if ((minute + 1) % 5 === 0)
      points.push({
        minute: minute + 1,
        batteryWh: wh,
        storedGbit: sum("storedGbit"),
        deliveredGbit: sum("deliveredGbit"),
      });
  }
  const required: readonly InstrumentId[] =
    MISSION_OBJECTIVES[d.objective].required;
  const distanceKm = geometryAt(g, 720);
  const link = radioLink(distanceKm, d.transmitterW);
  const reserveWh = d.batteryWh * 0.2;
  const checks: MissionResult["checks"] = [
    {
      id: "payload",
      title: "Required instruments",
      passed: required.every((id) => d.instrumentIds.includes(id)),
      detail: `Required: ${required.map((id) => id.toUpperCase()).join(" + ")}. Match instruments to the science objective.`,
    },
    {
      id: "mass",
      title: "Mass allocation",
      passed: massKg <= d.massLimitKg,
      detail: `${massKg.toFixed(1)} / ${d.massLimitKg} kg. Increase the allowance or reduce payload, array or battery mass.`,
    },
    {
      id: "credits",
      title: "Resource budget",
      passed: credits <= d.creditLimit,
      detail: `${credits.toFixed(1)} / ${d.creditLimit} simulation credits. Credits are authored, not NASA procurement costs.`,
    },
    {
      id: "power",
      title: "Power + reserve",
      passed: unmetWh < 1e-7 && minimumWh + 1e-7 >= reserveWh,
      detail: `Minimum ${minimumWh.toFixed(1)} Wh; required reserve ${reserveWh.toFixed(1)} Wh; unserved ${unmetWh.toFixed(1)} Wh. More battery bridges eclipse; more solar replenishes it.`,
    },
    {
      id: "storage",
      title: "No science data lost",
      passed: sum("lostGbit") < 1e-7,
      detail: `${sum("lostGbit").toFixed(2)} Gbit overflow. Increase storage, shorten observations or improve downlink.`,
    },
    {
      id: "science",
      title: "Science returned to Earth",
      passed: required.every((id) => {
        const p = payloads.find((item) => item.id === id);
        return (
          !!p &&
          p.plannedGbit > 0 &&
          p.deliveredGbit + 1e-7 >= p.plannedGbit * 0.8
        );
      }),
      detail:
        "Return at least 80% of planned data from each required instrument within 24 hours. Collection alone does not complete the objective.",
    },
  ];
  return {
    model: "mission-blueprint-v1",
    passed: checks.every((c) => c.passed),
    massKg,
    credits,
    payloadPowerW,
    generatedWh,
    servedWh,
    unmetWh,
    lossWh,
    curtailedWh,
    endWh: wh,
    minimumWh,
    reserveWh,
    producedGbit: sum("producedGbit"),
    plannedGbit: sum("plannedGbit"),
    deliveredGbit: sum("deliveredGbit"),
    storedGbit: sum("storedGbit"),
    lostGbit: sum("lostGbit"),
    distanceKm,
    ...link,
    payloads,
    points,
    checks,
  };
}
