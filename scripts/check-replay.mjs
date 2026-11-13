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
  const load = (name) => server.ssrLoadModule(`/src/game/moon/core/${name}.ts`);
  const { replayMissionPage } = await load("missionReplay");
  const { createMissionCheckpoint } = await load("missionCheckpoints");
  const { STORY_FLOW } = await load("flow");
  for (const objective of ["lunar-ice", "lunar-geology"]) {
    for (const [index, step] of STORY_FLOW.entries()) {
      const source = createMissionCheckpoint(step.id, {
        objective,
        playerName: "Explorer",
      });
      source.future = [source.preparation];
      source.progress.lineIndex = 4;
      source.progress.completedActivities = STORY_FLOW.flatMap((s) =>
        s.kind === "activity" ? [s.activity] : [],
      );
      const before = JSON.stringify(source);
      const replay = replayMissionPage(source);
      assert.equal(replay.progress.stepId, step.id);
      assert.equal(replay.progress.lineIndex, 0);
      assert.deepEqual(replay.future, []);
      assert.equal(replay.review, undefined);
      const prior = new Set(
        STORY_FLOW.slice(0, index).flatMap((s) =>
          s.kind === "activity" ? [s.activity] : [],
        ),
      );
      assert.ok(
        replay.progress.completedActivities.every((id) => prior.has(id)),
        step.id,
      );
      assert.equal(
        JSON.stringify(source),
        before,
        "Replay must not mutate the old save",
      );
      if (step.module > 2)
        assert.deepEqual(replay.preparation, source.preparation);
    }
  }
  const power = createMissionCheckpoint("power-check");
  power.readiness.trial.phase = "complete";
  power.review = {
    anchor: { ...power.progress, stepId: "crew-return" },
    forward: [{ stepId: "crew-return", lineIndex: 0 }],
  };
  const replay = replayMissionPage(power);
  assert.equal(replay.readiness.trial.phase, "ready");
  assert.equal(replay.moon.returnFlight.stage, "ready");
  assert.equal(replay.review, undefined);
  const entry = createMissionCheckpoint("power-check");
  entry.readiness.trial.batteryWh = 123;
  const exact = replayMissionPage(power, entry);
  assert.deepEqual(exact.moon, entry.moon);
  assert.equal(exact.readiness.trial.batteryWh, 123);
  console.log(
    "Replay: both mission objectives, all story pages, future completion removal, immutable saves, review exit and power trial reset passed.",
  );
} finally {
  await server.close();
}
