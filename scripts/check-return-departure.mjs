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
  const { createMissionCheckpoint } = await server.ssrLoadModule(
    "/src/game/moon/core/missionCheckpoints.ts",
  );
  const { reduceMission } = await server.ssrLoadModule(
    "/src/game/moon/workshop/lander/workshopSession.ts",
  );
  const { canDock, restoreReturn } = await server.ssrLoadModule(
    "/src/game/moon/return/return.ts",
  );
  for (const objective of ["lunar-ice", "lunar-geology"]) {
    let s = createMissionCheckpoint("crew-return", { objective });
    const act = (event) => (s = reduceMission(s, event));
    act({ type: "return-resume" });
    act({ type: "return-action", action: "launch" });
    for (let i = 0; i < 30 && s.moon.returnFlight.stage === "ascending"; i++)
      act({ type: "return-tick", seconds: 0.5 });
    assert.equal(s.moon.returnFlight.stage, "rendezvous");
    assert.equal(canDock(s.moon.returnFlight), false);
    act({ type: "return-action", action: "dock" });
    assert.equal(s.moon.returnFlight.stage, "rendezvous");
    for (let i = 0; i < 3; i++) act({ type: "return-action", action: "brake" });
    for (let i = 0; i < 3; i++) act({ type: "return-action", action: "left" });
    assert.ok(canDock(s.moon.returnFlight));
    act({ type: "return-action", action: "dock" });
    assert.equal(s.moon.returnFlight.crewLocation, "command-module");
    act({ type: "return-action", action: "depart" });
    for (const pilot of [
      { firing: false },
      { firing: true, angle: 30 },
      { angle: 0, throttle: 0 },
    ]) {
      act({ type: "return-burn-pilot", ...pilot });
      const before = s.moon.returnFlight;
      for (let i = 0; i < 15; i++) act({ type: "return-tick", seconds: 0.5 });
      assert.equal(
        s.moon.returnFlight.frame,
        before.frame,
        "Invalid burn must not advance",
      );
      assert.equal(
        s.moon.returnFlight.serviceUsedKg,
        before.serviceUsedKg,
        "No progress must not consume teaching-model burn resources",
      );
    }
    act({ type: "return-burn-pilot", angle: 0, throttle: 0.7, firing: true });
    act({ type: "return-tick", seconds: 0.5 });
    const live = s.moon.returnFlight;
    const restored = restoreReturn(JSON.parse(JSON.stringify(live)), s.moon);
    assert.equal(restored.stage, live.stage);
    assert.equal(restored.frame, live.frame);
    assert.equal(restored.burnThrottle, 0.7);
    assert.equal(restored.burnDv, live.burnDv);
    act({ type: "return-pause" });
    const paused = s.moon.returnFlight.frame;
    act({ type: "return-tick", seconds: 0.5 });
    assert.equal(s.moon.returnFlight.frame, paused);
    act({ type: "return-resume" });
    for (let i = 0; i < 100 && s.moon.returnFlight.stage === "burning"; i++)
      act({ type: "return-tick", seconds: 0.5 });
    assert.equal(s.moon.returnFlight.stage, "coast");
    assert.equal(s.moon.returnFlight.burnDv, 1200);
    assert.equal(s.moon.returnFlight.burnFiring, false);
  }
  console.log(
    "Return departure passed: both objectives, liftoff, unsafe/safe docking, burn alignment/power gates, pause, receipt restoration and completed Earth course.",
  );
} finally {
  await server.close();
}
