import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MISSION,
  evaluateMission,
  validateMission,
  parseHorizons,
  validateGeometry,
} from "../packages/engine/src/engineering/index.ts";
import {
  HORIZONS_REFERENCE,
  ENGINEERING_INSTRUMENTS,
} from "../packages/data/src/engineering/index.ts";
import { handleEngineeringHorizons } from "../apps/web/server/engineering/horizons.ts";
const copy = (v) => structuredClone(v);
const run = (changes = {}, geometry = HORIZONS_REFERENCE) =>
  evaluateMission({ ...copy(DEFAULT_MISSION), ...changes }, geometry);

test("NASA references retain exact published allocation values and provenance", () => {
  assert.equal(
    ENGINEERING_INSTRUMENTS.find((p) => p.id === "lroc").massKg,
    16.5,
  );
  assert.equal(
    ENGINEERING_INSTRUMENTS.find((p) => p.id === "lola").powerW,
    39.6,
  );
  assert.ok(ENGINEERING_INSTRUMENTS.every((p) => p.sourceId === "lro-2007"));
  assert.equal(validateGeometry(HORIZONS_REFERENCE).length, 0);
  assert.equal(HORIZONS_REFERENCE.samples.length, 25);
  assert.equal(HORIZONS_REFERENCE.timeScale, "TDB");
});
test("baseline is reproducible, immutable and meets all explicit requirements", () => {
  const before = JSON.stringify(DEFAULT_MISSION);
  const a = run();
  assert.deepEqual(a, run());
  assert.equal(JSON.stringify(DEFAULT_MISSION), before);
  assert.equal(a.passed, true);
  assert.ok(a.checks.every((c) => c.passed));
  assert.ok(a.deliveredGbit > 0);
  assert.ok(a.massKg > 0);
});
test("power and per-instrument data are conserved, including curtailed and lost amounts", () => {
  for (const batteryWh of [30, 120, 260, 520])
    for (const storageGbit of [0.1, 4, 12]) {
      const r = run({ batteryWh, storageGbit });
      assert.ok(
        Math.abs(
          batteryWh +
            r.generatedWh -
            r.servedWh -
            r.lossWh -
            r.curtailedWh -
            r.endWh,
        ) < 1e-6,
      );
      assert.ok(
        r.points.every((p) => p.batteryWh >= 0 && p.batteryWh <= batteryWh),
      );
      for (const p of r.payloads)
        assert.ok(
          Math.abs(
            p.producedGbit - p.deliveredGbit - p.storedGbit - p.lostGbit,
          ) < 1e-7,
        );
    }
});
test("small battery, small storage, missing instrument and insufficient downlink fail for distinct reasons", () => {
  assert.equal(
    run({ batteryWh: 30 }).checks.find((c) => c.id === "power").passed,
    false,
  );
  assert.ok(run({ storageGbit: 0.1 }).lostGbit > 0);
  assert.equal(
    run({ instrumentIds: ["lola"], objective: "imagery" }).checks.find(
      (c) => c.id === "payload",
    ).passed,
    false,
  );
  assert.equal(
    run({ transmitterW: 5 }).checks.find((c) => c.id === "science").passed,
    false,
  );
  assert.equal(
    run({ massLimitKg: 130 }).checks.find((c) => c.id === "mass").passed,
    false,
  );
  assert.equal(
    run({ creditLimit: 100 }).checks.find((c) => c.id === "credits").passed,
    false,
  );
});
test("NASA distance changes the link calculation through the inverse-square law", () => {
  const twice = copy(HORIZONS_REFERENCE);
  twice.samples.forEach((p) => {
    p.xKm *= 2;
    p.yKm *= 2;
    p.zKm *= 2;
  });
  const a = run();
  const b = run({}, twice);
  assert.ok(Math.abs(b.delaySeconds / a.delaySeconds - 2) < 1e-10);
  assert.ok(Math.abs(a.downlinkMbps / b.downlinkMbps - 4) < 1e-10);
});
test("corrupt drafts, impossible schedules and geometry/date mismatches cannot produce results", () => {
  for (const value of [
    null,
    {},
    { ...DEFAULT_MISSION, batteryWh: NaN },
    { ...DEFAULT_MISSION, instrumentIds: ["bad"] },
    { ...DEFAULT_MISSION, instrumentIds: ["lroc", "lroc"] },
    { ...DEFAULT_MISSION, observationMinutes: 90 },
    { ...DEFAULT_MISSION, date: "2026-02-30" },
  ])
    assert.ok(validateMission(value).length);
  assert.throws(() => run({ date: "2026-11-14" }), /date/i);
  assert.throws(
    () => run({}, { ...HORIZONS_REFERENCE, samples: [] }),
    /geometry|samples/i,
  );
});
test("Horizons CSV parser rejects truncated, erroneous and wrong-frame responses", () => {
  const raw = {
    signature: { source: "NASA/JPL Horizons API", version: "1.3" },
    result:
      "Target body name: Moon (301)\nCenter body name: Earth (399)\nOutput units : KM-S\nReference frame : ICRF\n$$SOE\n" +
      Array.from(
        { length: 25 },
        (_, h) =>
          `${2461357.5 + h / 24}, A.D. 2026-Nov-${h === 24 ? "14" : "13"} ${String(h % 24).padStart(2, "0")}:00:00.0000, 384400, 0, 0, 0, 0, 0,`,
      ).join("\n") +
      "\n$$EOE",
  };
  const r = parseHorizons(raw, "2026-11-13", "2026-11-13T00:00:00Z");
  assert.equal(r.samples.length, 25);
  assert.equal(r.samples[0].xKm, 384400);
  assert.throws(() =>
    parseHorizons({ error: "No ephemeris" }, "2026-11-13", "now"),
  );
  assert.throws(() =>
    parseHorizons(
      { ...raw, result: raw.result.replace("ICRF", "ECLIPTIC") },
      "2026-11-13",
      "now",
    ),
  );
  assert.throws(() =>
    parseHorizons(
      { ...raw, result: raw.result.replace("$$EOE", "") },
      "2026-11-13",
      "now",
    ),
  );
});
test("API adapter validates before fetch, restricts upstream and reports failure honestly", async () => {
  let calls = 0;
  const bad = await handleEngineeringHorizons(
    new Request("http://local/api/engineering/horizons?date=2026-02-30"),
    async () => {
      calls++;
      throw new Error("Must not call");
    },
  );
  assert.equal(bad.status, 400);
  assert.equal(calls, 0);
  const failure = await handleEngineeringHorizons(
    new Request("http://local/api/engineering/horizons?date=2026-11-13"),
    async (url) => {
      assert.equal(new URL(url).hostname, "ssd.jpl.nasa.gov");
      return new Response("offline", { status: 502 });
    },
  );
  assert.equal(failure.status, 502);
  assert.match(await failure.text(), /unavailable/i);
  const post = await handleEngineeringHorizons(
    new Request("http://local/api/engineering/horizons", { method: "POST" }),
  );
  assert.equal(post.status, 405);
});

