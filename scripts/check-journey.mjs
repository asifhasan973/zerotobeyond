import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const server = await createServer({
  root: "apps/web",
  configFile: "apps/web/vite.config.ts",
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const load = (p) => server.ssrLoadModule("/src/game/moon/" + p);
  const { captureOrbit } = await load("flight/journey/transferModel.ts");
  const circularAt300 = Math.sqrt(4902.800118 / 2037.4);
  const orbit = captureOrbit(circularAt300 + 0.7, 700, 0, 300);
  assert.ok(
    Math.abs(orbit.periapsisKm - 300) < 0.001,
    "300 km capture must use selected radius, not 100 km",
  );
  assert.ok(Math.abs(orbit.apoapsisKm - 300) < 0.001);
  const { createWorkshopSession, reduceMission } = await load(
    "workshop/lander/workshopSession.ts",
  );
  const { createStoryProgress } = await load("core/progress.ts");
  const { advanceMissionSkip } = await load("core/missionNavigation.ts");
  const { reduceJourney, routeReport, restoreJourney, journeyResources } =
    await load("flight/journey/journey.ts");
  const { TRANSFER_DATES } = await load("flight/journey/transferModel.ts");
  let mission = createWorkshopSession(createStoryProgress());
  for (let i = 0; i < 80 && mission.progress.stepId !== "earth-orbit"; i++)
    mission = advanceMissionSkip(mission);
  assert.equal(mission.progress.stepId, "earth-orbit");
  const act = (event) => {
    mission = reduceMission(mission, event);
  };
  act({ type: "journey-date", date: TRANSFER_DATES[0] });
  const { writeSelectionSession } = await load("crew/selectionSession.ts");
  const data = new Map();
  writeSelectionSession(
    {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    },
    mission.progress,
    false,
    mission.preparation,
    mission.readiness,
    mission.flight,
    mission.moon,
    mission.repair,
  );
  if (process.env.JOURNEY_SAVE_OUTPUT)
    writeFileSync(process.env.JOURNEY_SAVE_OUTPUT, [...data.values()][0]);
  act({ type: "journey-route", id: "balanced" });
  act({ type: "journey-select-orbit", tier: "mid" });
  const report = routeReport(mission.moon, "balanced");
  assert.ok(report.feasible);
  const low = routeReport(
    { ...mission.moon, journey: { ...mission.moon.journey, orbitTier: "low" } },
    "balanced",
  );
  assert.ok(
    report.loiFuelKg < low.loiFuelKg,
    "selected altitude must change arrival fuel estimate",
  );
  assert.ok(
    report.loiMS < low.loiMS,
    "selected altitude must change burn target",
  );
  act({ type: "journey-confirm-route" });
  let j = mission.moon.journey;
  assert.equal(j.stage, "tli-window");
  const skipped = advanceMissionSkip(mission);
  assert.equal(
    skipped.moon.journey.orbitTier,
    "mid",
    "Skip must retain the locked lunar target",
  );
  assert.equal(skipped.moon.journey.stage, "complete");
  assert.equal(
    reduceJourney(
      j,
      { type: "journey-select-orbit", tier: "high" },
      mission.moon,
    ),
    j,
    "departure locks orbit",
  );
  const restored = restoreJourney(j, mission.moon);
  assert.equal(restored.orbitTier, "mid");
  assert.equal(restored.stage, j.stage);
  const pilotOutsideBurn = reduceJourney(
    j,
    { type: "journey-pilot", firing: true },
    mission.moon,
  );
  assert.equal(
    pilotOutsideBurn.firing,
    false,
    "engine cannot fire outside burn",
  );
  act({ type: "journey-burn" });
  act({ type: "journey-pilot", angle: 0, throttle: 0.1, firing: true });
  for (let i = 0; i < 5000 && mission.moon.journey.firing; i++)
    act({ type: "journey-tick", seconds: 0.05 });
  assert.ok((mission.moon.journey.dv ?? 0) >= report.tliMS * 0.992);
  act({ type: "journey-finish-burn" });
  assert.equal(mission.moon.journey.stage, "coast");
  for (let i = 0; i < 56; i++) act({ type: "journey-tick", seconds: 0.25 });
  assert.equal(mission.moon.journey.stage, "loi-window");
  act({ type: "journey-burn" });
  act({ type: "journey-pilot", angle: 0, throttle: 0.1, firing: true });
  for (let i = 0; i < 5000 && mission.moon.journey.firing; i++)
    act({ type: "journey-tick", seconds: 0.05 });
  act({ type: "journey-finish-burn" });
  assert.equal(mission.moon.journey.stage, "complete");
  j = mission.moon.journey;
  const result = captureOrbit(report.arrivalSpeedKmS, j.dv, j.radialDv, 300);
  assert.ok(result.bound);
  assert.ok(
    Math.abs(result.periapsisKm - 300) < 40,
    "capture reaches chosen altitude",
  );
  const unsafe = reduceJourney(
    {
      ...j,
      stage: "loi-burn",
      dv: report.loiMS,
      radialDv: 180,
      angle: 0,
      firing: false,
      paused: false,
    },
    { type: "journey-finish-burn" },
    mission.moon,
  );
  assert.notEqual(
    unsafe.stage,
    "complete",
    "radial velocity must not allow a capture inside the Moon",
  );
  const reloaded = restoreJourney(j, mission.moon);
  assert.equal(reloaded.stage, "complete");
  assert.equal(reloaded.orbitTier, "mid");
  assert.equal(reloaded.loiUsed, j.loiUsed);
  assert.deepEqual(
    journeyResources(mission.moon, reloaded),
    mission.moon.resources,
  );
  const { readSelectionSession } = await load("crew/selectionSession.ts");
  writeSelectionSession(
    {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    },
    mission.progress,
    false,
    mission.preparation,
    mission.readiness,
    mission.flight,
    mission.moon,
    mission.repair,
  );
  const fullReload = readSelectionSession({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  });
  assert.equal(fullReload.moon.journey.orbitTier, "mid");
  assert.equal(fullReload.moon.journey.stage, "complete");
  assert.equal(fullReload.moon.journey.loiUsed, j.loiUsed);
  const { emptyJourney } = await load("flight/journey/journey.ts");
  let legacy = { ...emptyJourney(), signature: mission.moon.designSignature };
  legacy = reduceJourney(
    legacy,
    { type: "journey-date", date: TRANSFER_DATES[0] },
    mission.moon,
  );
  legacy = { ...legacy, captureModel: undefined };
  for (const event of [
    { type: "journey-route", id: "balanced" },
    { type: "journey-confirm" },
    { type: "journey-burn" },
    { type: "journey-pilot", angle: 0, throttle: 0.1, firing: true },
  ])
    legacy = reduceJourney(legacy, event, { ...mission.moon, journey: legacy });
  for (let i = 0; i < 5000 && legacy.dv < report.tliMS * 0.993; i++)
    legacy = reduceJourney(
      legacy,
      { type: "journey-tick", seconds: 0.05 },
      { ...mission.moon, journey: legacy },
    );
  assert.equal(legacy.firing, true);
  const oldCompleteBurn = {
    ...legacy,
    stage: "coast",
    commands: [...legacy.commands, { type: "journey-finish-burn" }],
  };
  assert.equal(
    restoreJourney(oldCompleteBurn, mission.moon).stage,
    "coast",
    "old saves can confirm a target while still firing",
  );
  const engine = await server.ssrLoadModule(
    "/@fs" +
      decodeURIComponent(
        new URL(
          "../packages/engine/src/physics/transfer-path.ts",
          import.meta.url,
        ).pathname,
      ),
  );
  const { transferSolution } = await load("flight/journey/transferModel.ts");
  for (const id of ["fast", "balanced", "efficient"])
    for (const altitude of [100, 300, 1000]) {
      const solution = transferSolution(TRANSFER_DATES[0], id);
      const path = engine.createTransferPath(
        solution.path,
        solution.moonPath.at(-1),
        altitude,
      );
      for (let i = 0; i <= 10000; i++) {
        const point = engine.sampleTransferPath(path, i / 10000);
        assert.ok(
          Math.hypot(...point) > 6.378,
          `${id}: transfer stays above Earth`,
        );
        assert.ok(
          Math.hypot(...point.map((v, axis) => v - path.moon[axis])) > 1.737,
          `${id} ${altitude}: transfer stays above Moon`,
        );
      }
      const startCapture = engine.sampleCapturePath(path, 0);
      assert.ok(
        Math.hypot(
          ...engine
            .sampleTransferPath(path, 1)
            .map((v, i) => v - startCapture[i]),
        ) < 1e-8,
        "coast and capture share boundary",
      );
      const incoming = engine
        .sampleTransferPath(path, 1 - 1e-8)
        .map((v, i) => startCapture[i] - v);
      const outgoing = engine
        .sampleCapturePath(path, 1e-5)
        .map((v, i) => v - startCapture[i]);
      const cosine =
        incoming.reduce((sum, v, i) => sum + v * outgoing[i], 0) /
        Math.hypot(...incoming) /
        Math.hypot(...outgoing);
      assert.ok(cosine > 0.999, "capture tangent joins coast without a corner");
      const a = engine.sampleTransferPath(path, 0.50001),
        b = engine.sampleTransferPath(path, 0.50002);
      assert.ok(
        Math.hypot(...a.map((v, i) => v - b[i])) > 0,
        "fractional progress moves between sampled indices",
      );
    }
  console.log("Journey orbit, reducer, fuel and replay checks passed");
} finally {
  await server.close();
}
