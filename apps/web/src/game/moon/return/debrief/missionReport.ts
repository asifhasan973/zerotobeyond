import type { WorkshopSession } from "@/game/moon/workshop/lander/workshopSession";
import type { ScienceObservation } from "@/game/moon/shared/session";
import { returnComplete, missionOutcome } from "../return";
import { expectedFinding, SCIENCE_TARGETS } from "@/game/moon/science/science";
import { GEOLOGY_TARGETS } from "@/game/moon/science/geologyScience";
import { partById } from "@/game/moon/core/preparation";
import { roverSites } from "@/game/moon/rover/rover";
import { missionDebrief } from "./missionDebrief.ts";

export const completedMission = (s: Pick<WorkshopSession, "moon">) =>
  returnComplete(s.moon.returnFlight, s.moon.designSignature) &&
  missionOutcome(s.moon) !== null;

const REGION_NAMES = {
  "crater-rim": "Crater rim",
  "permanent-shadow": "Permanently shadowed region",
  "lunar-highlands": "Lunar highlands",
  "ancient-crater": "Ancient crater",
};

/** Current mission regions have no documented transform to the NASA Atlas coordinates. */
export function reportLocation(site: WorkshopSession["moon"]["site"]) {
  return {
    name: site
      ? (REGION_NAMES[site] ?? "Unspecified region")
      : "Unspecified region",
    atlasSite: null,
    explanation:
      "This NASA reference location is separate from your game region. It is not your exact landing or sample spot.",
  };
}

/** Uses the same field names as the mission; unknown coordinates remain unspecified. */
function fieldLocation(session: WorkshopSession, id: string) {
  if (id === "base") return "Lander base";
  if (id === "rover-field") return "Rover fieldwork area";
  const roverSite = session.moon.rover
    ? roverSites(session.moon.rover).find((site) => site.id === id)
    : undefined;
  const targets =
    session.moon.objective === "lunar-geology"
      ? GEOLOGY_TARGETS
      : SCIENCE_TARGETS;
  return (
    roverSite?.name ??
    targets.find((target) => target.id === id)?.name ??
    "Unspecified field location"
  );
}

function instrumentName(id: string) {
  if (id === "crew-drill") return "Crew sample drill";
  if (id === "msolo") return "Gas mass spectrometer (MSolo)";
  if (id === "trident") return "Subsurface drill (TRIDENT)";
  return partById(id)?.name ?? "Recorded science instrument";
}

function observationMeaning(
  record: ScienceObservation,
  delivered: ScienceObservation[],
) {
  if (!record.transmitted)
    return "Collected in the simulation; not delivered. It cannot support a finding received on Earth.";
  if (record.kind === "hydrogen-clue")
    return "A hydrogen indication is a clue. Hydrogen alone does not establish water ice.";
  if (record.kind === "water-evidence") {
    if (record.missionSeconds == null && !record.sampleId)
      return `Saved interpretation: ${record.result ?? "inconclusive"}. This older record does not retain measurement pairing, so agreeing channels cannot be reconstructed.`;
    const group = delivered.filter(
      (r) =>
        r.locationId === record.locationId &&
        (record.sampleId
          ? r.sampleId === record.sampleId
          : r.missionSeconds === record.missionSeconds),
    );
    const finding = expectedFinding(group);
    return finding === "confirmed"
      ? "Agreeing optical and gas readings support water confirmation within this simulation. This is not a discovery on the real Moon."
      : finding === "negative"
        ? "The delivered readings do not detect water in this simulated sampled material. This does not rule out water elsewhere."
        : "The delivered optical and gas evidence is incomplete, low quality or does not agree. Water remains inconclusive.";
  }
  if (record.kind === "mineral-evidence")
    return record.classification && record.classification !== "inconclusive"
      ? `The recorded ${instrumentName(record.instrumentId)} evidence supports a simulated ${record.classification} classification. It does not describe the composition of a real lunar sample.`
      : "The recorded mineral evidence does not support a definite rock classification.";
  return "This is a recorded field observation. A sealed sample, texture or subsurface clue alone does not establish composition.";
}