test("reports preserve exact source vectors, both designs and calculation mapping; HTML escapes user text", async () => {
  const { buildBlueprintReport, blueprintReportHtml } =
    await import("../apps/web/src/features/engineering/blueprint/report.ts");
  const draft = {
    ...copy(DEFAULT_MISSION),
    name: '<script>alert("unsafe")</script>',
  };
  const baseline = {
    draft: copy(DEFAULT_MISSION),
    geometry: copy(HORIZONS_REFERENCE),
    savedAt: "2026-11-13T00:00:00Z",
  };
  const report = buildBlueprintReport(draft, HORIZONS_REFERENCE, baseline);
  assert.deepEqual(report.geometry.samples, HORIZONS_REFERENCE.samples);
  assert.equal(report.baseline.draft.batteryWh, DEFAULT_MISSION.batteryWh);
  assert.ok(report.derivations.some((d) => d.sources.includes("horizons")));
  assert.ok(report.sources.every((s) => s.usedIn.length && s.limitations));
  const html = blueprintReportHtml(report);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("NASA API provenance"));
  assert.ok(html.includes("sources") || html.includes("Sources"));
});
test("successful API responses retain query provenance and are cacheable", async () => {
  const lines = HORIZONS_REFERENCE.samples
    .map(
      (s) =>
        `${s.jdTdb}, ${s.calendarTdb}, ${s.xKm}, ${s.yKm}, ${s.zKm}, 0, 0, 0,`,
    )
    .join("\n");
  const raw = {
    signature: { version: "1.3" },
    result: `Target body name: Moon (301)\nCenter body name: Earth (399)\nOutput units : KM-S\nReference frame : ICRF\n$$SOE\n${lines}\n$$EOE`,
  };
  const response = await handleEngineeringHorizons(
    new Request("http://local/api/engineering/horizons?date=2026-11-13"),
    async (url) => {
      const q = new URL(url).searchParams;
      assert.equal(q.get("CENTER"), "'500@399'");
      assert.equal(q.get("TIME_TYPE"), "'TDB'");
      assert.equal(q.get("REF_SYSTEM"), "'ICRF'");
      return Response.json(raw);
    },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(validateGeometry(body).length, 0);
  assert.deepEqual(body.samples, HORIZONS_REFERENCE.samples);
  assert.match(response.headers.get("cache-control"), /max-age=3600/);
});
