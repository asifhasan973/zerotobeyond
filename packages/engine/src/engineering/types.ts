import type { InstrumentId } from "@exo/data";
export type MissionObjective = "imagery" | "topography" | "combined";
export interface MissionDraft {
  version: 1;
  name: string;
  date: string;
  objective: MissionObjective;
  instrumentIds: InstrumentId[];
  batteryWh: number;
  solarW: number;
  storageGbit: number;
  transmitterW: number;
  observationMinutes: number;
  contactMinutes: number;
  massLimitKg: number;
  creditLimit: number;
}
export interface MissionPoint {
  minute: number;
  batteryWh: number;
  storedGbit: number;
  deliveredGbit: number;
}
export interface PayloadResult {
  id: InstrumentId;
  plannedGbit: number;
  producedGbit: number;
  deliveredGbit: number;
  storedGbit: number;
  lostGbit: number;
}
export interface MissionCheck {
  id: "payload" | "mass" | "credits" | "power" | "storage" | "science";
  title: string;
  passed: boolean;
  detail: string;
}
export interface MissionResult {
  model: "mission-blueprint-v1";
  passed: boolean;
  massKg: number;
  credits: number;
  payloadPowerW: number;
  generatedWh: number;
  servedWh: number;
  unmetWh: number;
  lossWh: number;
  curtailedWh: number;
  endWh: number;
  minimumWh: number;
  reserveWh: number;
  producedGbit: number;
  plannedGbit: number;
  deliveredGbit: number;
  storedGbit: number;
  lostGbit: number;
  distanceKm: number;
  delaySeconds: number;
  pathLossDb: number;
  downlinkMbps: number;
  checks: MissionCheck[];
  payloads: PayloadResult[];
  points: MissionPoint[];
}