/** Read-only projection of the existing mission ledger; never awards points or writes a save. */
export function missionReport(session: WorkshopSession) {
  const d = missionDebrief(session),
    m = session.moon,
    recovered = completedMission(session);
  const records = [
    ...new Map(m.science.records.map((record) => [record.id, record])).values(),
  ];
  const delivered = records.filter((record) => record.transmitted);
  const rover = m.rover;
  const samples = rover
    ? [...new Set([...rover.cargo, ...rover.deposited])].map((id) => ({
        id: `crew-sample-${id}`,
        location: id,
        massKg: 0.2,
        stowed: rover.deposited.includes(id),
      }))
    : [
        ...new Map(
          (m.science.samples ?? []).map((sample) => [sample.id, sample]),
        ).values(),
      ].map((sample) => ({
        id: sample.id,
        location: sample.locationId,
        massKg: sample.massKg,
        stowed: sample.stowed,
      }));
  const returned = recovered ? samples.filter((sample) => sample.stowed) : [];
  const done = new Set(session.progress.completedActivities);
  return {
    debrief: d,
    recovered,
    outcome: recovered ? missionOutcome(m) : null,
    objective:
      m.objective === "lunar-geology" ? "Geology Explorer" : "Ice Explorer",
    location: reportLocation(m.site),
    samples: samples.map((sample) => ({
      ...sample,
      locationName: fieldLocation(session, sample.location),
      returned: recovered && sample.stowed,
    })),
    returnedCount: returned.length,
    returnedKg: returned.reduce((total, sample) => total + sample.massKg, 0),
    observations: records.map((record) => ({
      ...record,
      instrumentName: instrumentName(record.instrumentId),
      locationName: fieldLocation(session, record.locationId),
      meaning: observationMeaning(record, delivered),
      receivedOnEarth: recovered && record.transmitted,
    })),
    deliveredCount: delivered.length,
    journey: [
      { name: "Launch", recorded: done.has("liftoff") },
      { name: "Moon arrival", recorded: done.has("moon-transfer") },
      { name: "Landing", recorded: done.has("lunar-descent") },
      { name: "Fieldwork", recorded: m.surface.deployed || !!rover?.deployed },
      { name: "Crew home", recorded: recovered },
    ],
  };
}
export type MoonMissionReport = ReturnType<typeof missionReport>;

/** Groups paired water channels without inventing pairing for older observations. */
export function reportFindings(report: MoonMissionReport) {
  const groups = new Map<string, MoonMissionReport["observations"]>();
  for (const record of report.observations) {
    const pairing = record.sampleId ?? record.missionSeconds;
    const key =
      record.kind === "water-evidence" && pairing != null
        ? `water:${record.locationId}:${pairing}`
        : record.id;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const priority = (kind: ScienceObservation["kind"]) =>
    kind === "water-evidence" || kind === "mineral-evidence" ? 0 : 1;
  return [...groups.entries()]
    .sort(([, a], [, b]) => priority(a[0].kind) - priority(b[0].kind))
    .map(([id, records]) => {
      const record = records[0];
      const delivered = records.filter((item) => item.transmitted);
      let meaning = "This reading adds a clue about the ground.";
      let uncertainty =
        "This clue alone does not show what the material is made of.";
      if (record.kind === "water-evidence") {
        const paired = record.sampleId != null || record.missionSeconds != null;
        const finding = paired ? expectedFinding(delivered) : null;
        meaning =
          finding === "confirmed"
            ? "The paired readings support water in this game sample."
            : finding === "negative"
              ? "These readings did not detect water in this game sample."
              : "The readings do not give a clear answer about water.";
        uncertainty = !paired
          ? "This older record does not keep the measurement pairing."
          : finding === "confirmed"
            ? "This is a simulated result, not a real Moon discovery."
            : finding === "negative"
              ? "Water could still be present elsewhere."
              : "Optical and gas readings must agree and have enough quality.";
      } else if (record.kind === "mineral-evidence") {
        const known =
          record.classification && record.classification !== "inconclusive";
        meaning = known
          ? `This game sample has signs of ${record.classification}.`
          : "The reading does not give a clear rock type.";
        uncertainty =
          record.quality === "low"
            ? "Low-quality readings need another check."
            : "Other instruments can help check the rock type.";
      } else if (record.kind === "hydrogen-clue") {
        meaning = "Hydrogen may help us choose where to look next.";
        uncertainty = "Hydrogen alone does not prove water ice.";
      } else if (record.kind === "texture") {
        meaning = "The picture records the surface texture.";
      } else if (record.kind === "seismic") {
        meaning = "The sensor records how the ground responds to shaking.";
      }
      if (!delivered.length) {
        uncertainty = "This reading was recorded but was not sent home.";
      }
      return {
        id,
        title:
          records.length > 1
            ? "Optical and gas readings"
            : record.instrumentName,
        locationName: record.locationName,
        measurement: [
          ...new Set(
            records.map(
              (item) =>
                item.signal ??
                item.classification ??
                item.result ??
                "Result unavailable",
            ),
          ),
        ].join(" · "),
        meaning,
        uncertainty,
        receivedOnEarth: records.every((item) => item.receivedOnEarth),
        confidence: records.some((item) => item.confidence === "low")
          ? "low"
          : record.confidence,
      };
    });
}
