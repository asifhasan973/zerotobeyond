import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(
  process.env.JOURNEY_PLAYWRIGHT_MODULE ?? "playwright"
);
const output = process.env.JOURNEY_UI_OUTPUT ?? "/tmp/journey-ui";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1196, height: 588 },
  reducedMotion: "reduce",
  hasTouch: true,
});
const key = "zero_to_beyond_full_moon_v13";
const save = readFileSync(
  process.env.JOURNEY_SAVE_INPUT ?? "/tmp/journey-route-save.json",
  "utf8",
);
await context.addInitScript(
  ({ save, key }) => {
    sessionStorage.setItem("exovisionaries_splash_session", "true");
    if (!localStorage.getItem(key)) localStorage.setItem(key, save);
  },
  { save, key },
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const evidence = { layouts: [], checks: [], errors };
const primary = () =>
  page.locator(".conversation-controls [data-primary-action]");
async function ready() {
  await page
    .locator(".loading-screen-root")
    .waitFor({ state: "hidden", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
}
async function enter() {
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await page.locator("#journey-title").waitFor({ timeout: 60000 });
  await ready();
}
async function state() {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)).moon.journey,
    key,
  );
}
async function layout(phase) {
  for (const [width, height] of [
    [1196, 588],
    [1366, 768],
    [1024, 768],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const result = await page.evaluate(() => {
      const selectors = [
        ".journey-main",
        ".journey-console",
        ".journey-heading",
        ".journey-scene",
        ".conversation-controls",
        ".journey-camera-controls",
      ];
      const bounds = {};
      for (const sel of selectors) {
        const e = document.querySelector(sel);
        const r = e.getBoundingClientRect();
        bounds[sel] = {
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
          scrollHeight: e.scrollHeight,
          clientHeight: e.clientHeight,
        };
      }
      const clipped = [
        ...document.querySelectorAll(
          ".journey-console input,.journey-console output,.journey-console progress,.journey-console button,.journey-console p,.journey-console label,.journey-routes button,.conversation-controls button",
        ),
      ]
        .filter((e) => e.getClientRects().length)
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.bottom > innerHeight + 1 ||
            r.top < 0 ||
            r.right > innerWidth + 1 ||
            r.left < 0 ||
            (e.closest(".journey-console") &&
              r.bottom > bounds[".journey-console"].bottom + 1)
          );
        })
        .map((e) => e.getAttribute("aria-label") ?? e.textContent);
      return {
        bounds,
        clipped,
        fullscreen: !!document.fullscreenElement,
        documentScroll:
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth,
      };
    });
    evidence.layouts.push({ phase, width, height, ...result });
    await page.screenshot({ path: `${output}/${phase}-${width}.png` });
    assert.equal(
      result.documentScroll,
      false,
      `${phase} ${width}: page scroll`,
    );
    assert.deepEqual(result.clipped, [], `${phase} ${width}: clipped controls`);
    assert.ok(
      result.bounds[".journey-console"].scrollHeight <=
        result.bounds[".journey-console"].clientHeight + 1,
      `${phase} ${width}: controls overflow`,
    );
    assert.equal(result.fullscreen, false, "no automatic fullscreen");
  }
  await page.setViewportSize({ width: 1196, height: 588 });
}
async function slider(name, value) {
  const e = page.getByRole("slider", { name });
  await e.focus();
  if (name === "Engine throttle" && value === 1) {
    await page.keyboard.press("End");
    return;
  }
  await page.keyboard.press("Home");
  const steps =
    name === "Burn alignment" ? value + 90 : Math.round(value * 100);
  for (let i = 0; i < steps; i++) await page.keyboard.press("ArrowRight");
  assert.equal(
    Number(await e.inputValue()),
    value,
    `${name}: keyboard adjustment`,
  );
}
async function recordFrames() {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((name) => /\/three\.js\?/.test(name));
    if (!url) throw new Error("Three module missing from resource inventory");
    const THREE = await import(url);
    const update = THREE.Scene.prototype.updateMatrixWorld;
    window.journeyFrames = [];
    THREE.Scene.prototype.updateMatrixWorld = function (force) {
      const result = update.call(this, force);
      const scene = this;
      const ship = scene.getObjectByName("journey-spacecraft");
      if (ship && window.journeyFrames.length < 30000)
        window.journeyFrames.push({
          t: performance.now(),
          p: ship.position.toArray(),
          q: ship.quaternion.toArray(),
          active:
            document
              .querySelector(".journey-engine")
              ?.getAttribute("aria-pressed") === "true" ||
            !!(
              document.querySelector('[aria-label="Pause journey"]') &&
              document.querySelector('[aria-label="Journey phase progress"]')
            ),
          stage: document.querySelector("#journey-title")?.textContent,
        });
      return result;
    };
  });
  await page.waitForFunction(() => window.journeyFrames.length > 0);
}
async function burn(phase) {
  console.log("START", phase);
  await primary().click();
  await page.getByRole("slider", { name: "Burn alignment" }).waitFor();
  await page
    .getByRole("button", { name: "Pause journey", exact: true })
    .click();
  await layout(phase);
  const beforeView = await page.evaluate(() => window.journeyFrames.at(-1).p);
  await page
    .getByRole("button", { name: "Trajectory view", exact: true })
    .click();
  await page.waitForTimeout(1200);
  assert.deepEqual(
    await page.evaluate(() => window.journeyFrames.at(-1).p),
    beforeView,
    "trajectory and craft views share the same position",
  );
  await page.screenshot({ path: `${output}/${phase}-trajectory.png` });
  await page.getByRole("button", { name: "Craft view", exact: true }).click();
  await page.waitForTimeout(1200);

  await page
    .getByRole("button", { name: "Resume journey", exact: true })
    .click();
  await slider("Burn alignment", 0);
  await slider("Engine throttle", 0.1);
  const engine = page.getByRole("button", { name: "Fire engine", exact: true });
  await engine.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Cut engine", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Pause journey", exact: true })
    .click();
  assert.equal((await state()).firing, false, "pause cuts engine");
  await page
    .getByRole("button", { name: "Resume journey", exact: true })
    .click();
  await page.locator(".journey-scene").focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(150);
  await page.keyboard.up("Space");
  await page
    .getByRole("button", { name: "Fire engine", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Fire engine", exact: true }).click();
  await page.getByRole("button", { name: "Flight model", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
  assert.equal((await state()).firing, false, "modal cuts engine");
  const before = (await state()).dv;
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  assert.equal((await state()).dv, before, "modal freezes burn");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Resume journey", exact: true })
    .click();
  await slider("Engine throttle", 1);
  await page.getByRole("button", { name: "Fire engine", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".journey-engine").getAttribute("aria-pressed") ===
      "true",
  );
  for (let i = 0; i < 1600; i++) {
    const progress = await page
      .locator(".journey-instrument progress")
      .evaluate((e) => ({ value: e.value, max: e.max }));
    if (
      (await page.locator(".journey-engine").getAttribute("aria-pressed")) ===
      "false"
    )
      break;
    if (progress.value / progress.max > 0.8) {
      await slider("Engine throttle", 0.1);
      break;
    }
    if (i % 100 === 0) console.log("BURN", phase, progress);
    await page.waitForTimeout(50);
  }
  await page.waitForFunction(
    () =>
      document.querySelector(".journey-engine").getAttribute("aria-pressed") ===
      "false",
    { timeout: 90000 },
  );
  await page.waitForTimeout(150);
  assert.equal(
    (await state()).paused,
    false,
    "burn reaches target without failure",
  );
  assert.equal(
    await primary().isEnabled(),
    true,
    "target and engine cutoff enable confirmation",
  );
  await primary().click();
  evidence.checks.push(
    `${phase}: touch/mouse, Space, native Enter, pause, modal and cutoff`,
  );
}
async function navigationChecks() {
  await layout("route");
  await page.getByRole("button", { name: /Medium transfer/ }).click();
  await primary().click();
  for (const [width, height] of [
    [1196, 588],
    [1366, 768],
    [1024, 768],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    const fits = await page.locator(".journey-orbit-dialog").evaluate((d) => {
      const r = d.getBoundingClientRect();
      return (
        d.scrollHeight <= d.clientHeight + 1 &&
        r.top >= 0 &&
        r.bottom <= innerHeight &&
        [...d.querySelectorAll("button")].every((b) => {
          const p = b.getBoundingClientRect();
          return p.bottom <= innerHeight && p.top >= 0;
        })
      );
    });
    assert.ok(fits, `orbit modal fits ${width}x${height}`);
    await page.screenshot({ path: `${output}/orbit-modal-${width}.png` });
  }
  await page.getByRole("radio", { name: /1000 km/ }).click();
  await page.keyboard.press("Escape");
  await page.reload();
  await ready();
  await enter();
  assert.equal(
    (await state()).orbitTier,
    "high",
    "cancelled selection persists on route screen",
  );
  await primary().click();
  await page
    .getByRole("button", { name: "Confirm orbit", exact: true })
    .click();
  await primary().click();
  await page.getByRole("slider", { name: "Burn alignment" }).waitFor();
  await page.getByRole("button", { name: "Fire engine", exact: true }).tap();
  await page.getByRole("button", { name: "Cut engine", exact: true }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page
    .getByRole("button", { name: "Fire engine", exact: true })
    .waitFor();
  assert.equal((await state()).firing, false, "blur cuts touch-fired engine");
  await page.getByRole("button", { name: "Fire engine", exact: true }).tap();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator(".conversation-game.is-review").waitFor();
  assert.equal((await state()).firing, false, "Back cuts engine before review");
  await primary().click();
  await page.getByRole("slider", { name: "Burn alignment" }).waitFor();
  assert.equal(
    (await state()).orbitTier,
    "high",
    "Back/Next retain locked target",
  );
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.waitForFunction(
    (key) =>
      JSON.parse(localStorage.getItem(key)).moon.journey.stage === "complete",
    key,
  );
  assert.equal((await state()).orbitTier, "high", "Skip retains locked target");
  assert.equal((await state()).firing, false);
  assert.equal(await page.getByRole("button", { name: /Debug/ }).count(), 0);
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), false);
  evidence.checks.push(
    "Route and orbit modal fit four viewports; cancellation/reload, touch, blur, Back/Next and Skip preserve the selected orbit",
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(evidence, null, 2));
}
try {
  await page.goto(process.env.JOURNEY_APP_URL ?? "http://127.0.0.1:5180/");
  await ready();
  await enter();
  if (process.env.JOURNEY_UI_PHASE === "navigation") {
    await navigationChecks();
  } else {
    await recordFrames();
    await page.getByRole("button", { name: /Medium transfer/ }).click();
    await primary().click();
    await page
      .getByRole("dialog", { name: "Choose your lunar orbit" })
      .waitFor();
    await page.getByRole("radio", { name: /300 km/ }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(
      (await state()).stage,
      "route",
      "cancel does not start flight",
    );
    await primary().click();
    assert.equal(
      await page
        .getByRole("radio", { name: /300 km/ })
        .getAttribute("aria-checked"),
      "true",
    );
    await page
      .getByRole("button", { name: "Confirm orbit", exact: true })
      .click();
    assert.equal((await state()).orbitTier, "mid");
    await burn("departure");
    await page.waitForFunction(
      (key) =>
        JSON.parse(localStorage.getItem(key)).moon.journey.stage ===
        "loi-window",
      key,
      { timeout: 30000 },
    );
    assert.equal(
      await page
        .getByRole("radiogroup", { name: "Target lunar orbit" })
        .count(),
      0,
      "arrival has briefing, no target selector",
    );
    const departureFrames = await page.evaluate(() => window.journeyFrames);
    await page.reload();
    await ready();
    await enter();
    await recordFrames();
    assert.equal(
      (await state()).orbitTier,
      "mid",
      "selected orbit survives reload",
    );
    if ((await state()).paused)
      await page
        .getByRole("button", { name: "Resume journey", exact: true })
        .click();
    await burn("capture");
    assert.equal((await state()).stage, "complete");
    await primary().click();
    await primary().click();
    for (
      let i = 0;
      i < 6 &&
      !(await page.getByText("Bring it down softly", { exact: true }).count());
      i++
    ) {
      await ready();
      console.log("HANDOFF", await primary().innerText());
      await primary().click();
      await page.waitForTimeout(300);
    }
    await page
      .getByText("Bring it down softly", { exact: true })
      .waitFor({ timeout: 30000 });
    evidence.checks.push(
      "Normal Journey UI reaches landing handoff with saved 300 km target",
    );
    const frames = [
      ...departureFrames,
      ...(await page.evaluate(() => window.journeyFrames)),
    ];
    assert.ok(frames.length > 100, "flight render frames collected");
    const turns = [];
    let movingFrames = 0,
      repeatedFrames = 0,
      activeFrames = 0,
      activeMovingFrames = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1],
        b = frames[i];
      const angle =
        2 *
        Math.acos(
          Math.min(1, Math.abs(a.q.reduce((sum, v, j) => sum + v * b.q[j], 0))),
        );
      if (b.t > a.t && b.t - a.t < 80) turns.push(angle);
      if (a.active && b.active) {
        activeFrames++;
        if (Math.hypot(...a.p.map((v, j) => v - b.p[j])) > 1e-10)
          activeMovingFrames++;
      }
      if (Math.hypot(...a.p.map((v, j) => v - b.p[j])) > 1e-10) movingFrames++;
      else repeatedFrames++;
    }
    assert.ok(
      Math.max(...turns) < 0.2,
      "craft attitude never flips between frames",
    );
    console.log("MOTION", {
      activeFrames,
      activeMovingFrames,
      ratio: activeMovingFrames / activeFrames,
    });
    writeFileSync(`${output}/motion.json`, JSON.stringify(frames));
    assert.ok(
      activeMovingFrames / activeFrames > 0.7,
      "motion advances between simulation ticks",
    );
    evidence.motion = {
      frames: frames.length,
      movingFrames,
      repeatedFrames,
      activeFrames,
      activeMovingFrames,
      maxFrameTurnRadians: Math.max(...turns),
    };
    writeFileSync(`${output}/motion.json`, JSON.stringify(frames));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(evidence, null, 2));
  }
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  console.log(
    "FAILURE STATE",
    await state(),
    (await page.locator("body").innerText()).slice(-2500),
  );
  throw error;
} finally {
  writeFileSync(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
