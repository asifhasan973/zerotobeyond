import "./register-workspace.mjs";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const {
  AU_KM,
  C_KMS,
  solarCoordinates,
  solarTravel,
  solarDateBounds,
  positionAt,
  advanceSolarClock,
} = await import("../packages/engine/src/cosmic/index.ts");
const { SOLAR_DETAILS, FEATURED_SPACECRAFT } =
  await import("../packages/data/src/cosmic/index.ts");
const { COSMIC_TEXTURES, SOLAR_ASSETS } =
  await import("../apps/web/src/features/cosmic/assetRegistry.ts");
const data = JSON.parse(
  readFileSync("apps/web/public/exploration/cosmic/solar-system.json", "utf8"),
);
const bounds = solarDateBounds(data.objects);
assert(bounds && bounds.max > bounds.min);
assert.equal(solarDateBounds([]), null);
assert.equal(
  solarDateBounds([
    { samples: [{ jd: 1 }, { jd: 2 }] },
    { samples: [{ jd: 3 }, { jd: 4 }] },
  ]),
  null,
);
assert.deepEqual(
  solarDateBounds([
    { samples: [{ jd: 1 }, { jd: 5 }] },
    { samples: [{ jd: 2 }, { jd: 4 }] },
  ]),
  { min: 2, max: 4 },
);
const ids = new Set(data.objects.map((o) => o.id));
for (const object of data.objects) {
  assert(SOLAR_DETAILS[object.id], object.name);
  const position = positionAt(object, (bounds.min + bounds.max) / 2);
  assert(position?.every(Number.isFinite));
  const scene = solarCoordinates(position);
  assert(scene.every(Number.isFinite));
  assert(
    Math.abs(Math.hypot(...scene) - Math.hypot(...position) / AU_KM) < 1e-10,
  );
  assert.equal(positionAt(object, bounds.min - 1), null);
}
assert.deepEqual(solarCoordinates([AU_KM, 0, 0]), [1, 0, -0]);
const inclination = (23.43928 * Math.PI) / 180;
assert(
  Math.abs(
    solarCoordinates([
      0,
      Math.cos(inclination) * AU_KM,
      Math.sin(inclination) * AU_KM,
    ])[1],
  ) < 1e-12,
);
for (const id of FEATURED_SPACECRAFT) assert(ids.has(id));
const departure = Date.UTC(2026, 10, 14);
const trip = solarTravel(20 * 86400 * 100, 20, departure);
assert.equal(trip.seconds, 100 * 86400);
assert.equal(trip.arrivalMs, departure + 100 * 86400000);
assert.equal(solarTravel(AU_KM, C_KMS, departure).seconds, AU_KM / C_KMS);
for (const [distance, speed, time] of [
  [-1, 20, departure],
  [1, 0, departure],
  [1, -1, departure],
  [1, C_KMS + 1, departure],
  [NaN, 20, departure],
  [1, 20, NaN],
])
  assert.equal(solarTravel(distance, speed, time), null);
for (const url of [
  SOLAR_ASSETS.welcome,
  ...Object.values(COSMIC_TEXTURES),
  ...Object.values(SOLAR_ASSETS.cards),
])
  assert(existsSync("apps/web/public" + url), url);
assert.deepEqual(advanceSolarClock(4.9, 86400, 1, { min: 1, max: 5 }), {
  jd: 5,
  rate: 0,
  atLimit: true,
});
assert.deepEqual(advanceSolarClock(1.1, -86400, 1, { min: 1, max: 5 }), {
  jd: 1,
  rate: 0,
  atLimit: true,
});
assert.deepEqual(advanceSolarClock(2, 3600, 12, { min: 1, max: 5 }), {
  jd: 2.5,
  rate: 3600,
  atLimit: false,
});
assert.deepEqual(advanceSolarClock(2, 1, 1, { min: 1, max: 5 }, 6), {
  jd: 5,
  rate: 0,
  atLimit: true,
});
console.log(
  `Solar checks passed: ${ids.size} selectable objects, ecliptic coordinate conversion, coverage intersection, travel/arrival units, six featured spacecraft, local assets and boundary-safe simulation time.`,
);
