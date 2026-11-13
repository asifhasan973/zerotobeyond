export type InstrumentId = "lroc" | "lola";
export interface EngineeringSource {
  id: string;
  title: string;
  url: string;
  kind: "NASA API" | "NASA reference" | "Design framework" | "Lab assumptions";
  location: string;
  values: string;
  usedIn: string[];
  limitations: string;
}
export interface EngineeringInstrument {
  id: InstrumentId;
  name: string;
  description: string;
  massKg: number;
  powerW: number;
  referenceGbitPerDay: number;
  credits: number;
  sourceId: string;
}
export interface HorizonsSample {
  jdTdb: number;
  calendarTdb: string;
  xKm: number;
  yKm: number;
  zKm: number;
}
export interface HorizonsSnapshot {
  version: 1;
  date: string;
  retrievedAt: string;
  queryUrl: string;
  apiVersion: string;
  target: "Moon (301)";
  center: "Earth (399)";
  frame: "ICRF";
  timeScale: "TDB";
  units: "km";
  samples: HorizonsSample[];
}
export const ENGINEERING_INSTRUMENTS: readonly EngineeringInstrument[] = [
  {
    id: "lroc",
    name: "LROC camera suite",
    description: "Narrow- and wide-angle images of the lunar surface.",
    massKg: 16.5,
    powerW: 27.6,
    referenceGbitPerDay: 556,
    credits: 35,
    sourceId: "lro-2007",
  },
  {
    id: "lola",
    name: "LOLA laser altimeter",
    description: "Surface heights and topography measured by laser ranging.",
    massKg: 15.3,
    powerW: 39.6,
    referenceGbitPerDay: 1.4,
    credits: 25,
    sourceId: "lro-2007",
  },
];
export const ENGINEERING_SOURCES: readonly EngineeringSource[] = [
  {
    id: "horizons",
    title: "NASA/JPL Horizons API",
    url: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
    kind: "NASA API",
    location:
      "Geometric vectors · Moon 301 relative to Earth 399 · ICRF · KM-S · hourly · TDB",
    values:
      "X, Y and Z position vectors, Julian dates and calendar epochs. Distance is computed as √(X² + Y² + Z²). Each downloaded snapshot retains its exact query URL and retrieval time.",
    usedIn: [
      "Earth–Moon center distance",
      "One-way vacuum signal delay",
      "Free-space path loss",
      "Power-limited downlink estimate",
    ],
    limitations:
      "Predicted center-to-center geometry, not live tracking or a spacecraft orbit. The lab does not derive contact windows, eclipse, station availability or a launch trajectory from these vectors. TDB dates are not UTC dates.",
  },
  {
    id: "lro-2007",
    title: "LRO: The Instrument Suite and Mission (Chin et al., 2007)",
    url: "https://science.nasa.gov/wp-content/uploads/2024/01/lro-space-science-paper.pdf",
    kind: "NASA reference",
    location:
      "PDF page 7, Table 2; PDF page 27, Table 7 · DOI 10.1007/s11214-007-9153-y",
    values:
      "Table 7 allocations: LROC 16.5 kg / 27.6 W; LOLA 15.3 kg / 39.6 W. Table 2 reference volumes: LROC NAC 515 + WAC 41 = 556 Gbit/day; LOLA 1.4 Gbit/day.",
    usedIn: [
      "Payload mass",
      "Continuous orbit-average payload power allowance",
      "Scaled science-data production",
      "Instrument requirements",
    ],
    limitations:
      "Historical pre-launch allocations, not current measured performance or component procurement specifications. Table 7 is used consistently rather than mixing the paper's different design estimates. Daily data volumes are scaled by an authored observing schedule; power allocations remain constant, not instantaneous instrument loads.",
  },
  {
    id: "mdl",
    title: "NASA Goddard Mission Design Lab",
    url: "https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/",
    kind: "Design framework",
    location: "MDL disciplines and tailored trade-study products",
    values:
      "Requirements, baseline and alternative designs, mass/power/data budgets, technical risks and recommendations.",
    usedIn: [
      "Mission review checklist",
      "A/B trade study",
      "Blueprint report structure",
    ],
    limitations:
      "A workflow reference, not a numerical dataset, NASA certification, or an official Concept Maturity Level assessment.",
  },
  {
    id: "assumptions",
    title: "Educational spacecraft and operations model",
    url: "",
    kind: "Lab assumptions",
    location: "mission-blueprint-v1 · one-minute steps over 24 hours",
    values:
      "120-minute orbit, first 75 minutes sunlit, observation starts each orbit, downlink at the end of each orbit. Bus 120 kg / 60 W; battery 120 Wh/kg; array 50 W/kg; radio 3 kg; storage 1 kg. Battery starts full, 20% reserve; charge/discharge efficiency 90%/95%. Radio: 32 GHz, 30% RF efficiency, 30/60 dBi transmit/receive gains, 3 dB losses, −140 dBW reference receive power at 10 Mbps; 100 Mbps channel cap. Science requires at least 80% of planned data returned per required instrument, with no storage loss. Costs are simulation credits.",
    usedIn: [
      "Battery and storage timeline",
      "Contact and sunlight schedule",
      "Radio link estimate",
      "Spacecraft mass",
      "Simulation credits",
      "Pass/fail thresholds",
    ],
    limitations:
      "Authored teaching assumptions, not NASA hardware values or a flight-qualified design. No launch, propulsion sizing, orbit propagation, thermal, pointing, radiation, ground-station scheduling, compression, or detailed link coding/noise model. A power shortage stops science and downlink for that minute; scheduled loads are still accounted for. Payload data are mixed proportionally in shared storage and downlink.",
  },
];
