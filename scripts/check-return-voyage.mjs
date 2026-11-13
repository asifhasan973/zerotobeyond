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
  const { canDock, restoreReturn, emptyReturn, returnVisualFrame } =
    await server.ssrLoadModule("/src/game/moon/return/return.ts");
  const visual = {
    ...emptyReturn(),
    stage: "coast",
    frame: 12,
    remainder: 0.04,
    speed: 1,
  };
  assert.ok(
    Math.abs(returnVisualFrame(visual, 0) - 12.4) < 1e-8,
    "Fractional simulation time must reach the renderer",
  );
  assert.ok(
    returnVisualFrame(visual, 0.05) > returnVisualFrame(visual, 0),
    "Spacecraft must advance between 100-ms ticks",
  );
  assert.equal(
    returnVisualFrame(visual, 10),
    returnVisualFrame(visual, 0.1),
    "A stalled tab must not extrapolate beyond the next tick",
  );
  assert.equal(
    returnVisualFrame({ ...visual, paused: true }, 0.1),
    returnVisualFrame(visual, 0),
    "Paused rendering must not advance beyond the saved fractional frame",
  );
  assert.equal(
    returnVisualFrame({ ...visual, stage: "burning", burnFiring: false }, 0.1),
    12.4,
  );
  assert.equal(
    returnVisualFrame(
      { ...visual, stage: "burning", burnFiring: true, burnAngle: 30 },
      0.1,
    ),
    12.4,
  );
  assert.equal(
    returnVisualFrame({ ...visual, frame: 89, remainder: 0.09, speed: 5 }, 0.1),
    90,
    "Visual interpolation must stop at the phase boundary",
  );
  const { RETURN_COAST_SECONDS, RETURN_REFERENCE, sampleReturnTrajectory } =
    await server.ssrLoadModule(
      "../../packages/engine/src/physics/return-trajectory.ts",
    );
  let lastAltitude = Infinity;
  const expectedEnergy =
    -RETURN_REFERENCE.mu /
    (RETURN_REFERENCE.perigeeKm + RETURN_REFERENCE.apogeeKm);
  for (let i = 0; i <= 1000; i++) {
    const state = sampleReturnTrajectory(i / 1000);
    assert.ok(state.position.every(Number.isFinite));
    assert.ok(
      state.altitudeKm <= lastAltitude + 1e-7,
      "Inbound coast must approach Earth monotonically",
    );
    const energy =
      state.speedKmS ** 2 / 2 -
      RETURN_REFERENCE.mu / (state.altitudeKm + RETURN_REFERENCE.earthRadiusKm);
    assert.ok(
      Math.abs(energy - expectedEnergy) < 1e-8,
      "Two-body energy must be conserved",
    );
    lastAltitude = state.altitudeKm;
  }
  assert.ok(
    Math.abs(sampleReturnTrajectory(0).altitudeKm - (384400 - 6371)) < 1e-6,
  );
  assert.ok(Math.abs(sampleReturnTrajectory(1).altitudeKm - 121.92) < 1e-6);
  assert.ok(
    sampleReturnTrajectory(1).speedKmS > 10.8 &&
      sampleReturnTrajectory(1).speedKmS < 11.2,
  );
  assert.ok(
    RETURN_COAST_SECONDS > 2 * 86400 && RETURN_COAST_SECONDS < 4 * 86400,
  );
  const phases = [
    "ready",
    "ascending",
    "rendezvous",
    "docked",
    "burning",
    "coast",
    "entry-ready",
    "entry",
    "chute-ready",
    "chutes",
    "splashdown",
  ];
  for (const objective of ["lunar-ice", "lunar-geology"]) {
    let s = createMissionCheckpoint("crew-return", { objective });
    const snapshots = new Map();
    const checkedLiveReplay = new Set();
    const playback = new Map();
    const act = (event) => (s = reduceMission(s, event));
    act({ type: "return-resume" });
    for (let guard = 0; guard < 2200; guard++) {
      const r = s.moon.returnFlight;
      if (!snapshots.has(r.stage)) snapshots.set(r.stage, structuredClone(s));
      if (r.stage === "splashdown") break;
      if (
        ["ascending", "burning", "coast", "entry", "chutes"].includes(
          r.stage,
        ) &&
        r.frame > 0 &&
        !checkedLiveReplay.has(r.stage)
      ) {
        checkedLiveReplay.add(r.stage);
        const replayed = reduceMission(s, { type: "return-replay" });
        const boundary = snapshots.get(r.stage).moon.returnFlight;
        assert.equal(replayed.moon.returnFlight.frame, boundary.frame);
        assert.equal(replayed.moon.returnFlight.paused, false);
        assert.ok(
          Math.abs(
            replayed.moon.returnFlight.elapsedSeconds - boundary.elapsedSeconds,
          ) < 1e-6,
        );
        assert.ok(
          replayed.moon.returnFlight.serviceUsedKg <= r.serviceUsedKg + 1e-6,
        );
      }
      if (r.stage === "entry-ready" && r.serviceSeparated) {
        const back = reduceMission(s, { type: "return-back" });
        assert.equal(back.moon.returnFlight.stage, "entry-ready");
        assert.ok(!back.moon.returnFlight.serviceSeparated);
      }
      let action =
        r.stage === "ready"
          ? "launch"
          : r.stage === "rendezvous"
            ? r.closingMS > 0.25
              ? "brake"
              : Math.abs(r.alignment) > 0.2
                ? "left"
                : "dock"
            : r.stage === "docked"
              ? "depart"
              : r.stage === "entry-ready"
                ? r.serviceSeparated
                  ? "shield"
                  : "separate"
                : r.stage === "chute-ready"
                  ? "chutes"
                  : null;
      if (!action) playback.set(r.stage, (playback.get(r.stage) ?? 0) + 0.5);
      act(
        action
          ? { type: "return-action", action }
          : { type: "return-tick", seconds: 0.5 },
      );
    }
    assert.equal(s.moon.returnFlight.stage, "splashdown");
    assert.ok(s.moon.outcome);
    assert.equal(s.moon.returnFlight.crewLocation, "ocean");
    assert.equal(s.moon.returnFlight.serviceSeparated, true);
    for (const [index, phase] of phases.entries()) {
      const snapshot = snapshots.get(phase);
      assert.ok(snapshot, "Missing phase " + phase);
      const replayed = reduceMission(snapshot, { type: "return-replay" });
      assert.equal(replayed.progress.stepId, "crew-return");
      assert.equal(replayed.moon.returnFlight.stage, phase);
      const restored = restoreReturn(
        JSON.parse(JSON.stringify(replayed.moon.returnFlight)),
        replayed.moon,
      );
      assert.equal(restored.stage, phase);
      assert.ok(
        Math.abs(
          restored.elapsedSeconds - replayed.moon.returnFlight.elapsedSeconds,
        ) < 1e-6,
      );
      if (index) {
        const back = reduceMission(snapshot, { type: "return-back" });
        assert.equal(back.progress.stepId, "crew-return");
        assert.equal(
          back.moon.returnFlight.stage,
          phases[index - 1],
          "Back from " + phase,
        );
        assert.equal(back.moon.returnFlight.paused, true);
        assert.ok(
          back.moon.returnFlight.elapsedSeconds <=
            snapshot.moon.returnFlight.elapsedSeconds + 1e-6,
          `${phase}: ${back.moon.returnFlight.elapsedSeconds} > ${snapshot.moon.returnFlight.elapsedSeconds}`,
        );
        assert.equal(back.moon.outcome, null);
        assert.ok(
          !back.moon.checkpoints.some((c) => c.id === "crew-recovered"),
        );
        assert.equal(
          restoreReturn(
            JSON.parse(JSON.stringify(back.moon.returnFlight)),
            back.moon,
          ).stage,
          phases[index - 1],
        );
      }
    }
    act({ type: "next" });
    assert.equal(s.progress.stepId, "mission-debrief");
    const backFromReport = reduceMission(s, { type: "return-back" });
    assert.equal(backFromReport.progress.stepId, "crew-return");
    assert.equal(backFromReport.moon.returnFlight.stage, "splashdown");
    assert.equal(
      reduceMission(backFromReport, { type: "return-back" }).moon.returnFlight
        .stage,
      "chutes",
    );
    assert.equal(checkedLiveReplay.size, 5);
    for (const [phase, maximum] of [
      ["burning", 15],
      ["entry", 15],
      ["chutes", 10],
    ]) {
      assert.ok(
        playback.get(phase) <= maximum,
        `${phase} playback took ${playback.get(phase)}s; expected <= ${maximum}s`,
      );
    }
  }
  console.log(
    `Return voyage passed: fractional rendering, bounded extrapolation, pause/burn gates, shorter playback, 1001 orbit samples, conserved energy, ${(RETURN_COAST_SECONDS / 86400).toFixed(2)}-day coast, both objectives through splashdown, all 11 phase Back/Replay boundaries and receipt restoration.`,
  );
} finally {
  await server.close();
}
