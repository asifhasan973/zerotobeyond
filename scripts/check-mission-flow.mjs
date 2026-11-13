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
  const load = (path) => server.ssrLoadModule("/src/game/moon/" + path);
  const { advanceMissionSkip, navigateBack, navigateForward } = await load(
    "core/missionNavigation.ts",
  );
  const { createWorkshopSession, reduceMission } = await load(
    "workshop/lander/workshopSession.ts",
  );
  const { createStoryProgress } = await load("core/progress.ts");
  const { STORY_FLOW } = await load("core/flow.ts");
  const { writeSelectionSession, readSelectionSession } = await load(
    "crew/selectionSession.ts",
  );
  const { completedMission } = await load("return/debrief/missionReport.ts");
  let transitions = 0;

  for (const objective of ["lunar-ice", "lunar-geology"]) {
    for (const customCrew of [false, true]) {
      let mission = createWorkshopSession(createStoryProgress());
      mission = reduceMission(mission, {
        type: "set-name",
        name: "Sequence Explorer",
        gender: "male",
      });
      const seen = new Set([mission.progress.stepId]);
      for (let i = 0; i < STORY_FLOW.length; i++) {
        if (mission.progress.stepId === "objective") {
          mission = reduceMission(mission, {
            type: "select",
            choiceId: objective,
          });
        }
        if (customCrew && mission.progress.stepId === "crew-selection") {
          mission = reduceMission(mission, {
            type: "moon-assign-crew",
            role: "scientist",
            id: objective === "lunar-ice" ? "astrobiologist" : "geologist",
          });
          mission = reduceMission(mission, {
            type: "moon-assign-crew",
            role: "support",
            id: "systems-engineer",
          });
        }
        if (
          mission.progress.stepId === "lunar-surface" &&
          !mission.moon.crewOperations.arrivalComplete
        ) {
          assert.equal(
            advanceMissionSkip(mission),
            mission,
            "arrival cannot be skipped",
          );
          mission = reduceMission(mission, { type: "crew-check-in" });
          mission = reduceMission(mission, { type: "crew-step-out" });
          for (let frame = 0; frame < 15; frame++)
            mission = reduceMission(mission, {
              type: "crew-tick",
              seconds: 0.25,
            });
          mission = reduceMission(mission, { type: "crew-plant-flag" });
          for (let frame = 0; frame < 8; frame++)
            mission = reduceMission(mission, {
              type: "crew-tick",
              seconds: 0.25,
            });
          assert.equal(mission.moon.crewOperations.flagPlanted, true);
          mission = reduceMission(mission, { type: "crew-begin-exploring" });
        }
        const before = JSON.stringify(mission);
        const next = advanceMissionSkip(mission);
        if (mission.moon.crewOperations.flagPlanted)
          assert.equal(
            next.moon.crewOperations.flagPlanted,
            true,
            "later chapter shortcuts must retain the planted mission flag",
          );
        assert.equal(
          JSON.stringify(mission),
          before,
          "skip must not mutate its source",
        );
        if (next === mission) {
          assert.equal(mission.progress.stepId, "mission-debrief");
          break;
        }
        assert.notEqual(next.progress.stepId, mission.progress.stepId);
        assert.ok(!seen.has(next.progress.stepId), "sequence must not loop");
        seen.add(next.progress.stepId);
        const data = new Map();
        const storage = {
          getItem: (key) => data.get(key) ?? null,
          setItem: (key, value) => data.set(key, value),
        };
        writeSelectionSession(
          storage,
          next.progress,
          false,
          next.preparation,
          next.readiness,
          next.flight,
          next.moon,
          next.repair,
        );
        const restored = readSelectionSession(storage);
        assert.equal(
          restored.progress.stepId,
          next.progress.stepId,
          `${objective}: ${next.progress.stepId} must survive reopen`,
        );
        assert.equal(restored.progress.playerName, "Sequence Explorer");
        if (
          customCrew &&
          STORY_FLOW.find((step) => step.id === next.progress.stepId).module >=
            4
        ) {
          assert.equal(restored.moon.crew.support, "systems-engineer");
        }
        if (next.progress.stepId === "crew-return") {
          const back = navigateBack(next);
          assert.ok(back.review, "post-launch Back must enter review");
          const forward = navigateForward(back);
          assert.equal(forward.progress.stepId, "crew-return");
          assert.deepEqual(forward.moon.returnFlight, back.moon.returnFlight);
        }
        mission = next;
        transitions++;
      }
      assert.equal(mission.progress.stepId, "mission-debrief");
      assert.ok(completedMission(mission));
    }
  }
  const unnamed = advanceMissionSkip(
    createWorkshopSession(createStoryProgress()),
  );
  assert.ok(
    unnamed.progress.playerName.trim(),
    "skip must supply a valid fallback name",
  );
  console.log(
    `Passed: ${transitions} saved mission transitions across Ice/Geology and selected crews, Back/Next review, final reports and unnamed Skip.`,
  );
} finally {
  await server.close();
}
