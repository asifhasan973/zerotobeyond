export const COSMIC_SOLAR_URL = "/exploration/cosmic/solar-system.json";
export const COSMIC_CATALOGUE_URL = "/exploration/cosmic/catalogue.json";
export type CosmicKind =
  "star" | "planet" | "moon" | "spacecraft" | "galaxy" | "quasar";
export interface CosmicObject {
  id: string;
  name: string;
  kind: CosmicKind;
  position: [number, number, number];
  color: string;
  radiusKm?: number;
  magnitude?: number;
  colorIndex?: number | null;
  redshift?: number;
  lookbackGyr?: number;
  source: string;
  method: string;
  epoch: string;
  samples?: { jd: number; position: [number, number, number] }[];
}
export interface CosmicData {
  version: 1;
  retrieved: string;
  objects: CosmicObject[];
  chunks?: string[];
  sources: { name: string; url: string; query: string; sha256: string }[];
  limits: string[];
}
