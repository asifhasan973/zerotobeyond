import data from "./transferData.json";

export function getDynamicTransferDates(baseDate = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

export const TRANSFER_DATES = getDynamicTransferDates();

export function formatDepartureDate(isoDate: string | undefined): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[0], 10);
  if (isNaN(day) || isNaN(monthIdx) || isNaN(year)) return isoDate;

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[monthIdx] ?? "";

  const j = day % 10,
    k = day % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  else if (j === 2 && k !== 12) suffix = "nd";
  else if (j === 3 && k !== 13) suffix = "rd";

  return `${day}${suffix} ${month}, ${year}`;
}

export type LunarOrbitTierId = "low" | "mid" | "high";

export interface LunarOrbitTier {
  id: LunarOrbitTierId;
  name: string;
  tagline: string;
  altitudeKm: number;
  speedKmS: number;
  loiDvMS: number;
  fuelDeltaKg: number;
  descentDvImpactMS: number;
  scanResolution: string;
  clearanceOffset: number;
  tradeoffNote: string;
}

export const LUNAR_ORBIT_TIERS: Record<LunarOrbitTierId, LunarOrbitTier> = {
  low: {
    id: "low",
    name: "Low Lunar Orbit (LLO)",
    tagline: "Standard Apollo circular parking orbit",
    altitudeKm: 100,
    speedKmS: 1.63,
    loiDvMS: 890,
    fuelDeltaKg: 0,
    descentDvImpactMS: -120,
    scanResolution: "0.5 m/px · High fidelity",
    clearanceOffset: 1.86,
    tradeoffNote:
      "Direct descent trajectory & sharpest radar mapping; requires highest LOI capture burn.",
  },
  mid: {
    id: "mid",
    name: "Mid Lunar Orbit (MLO)",
    tagline: "Survey orbit with broad site coverage",
    altitudeKm: 300,
    speedKmS: 1.52,
    loiDvMS: 680,
    fuelDeltaKg: -210,
    descentDvImpactMS: 0,
    scanResolution: "2.0 m/px · Balanced",
    clearanceOffset: 3.26,
    tradeoffNote:
      "Balanced fuel margin with wider ground track; moderate descent requirements.",
  },
  high: {
    id: "high",
    name: "High Lunar Orbit",
    tagline: "High circular parking orbit",
    altitudeKm: 1000,
    speedKmS: 1.34,
    loiDvMS: 440,
    fuelDeltaKg: -450,
    descentDvImpactMS: 210,
    scanResolution: "8.0 m/px · Regional reconnaissance",
    clearanceOffset: 5.46,
    tradeoffNote:
      "Lower insertion burn; a longer descent requires more landing Δv.",
  },
};

export interface TransferSolution {
  days: number;
  tliMS: number;
  loiMS: number;
  arrivalSpeedKmS: number;
  errorKm: number;
  path: number[][];
  moonPath: number[][];
  sunDirection: number[];
}
export function transferSolution(
  date: string | undefined,
  id: string,
): TransferSolution | undefined {
  if (!date) {
    const firstRec = data.records[0];
    return (firstRec?.routes as Record<string, TransferSolution> | undefined)?.[
      id
    ];
  }
  const direct = data.records.find((r) => r.date === date);
  const directRoute = (
    direct?.routes as Record<string, TransferSolution> | undefined
  )?.[id];
  if (directRoute) return directRoute;

  const idx = TRANSFER_DATES.indexOf(date);
  const recordIndex = idx >= 0 ? idx % data.records.length : 0;
  const mappedRec = data.records[recordIndex];
  const mappedRoute = (
    mappedRec?.routes as Record<string, TransferSolution> | undefined
  )?.[id];
  if (mappedRoute) return mappedRoute;

  const baseRec = data.records[0];
  const baseRoute = (
    baseRec?.routes as Record<string, TransferSolution> | undefined
  )?.[id];
  if (baseRoute) return baseRoute;

  return Object.values(baseRec?.routes ?? {})[0] as
    TransferSolution | undefined;
}
export {
  lunarArrival,
  captureOrbit,
  LUNAR_MU,
  LUNAR_RADIUS_KM,
} from "@exo/engine";

/** Local two-body preview in km, s. Stops before a surface intersection. */
export function orbitPreview(
  position: number[],
  velocity: number[],
  seconds = 7200,
) {
  let r = [...position],
    v = [...velocity];
  const points = [r];
  const acceleration = (p: number[]) => {
    const norm = Math.hypot(...p);
    return p.map((x) => (-4902.800118 * x) / norm ** 3);
  };
  const dt = 10;
  for (let t = 0; t < seconds; t += dt) {
    const a = acceleration(r),
      half = v.map((x, i) => x + (a[i] * dt) / 2);
    r = r.map((x, i) => x + half[i] * dt);
    const b = acceleration(r);
    v = half.map((x, i) => x + (b[i] * dt) / 2);
    points.push(r);
    if (Math.hypot(...r) < 1737.4) break;
  }
  return points;
}
