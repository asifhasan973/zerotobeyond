import "./register-workspace.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { separation, positionAt, C_KMS, AU_KM, LY_KM } =
  await import("../packages/engine/src/cosmic/index.ts");
const d = JSON.parse(
  readFileSync("apps/web/public/exploration/cosmic/catalogue.json", "utf8"),
);
if (d.chunks?.length) {
  d.objects = d.chunks.flatMap((url) => {
    const bytes = readFileSync("apps/web/public" + url);
    assert(
      bytes.length < 25 * 1024 * 1024,
      "Catalogue part exceeds Pages limit",
    );
    return JSON.parse(bytes.toString("utf8"));
  });
}
assert.equal(d.version, 1);
assert(d.objects.length > 1000);
assert.equal(new Set(d.objects.map((o) => o.id)).size, d.objects.length);
for (const o of d.objects) {
  assert(o.source.startsWith("https://"));
  assert(o.position.every(Number.isFinite));
  if (o.samples) {
    assert.equal(o.samples.length, 121);
    assert.equal(positionAt(o, o.samples[0].jd - 1), null);
    assert.equal(positionAt(o, o.samples.at(-1).jd + 1), null);
    assert.deepEqual(positionAt(o, o.samples[0].jd), o.samples[0].position);
    const a = o.samples[0],
      b = o.samples[1],
      p = positionAt(o, (a.jd + b.jd) / 2);
    p.forEach((v, k) =>
      assert(Math.abs(v - (a.position[k] + b.position[k]) / 2) < 1e-3),
    );
  }
  if (o.kind === "galaxy" || o.kind === "quasar") {
    assert(o.redshift > 0);
    assert(o.lookbackGyr > 0 && o.lookbackGyr < 14);
  }
}
assert.equal(separation([0, 0, 0], [3, 4, 0]), 5);
assert.equal(separation([1, 2, 3], [1, 2, 3]), 0);
assert(Math.abs(LY_KM / C_KMS - 31557600) < 1);
assert(AU_KM > 1e8);
const earth = d.objects.find((o) => o.id === "399"),
  webb = d.objects.find((o) => o.id === "-170");
const jd = earth.samples[60].jd;
assert(separation(positionAt(earth, jd), positionAt(webb, jd)) > 1e6);
console.log(
  `Cosmic checks passed: ${d.objects.length} sourced objects; bounded interpolation, identities, units and distance provenance.`,
);
const { matchesCosmicFilter, distanceLabel, durationLabel } =
  await import("../packages/engine/src/cosmic/index.ts");
const stars = d.objects.filter((o) => o.id.startsWith("hyg-"));
assert(stars.length > 50000);
const octants = new Set(
  stars.map((o) => o.position.map((v) => (v >= 0 ? "1" : "0")).join("")),
);
assert.equal(octants.size, 8, "Star selection must cover all sky octants");
assert(
  stars.every((o) => Math.hypot(...o.position) < 100000 * 3.085677581491367e13),
  "Exclude unknown-distance sentinel",
);
assert(stars.some((o) => o.name === "Sirius"));
for (const kind of [
  "planet",
  "moon",
  "spacecraft",
  "star",
  "galaxy",
  "quasar",
]) {
  const subset = d.objects.filter((o) => matchesCosmicFilter(o, kind, []));
  assert(subset.length);
  assert(subset.every((o) => o.kind === kind));
}
assert(matchesCosmicFilter(earth, "bookmarks", ["399"]));
assert(!matchesCosmicFilter(webb, "bookmarks", ["399"]));
assert.equal(durationLabel(AU_KM / C_KMS), "8 min 19 sec");
assert.equal(distanceLabel(LY_KM * 2421.45), "≈2,420 light-years");
assert(d.objects.find((o) => o.id === "599").radiusKm > earth.radiusKm * 10);
assert(d.objects.find((o) => o.id === "199").radiusKm < earth.radiusKm);
console.log(
  "Coverage, named search, shared filtering, physical radii and readable units passed.",
);

const { COSMIC_TEXTURES } =
  await import("../apps/web/src/features/cosmic/assetRegistry.ts");
for (const path of Object.values(COSMIC_TEXTURES))
  assert(readFileSync("apps/web/public" + path).length > 1000);
console.log("All registered planet maps exist on disk.");
const { orbitGuide } = await import("../packages/engine/src/cosmic/index.ts");
for (const o of d.objects.filter((o) => o.kind === "planet")) {
  const path = orbitGuide(o);
  assert.equal(path.length, 257);
  assert(path.flat().every(Number.isFinite));
  assert(separation(path[0], path.at(-1)) < 0.01);
  const radii = path.map((v) => Math.hypot(...v));
  const current = Math.hypot(...o.samples[60].position);
  assert(
    current >= Math.min(...radii) * 0.999 &&
      current <= Math.max(...radii) * 1.001,
  );
}
assert.equal(orbitGuide(webb).length, 0);
console.log(
  "Planetary orbit guides are finite, closed and bracket the input state radius; spacecraft are excluded.",
);

const solar = JSON.parse(
  readFileSync("apps/web/public/exploration/cosmic/solar-system.json", "utf8"),
);
assert.equal(solar.objects.length, 16);
assert(solar.objects.every((o) => o.samples?.length === 121));
for (const o of solar.objects)
  assert.deepEqual(
    o,
    d.objects.find((c) => c.id === o.id),
  );
console.log(
  "Solar-only tool snapshot matches all 16 original ephemeris objects.",
);
