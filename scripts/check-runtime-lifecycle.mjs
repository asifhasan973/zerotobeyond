import "./register-workspace.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const ts = await import("typescript");
function load(file, imports, extra = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (id) => {
      assert(id in imports, id);
      return imports[id];
    },
    console,
    ...extra,
  });
  return exports;
}
const timers = new Map();
let timerId = 0;
const setTimer = (fn) => {
  timers.set(++timerId, fn);
  return timerId;
};
const clearTimer = (id) => timers.delete(id);
const flush = () => {
  const jobs = [...timers.values()];
  timers.clear();
  jobs.forEach((fn) => fn());
};
let images = 0;
class ImageStub {
  constructor() {
    images++;
    this.complete = false;
    this.naturalWidth = 0;
    ImageStub.last = this;
  }
  decode() {
    return new Promise(() => {});
  }
}
const imagesModule = load(
  "packages/engine/src/loadingEngine.ts",
  {},
  { Image: ImageStub, setTimeout: setTimer, clearTimeout: clearTimer },
);
const first = imagesModule.preloadImage("/dedup");
assert.equal(imagesModule.preloadImage("/dedup"), first);
assert.equal(images, 1);
flush();
await first;
const stuck = imagesModule.preloadImage("/decode"); // Download succeeds, decode never resolves.
// Expose the last test image without depending on loader internals.
assert.equal(images, 2);
ImageStub.last.complete = true;
ImageStub.last.naturalWidth = 10;
ImageStub.last.onload();
flush();
await stuck;
assert.equal(timers.size, 0);
const listeners = new Map(),
  refs = [],
  effects = [];
let cursor = 0,
  effectCursor = 0,
  writes = 0,
  latestWritten;
const react = {
  useRef: (value) => {
    const i = cursor++;
    return refs[i] ?? (refs[i] = { current: value });
  },
  useEffect: (fn, deps) => {
    const i = effectCursor++,
      old = effects[i];
    if (!old || deps.some((d, k) => d !== old.deps[k])) {
      old?.cleanup?.();
      effects[i] = { deps, cleanup: fn() };
    }
  },
};
const persistence = load(
  "apps/web/src/game/moon/stages/useStoryPersistence.ts",
  {
    react: react,
    "@/game/moon/crew/selectionSession": {
      writeBrowserSelectionSession: (...args) => {
        writes++;
        latestWritten = args;
        return true;
      },
    },
  },
  {
    setTimeout: setTimer,
    clearTimeout: clearTimer,
    window: {
      addEventListener: (n, fn) => listeners.set(n, fn),
      removeEventListener: (n) => listeners.delete(n),
    },
    document: {
      hidden: true,
      addEventListener: (n, fn) => listeners.set(n, fn),
      removeEventListener: (n) => listeners.delete(n),
    },
  },
);
// Use real mission defaults so checkpoint paths match production state.
const { createRequire } = await import("node:module");
const req = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createServer } = await import(req.resolve("vite"));
const server = await createServer({
  root: "apps/web",
  configFile: "apps/web/vite.config.ts",
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { createWorkshopSession } = await server.ssrLoadModule(
    "/src/game/moon/workshop/lander/workshopSession.ts",
  );
  const { createStoryProgress } = await server.ssrLoadModule(
    "/src/game/moon/core/progress.ts",
  );
  const mission = createWorkshopSession(createStoryProgress());
  const latest = { current: { ...mission, voiceEnabled: true } };
  const noop = () => {};
  const render = () => {
    cursor = 0;
    effectCursor = 0;
    latest.current = { ...mission, voiceEnabled: true };
    persistence.useStoryPersistence(mission, latest, true, true, noop, noop);
  };
  render();
  assert.equal(writes, 1);
  for (let i = 1; i <= 20; i++) {
    mission.flight = { ...mission.flight, t: i };
    render();
  }
  assert.equal(
    writes,
    1,
    "simulation updates must not synchronously write each tick",
  );
  assert.equal(timers.size, 1);
  flush();
  assert.equal(writes, 2);
  assert.equal(latestWritten[4].t, 20, "save must use latest state");
  mission.progress = { ...mission.progress, stepId: "objective" };
  render();
  assert.equal(writes, 3, "step transitions save immediately");
  mission.flight = { ...mission.flight, t: 30 };
  render();
  listeners.get("visibilitychange")();
  assert.equal(latestWritten[4].t, 30);
  effects.forEach((e) => e.cleanup?.());
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
  const { useLoadingStore, registerPreloaderHandlers } =
    await server.ssrLoadModule(
      "/@fs" + process.cwd() + "/packages/ui/src/state/loadingStore.ts",
    );
  let entries = 0;
  registerPreloaderHandlers({
    preloadEntry: async () => {
      entries++;
    },
  });
  let resolveTask;
  useLoadingStore
    .getState()
    .registerLoaderTask(new Promise((r) => (resolveTask = r)));
  let finished = false;
  const loading = useLoadingStore
    .getState()
    .startLoading("page")
    .then(() => (finished = true));
  await Promise.resolve();
  assert.equal(entries, 0);
  assert.equal(finished, false, "page loader must await early registered work");
  resolveTask();
  await loading;
  assert.equal(useLoadingStore.getState().pendingTasks.length, 0);
  useLoadingStore.getState().completeLoading();
  useLoadingStore.getState().registerLoaderTask(Promise.resolve());
  assert.equal(useLoadingStore.getState().pendingTasks.length, 0);
  console.log(
    "Runtime lifecycle checks passed: image request deduplication, bounded image warmup, throttled latest-state saves, transition/exit flushes, loading-task cleanup and page isolation.",
  );
} finally {
  await server.close();
}
