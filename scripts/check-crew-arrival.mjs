import assert from "node:assert/strict";
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
  const { createSurfaceDemo, createLandingDemo, createReturnDemo } = await load(
    "flight/journey/journeyDemo.ts",
  );
  const { reduceMission } = await load("workshop/lander/workshopSession.ts");
  const { createMissionCheckpoint } = await load("core/missionCheckpoints.ts");
  const { advanceMissionSkip } = await load("core/missionNavigation.ts");
  for (const objective of ["lunar-ice", "lunar-geology"]) {
    for (const stepId of ["lunar-surface", "surface-explore", "surface-ready", "ice-science", "science-ready", "surface-recovery", "surface-secured"]) {
      assert.equal(createMissionCheckpoint(stepId, {objective}).moon.crewOperations.arrivalComplete, false, `${stepId} must not pre-complete the player's arrival`);
    }
    const arrival = createMissionCheckpoint("lunar-surface", { objective });
    assert.equal(
      arrival.moon.crewOperations.arrivalComplete,
      false,
      "Entering the surface chapter must show first steps before the rover",
    );
    const landing = createMissionCheckpoint("lunar-descent", { objective });
    const skippedLanding = advanceMissionSkip(landing);
    assert.equal(skippedLanding.progress.stepId, "lunar-surface");
    assert.equal(
      skippedLanding.moon.crewOperations.arrivalComplete,
      false,
      "Skipping descent must stop at the mandatory arrival scene",
    );
    assert.equal(
      advanceMissionSkip(arrival),
      arrival,
      "Global Skip must not jump from an unfinished arrival to crew return",
    );
  }
  let s = createSurfaceDemo("female", "lunar-ice");
  assert.ok(
    s.moon.crewOperations,
    "arrival state must exist in the real mission",
  );
  const { emptyCrewOperations, restoreCrewOperations } = await load(
    "surface/arrival/crewOperations.ts",
  );
  s = {
    ...s,
    moon: {
      ...s.moon,
      crewOperations: emptyCrewOperations(s.moon.designSignature),
    },
  };
  const act = (event) => {
    s = reduceMission(s, event);
  };
  act({ type: "surface-deploy" });
  assert.equal(
    s.moon.surface.deployed,
    false,
    "deployment waits for human arrival",
  );
  act({ type: "crew-step-out" });
  assert.equal(
    s.moon.crewOperations.stage,
    "inside",
    "radio check precedes egress",
  );
  act({ type: "crew-check-in" });
  act({ type: "crew-step-out" });
  assert.equal(s.moon.crewOperations.stage, "egress");
  for (let i = 0; i < 6; i++) act({ type: "crew-tick", seconds: 0.25 });
  assert.equal(
    s.moon.crewOperations.firstSteps,
    false,
    "both crew must finish egress",
  );
  act({ type: "crew-pause" });
  const frozen = s.moon.crewOperations;
  act({ type: "crew-tick", seconds: 0.25 });
  assert.equal(s.moon.crewOperations, frozen, "pause freezes animation");
  act({ type: "crew-resume" });
  for (let i = 0; i < 10; i++) act({ type: "crew-tick", seconds: 0.25 });
  assert.equal(s.moon.crewOperations.stage, "outside");
  assert.equal(s.moon.crewOperations.firstSteps, true);
  act({ type: "crew-plant-flag" });
  assert.equal(s.moon.crewOperations.flagPlanted, false);
  for (let i = 0; i < 8; i++) act({ type: "crew-tick", seconds: 0.25 });
  assert.equal(s.moon.crewOperations.flagPlanted, true);
  assert.equal(s.moon.crewOperations.stage, "ready");
  const completed = s.moon.crewOperations;
  act({ type: "crew-plant-flag" });
  assert.equal(
    s.moon.crewOperations,
    completed,
    "repeated actions do not duplicate receipts",
  );
  const orbitOnlySkip = {
    ...completed,
    commands: [{ type: "crew-skip-arrival", context: "lunar-orbit" }],
  };
  assert.equal(
    restoreCrewOperations(orbitOnlySkip, s.moon).arrivalComplete,
    false,
    "a pre-descent shortcut does not skip arrival on reopening",
  );
  const { readSelectionSession, writeSelectionSession } = await load(
    "crew/selectionSession.ts",
  );
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  writeSelectionSession(
    storage,
    s.progress,
    false,
    s.preparation,
    s.readiness,
    s.flight,
    s.moon,
  );
  assert.equal(
    readSelectionSession(storage).moon.crewOperations.flagPlanted,
    true,
    "atomic save restores validated planting",
  );
  const restored = restoreCrewOperations(
    JSON.parse(JSON.stringify(completed)),
    s.moon,
  );
  assert.equal(
    restored.flagPlanted,
    true,
    "actual planting survives reopening",
  );
  const forged = restoreCrewOperations({ ...completed, commands: [] }, s.moon);
  assert.equal(
    forged.flagPlanted,
    false,
    "unearned saved flags cannot manufacture actions",
  );
  act({ type: "crew-begin-exploring" });
  const { replayMissionPage } = await load("core/missionReplay.ts");
  let replayed = replayMissionPage(s);
  assert.equal(
    replayed.moon.crewOperations.flagPlanted,
    false,
    "arrival replay invalidates the flag",
  );
  replayed = replayMissionPage({
    ...s,
    progress: { ...s.progress, stepId: "surface-explore" },
  });
  assert.equal(
    replayed.moon.crewOperations.flagPlanted,
    true,
    "exploration replay retains arrival",
  );
  act({ type: "crew-replay" });
  assert.equal(s.moon.crewOperations.flagPlanted, false);
  act({ type: "crew-skip-arrival" });
  assert.equal(s.moon.crewOperations.stage, "ready");
  assert.equal(s.moon.crewOperations.firstSteps, false);
  assert.equal(s.moon.crewOperations.flagPlanted, false);
  assert.equal(s.moon.crewOperations.surfaceCheck, false);
  act({ type: "surface-deploy" });
  act({ type: "crew-replay" });
  assert.equal(
    s.moon.surface.stage,
    "stowed",
    "replaying arrival invalidates deployment",
  );
  assert.equal(
    s.moon.returnFlight.signature,
    null,
    "arrival replay invalidates later return flight",
  );
  const skippedArrival = restoreCrewOperations(
    {
      ...completed,
      commands: [{ type: "crew-skip-arrival", context: "surface" }],
    },
    s.moon,
  );
  assert.equal(
    skippedArrival.arrivalComplete,
    false,
    "an older skipped arrival must be offered on reopening",
  );
  assert.equal(skippedArrival.flagPlanted, false);
  const reopenedSkip = restoreCrewOperations(JSON.parse(JSON.stringify(skippedArrival)), s.moon);
  assert.equal(reopenedSkip.assisted, true, "old shortcut history survives a second save/reopen");
  assert.equal(reopenedSkip.arrivalComplete, false);
  const legacy = restoreCrewOperations(undefined, {
    ...s.moon,
    surface: { ...s.moon.surface, deployed: true },
  });
  assert.equal(
    legacy.arrivalComplete,
    false,
    "old saves must show the missed arrival without inventing a flag",
  );
  assert.equal(legacy.flagPlanted, false, "old saves gain no flag");
  let orbital = createLandingDemo("female", "lunar-ice");
  orbital = {
    ...orbital,
    progress: { ...orbital.progress, stepId: "lunar-orbit" },
    moon: {
      ...orbital.moon,
      crewOperations: emptyCrewOperations(orbital.moon.designSignature),
    },
  };
  assert.equal(
    reduceMission(orbital, { type: "next" }),
    orbital,
    "normal descent waits for crew handoff",
  );
  orbital = reduceMission(orbital, { type: "crew-handoff" });
  assert.equal(
    reduceMission(orbital, { type: "next" }).progress.stepId,
    "lunar-descent",
  );
  let returning = createReturnDemo("female");
  returning = {
    ...returning,
    moon: {
      ...returning.moon,
      crewOperations: emptyCrewOperations(returning.moon.designSignature),
    },
  };
  assert.equal(
    reduceMission(returning, { type: "return-action", action: "launch" }),
    returning,
    "liftoff waits for return preparation contact",
  );
  returning = reduceMission(returning, { type: "crew-return-check" });
  assert.equal(returning.moon.crewOperations.returnCheck, true);
  returning = reduceMission(returning, {
    type: "return-action",
    action: "launch",
  });
  assert.equal(returning.moon.returnFlight.stage, "ascending");
  writeSelectionSession(
    storage,
    returning.progress,
    false,
    returning.preparation,
    returning.readiness,
    returning.flight,
    returning.moon,
  );
  assert.equal(
    readSelectionSession(storage).moon.crewOperations.returnCheck,
    true,
    "return contact survives liftoff and reopening",
  );
  const { crewRadioPaused } = await load("crew/operations/crewIdentity.ts");
  const staleArrivalPause = {
    ...returning,
    moon: {
      ...returning.moon,
      crewOperations: {
        ...returning.moon.crewOperations,
        arrivalComplete: true,
        paused: true,
      },
      returnFlight: { ...returning.moon.returnFlight, paused: false },
      rover: returning.moon.rover
        ? { ...returning.moon.rover, paused: false }
        : undefined,
    },
  };
  assert.equal(
    crewRadioPaused(staleArrivalPause, "handoff"),
    false,
    "Home/Back must not permanently disable a new handoff radio",
  );
  assert.equal(
    crewRadioPaused(staleArrivalPause, "departure"),
    false,
    "Old arrival pause must not silence a later departure check",
  );
  assert.equal(
    crewRadioPaused(staleArrivalPause, "touchdown"),
    false,
    "Exploration radio follows the rover instead of a completed arrival pause",
  );
  assert.equal(
    crewRadioPaused(
      {
        ...staleArrivalPause,
        moon: {
          ...staleArrivalPause.moon,
          returnFlight: {
            ...staleArrivalPause.moon.returnFlight,
            paused: true,
          },
        },
      },
      "departure",
    ),
    true,
  );
  assert.equal(
    crewRadioPaused(
      {
        ...staleArrivalPause,
        moon: {
          ...staleArrivalPause.moon,
          crewOperations: {
            ...staleArrivalPause.moon.crewOperations,
            arrivalComplete: false,
          },
        },
      },
      "touchdown",
    ),
    true,
  );
  let combinations = 0;
  for (const objective of ["lunar-ice", "lunar-geology"]) {
    for (const scientist of ["geologist", "astrobiologist"]) {
      for (const support of ["robotics-specialist", "systems-engineer"]) {
        for (const gender of ["female", "male"]) {
          let mission = createSurfaceDemo(gender, objective, {
            crew: { scientist, support },
          });
          mission = {
            ...mission,
            moon: {
              ...mission.moon,
              crewOperations: emptyCrewOperations(mission.moon.designSignature),
            },
          };
          const run = (event) => {
            mission = reduceMission(mission, event);
          };
          run({ type: "crew-check-in" });
          run({ type: "crew-step-out" });
          for (let i = 0; i < 15; i++)
            run({ type: "crew-tick", seconds: 0.25 });
          run({ type: "crew-plant-flag" });
          for (let i = 0; i < 8; i++) run({ type: "crew-tick", seconds: 0.25 });
          assert.equal(
            mission.moon.crewOperations.flagPlanted,
            true,
            `${objective}/${scientist}/${support}/${gender}`,
          );
          assert.equal(mission.moon.crew.scientist, scientist);
          assert.equal(mission.moon.crew.support, support);
          writeSelectionSession(
            storage,
            mission.progress,
            false,
            mission.preparation,
            mission.readiness,
            mission.flight,
            mission.moon,
          );
          assert.equal(
            readSelectionSession(storage).moon.crewOperations.flagPlanted,
            true,
          );
          combinations++;
        }
      }
    }
  }
  console.log(
    `Crew arrival checks passed: radio/egress/planting, pause, repeat actions, Back/Replay, save restoration, honest skips/legacy saves, departure gates and ${combinations} mission/crew/gender combinations.`,
  );
} finally {
  await server.close();
}
