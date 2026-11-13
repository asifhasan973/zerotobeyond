import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(
  process.env.REPORT_PLAYWRIGHT_MODULE ?? "playwright"
);
const base = process.env.REPORT_APP_URL ?? "http://127.0.0.1:5173";
const artifacts =
  process.env.REPORT_ARTIFACT_DIR ?? "/tmp/crew-arrival-review/report";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader"],
});
const saved = readFileSync("/tmp/moon-report-completed-save.json", "utf8");
const checks = [];
const errors = [];
mkdirSync(artifacts, { recursive: true });
const ready = async (page) => {
  await page.waitForFunction(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((item) => item.name)
      .find((name) => name.includes("/packages/ui/src/state/loadingStore.ts"));
    return url && !(await import(url)).useLoadingStore.getState().isLoading;
  });
};
const open = async (save = saved, broken = false) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript((save) => {
    sessionStorage.setItem("exovisionaries_splash_session", "true");
    localStorage.setItem("zero_to_beyond_full_moon_v13", save);
  }, save);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  if (broken)
    await page.route("**/exploration/atlas.json", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
  await page.goto(base + "/?report=1");
  await page.locator(".moon-report").waitFor();
  await ready(page);
  await page.getByRole("link", { name: "Home", exact: true }).waitFor();
  return { context, page };
};
try {
  const { context, page } = await open();
  await page.locator(".report-reference-map").waitFor();
  await ready(page);
  const stored = await page.evaluate(() =>
    localStorage.getItem("zero_to_beyond_full_moon_v13"),
  );
  assert.equal(
    await page.getByRole("navigation", { name: "Report sections" }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("link", { name: "Home", exact: true }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", { name: "Home", exact: true }).count(),
    0,
  );
  assert.ok(
    await page
      .getByText("3 of 3 crew home on Earth", { exact: true })
      .isVisible(),
  );
  assert.ok((await page.locator(".report-finding-list > li").count()) <= 3);
  assert.equal(
    await page
      .getByRole("button", { name: "Export log", exact: true })
      .isVisible(),
    false,
  );
  for (const [width, height, name] of [
    [667, 375, "mobile"],
    [1024, 600, "tablet"],
    [1440, 900, "desktop"],
    [2560, 1080, "wide"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    await page.locator(".moon-report-content").evaluate((element) => {
      element.scrollTop = 0;
    });
    const bounds = await page.evaluate(() => {
      const rect = (selector) =>
        document.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        page: [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
        ],
        footer: rect(".moon-report-footer"),
        content: rect(".moon-report-content"),
        map: rect(".report-reference-map"),
        finding: rect(".report-finding-list > li"),
      };
    });
    assert.ok(
      bounds.page[0] <= width && bounds.page[1] <= height,
      JSON.stringify(bounds),
    );
    assert.ok(bounds.footer.bottom <= height + 1, JSON.stringify(bounds));
    assert.ok(
      bounds.map.y < bounds.footer.y && bounds.map.bottom > bounds.content.y,
      "Map is present on opening",
    );
    assert.ok(
      bounds.finding.y < bounds.footer.y,
      "A genuine result is present on opening",
    );
    await page.screenshot({ path: `${artifacts}/${name}.png` });
  }
  checks.push(
    "Location map and actual findings open together at four landscape sizes; footer remains visible without page overflow",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  const layer = (name) => page.getByRole("button", { name, exact: true });
  await layer("Temperature").click();
  assert.equal(await layer("Temperature").getAttribute("aria-pressed"), "true");
  assert.match(
    await page.locator(".report-map-caption").innerText(),
    /208.6 K/,
  );
  await page
    .getByText("Map sources, values and limits", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Reference region", exact: true })
    .selectOption("cabeus");
  await page
    .getByRole("button", { name: "Show temperature in Celsius", exact: true })
    .click();
  assert.match(
    await page.locator(".report-map-caption").innerText(),
    /−?\-?150.3 °C/,
  );
  assert.match(
    await page.locator(".report-reference-values").innerText(),
    /85.30° S/,
  );
  assert.ok(
    await page
      .getByRole("link", { name: "NASA LOLA terrain", exact: true })
      .isVisible(),
  );
  await page
    .getByText("Map sources, values and limits", { exact: true })
    .click();
  await layer("Slope").click();
  assert.match(await page.locator(".report-map-caption").innerText(), /13.2 °/);
  await layer("Terrain").focus();
  await page.keyboard.press("Enter");
  assert.equal(await layer("Terrain").getAttribute("aria-pressed"), "true");
  await layer("Zoom in").click();
  await page.locator(".moon-report-content").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: `${artifacts}/reference-layers.png` });
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("zero_to_beyond_full_moon_v13"),
    ),
    stored,
  );
  checks.push(
    "Terrain default, temperature units, slope, selected reference region, zoom, keyboard and source links work without changing mission save",
  );
  await page.getByText("Flight details", { exact: true }).click();
  assert.ok(
    await page
      .getByRole("button", { name: "Export log", exact: true })
      .isVisible(),
  );
  await page.getByText("Measurement records and IDs", { exact: true }).click();
  assert.ok((await page.locator(".report-flight-details code").count()) > 0);
  await page.getByText("Compare with a saved attempt", { exact: true }).click();
  await page
    .getByRole("button", {
      name: "Save this attempt for comparison",
      exact: true,
    })
    .click();
  assert.ok(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zero_to_beyond_mission_comparison_v1"))
          .version === 1,
    ),
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("zero_to_beyond_full_moon_v13"),
    ),
    stored,
  );
  await page.getByText("Flight details", { exact: true }).click();
  await page
    .getByRole("button", { name: "Try another mission", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("zero_to_beyond_full_moon_v13"),
    ),
    stored,
  );
  checks.push(
    "Collapsed flight details retain resources, raw IDs, logs and comparison; canceling another mission preserves current save",
  );
  await context.close();

  const { context: emptyContext, page: emptyPage } = await open();
  await emptyPage.locator(".report-reference-map").waitFor();
  await emptyPage.evaluate(async () => {
    const paths = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name);
    const module = (suffix) =>
      import(paths.find((path) => path.includes(suffix)));
    const savedModule = await module("/src/game/moon/crew/selectionSession.ts");
    const workshop = await module(
      "/src/game/moon/workshop/lander/workshopSession.ts",
    );
    const { MissionDebrief } = await module(
      "/src/game/moon/return/debrief/MissionDebrief.tsx",
    );
    const react = await import(paths.find((path) => /\/react\.js/.test(path)));
    const client = await import(
      paths.find((path) => /react-dom_client\.js/.test(path))
    );
    const savedState = savedModule.readBrowserSelectionSession();
    const session = workshop.createWorkshopSession(
      savedState.progress,
      savedState.preparation,
      savedState.readiness,
      savedState.flight,
      savedState.moon,
      savedState.repair,
    );
    session.moon.science.records = [];
    session.moon.science.samples = [];
    session.moon.evidence = [];
    session.moon.crewOperations.firstSteps = false;
    session.moon.crewOperations.flagPlanted = false;
    for (const key of [
      "supportUnitsRemaining",
      "platformEnergyWh",
      "returnPropellantKg",
      "descentPropellantKg",
    ])
      session.moon.resources[key] = null;
    const host = document.createElement("div");
    host.id = "empty-report-fixture";
    host.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:#100b26;padding:16px";
    document.body.append(host);
    (client.createRoot ?? client.default.createRoot)(host).render(
      (react.createElement ?? react.default.createElement)(MissionDebrief, {
        session,
      }),
    );
  });
  const emptyFixture = emptyPage.locator("#empty-report-fixture");
  await emptyFixture
    .getByText(
      "No measurements recorded. Collect a reading on your next mission.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await emptyFixture.locator(".report-finding-list > li").count(),
    0,
  );
  assert.equal(
    await emptyFixture
      .getByText("Your ExoVisionaries mission flag was planted.", {
        exact: true,
      })
      .count(),
    0,
  );
  assert.ok(
    await emptyFixture
      .getByText("3 of 3 crew home on Earth", { exact: true })
      .isVisible(),
  );
  await emptyPage.screenshot({ path: `${artifacts}/empty-results.png` });
  await emptyFixture.getByText("Flight details", { exact: true }).click();
  for (const name of [
    "Supplies used",
    "Cabin energy used",
    "Descent propellant used",
    "Service propellant used",
  ]) {
    assert.match(
      await emptyFixture
        .locator(".report-resource-list div")
        .filter({ hasText: name })
        .locator("dd")
        .innerText(),
      /Unavailable/,
    );
  }
  await emptyContext.close();
  checks.push(
    "Rendered empty-data fixture keeps map and true recovery, skips unperformed flag action, and preserves unknown resource balances",
  );

  const { context: failedContext, page: failedPage } = await open(saved, true);
  await failedPage
    .getByRole("button", { name: "Retry reference map", exact: true })
    .waitFor();
  assert.ok(
    await failedPage
      .getByRole("heading", { name: "What we found", exact: true })
      .isVisible(),
  );
  await failedPage.unroute("**/exploration/atlas.json");
  await failedPage
    .getByRole("button", { name: "Retry reference map", exact: true })
    .click();
  await failedPage.locator(".report-reference-map").waitFor();
  await ready(failedPage);
  await failedContext.close();
  checks.push(
    "NASA data failure preserves results and source access; Retry restores map",
  );

  const missing = await browser.newContext({
    viewport: { width: 1024, height: 600 },
    reducedMotion: "reduce",
  });
  await missing.addInitScript(() =>
    sessionStorage.setItem("exovisionaries_splash_session", "true"),
  );
  const missingPage = await missing.newPage();
  await missingPage.goto(base + "/?report=1");
  await missingPage
    .getByRole("heading", {
      name: "No completed mission report is available",
      exact: true,
    })
    .waitFor();
  await missingPage.goto(base + "/?explore=atlas");
  await missingPage.locator(".report-reference-map").waitFor();
  assert.equal(
    await missingPage
      .getByRole("button", {
        name: "Open your completed mission report",
        exact: true,
      })
      .count(),
    0,
  );
  assert.equal(
    await missingPage.evaluate(() =>
      localStorage.getItem("zero_to_beyond_full_moon_v13"),
    ),
    null,
  );
  await missing.close();
  checks.push(
    "Standalone Atlas remains available without creating a completed mission save",
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    `${artifacts}/checks.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors, artifacts }, null, 2));
} finally {
  await browser.close();
}
