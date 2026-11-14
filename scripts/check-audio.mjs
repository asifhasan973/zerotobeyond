import "./register-workspace.mjs";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createServer } = await import(req.resolve("vite"));
const server = await createServer({
  root: "apps/web",
  configFile: "apps/web/vite.config.ts",
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const load = (p) => server.ssrLoadModule("/src/game/moon/" + p);
  const { VOICE_CLIPS, recordedVoiceURL } = await load(
    "narrative/voice/voiceClips.ts",
  );
  const urls = new Set();
  for (const [id, clip] of Object.entries(VOICE_CLIPS))
    for (const gender of ["male", "female"]) {
      const url = recordedVoiceURL(id, clip.text, clip.character, gender);
      assert(url, `${id} ${gender} mapping`);
      assert(
        existsSync("apps/web/public" + url),
        `${id} ${gender} file missing`,
      );
      assert(readFileSync("apps/web/public" + url).length > 1000);
      urls.add(url);
      if (clip.character === "commander")
        assert.equal(url.includes("/male/"), gender === "male");
    }
  const { NarrationController } = await load("narrative/voice/narration.ts");
  const { useAudioStore, useOrientationLifecycleStore } = await server
    .ssrLoadModule("/@fs" + process.cwd() + "/packages/ui/src/index.ts")
    .then(async (ui) => ({
      ...ui,
      ...(await server.ssrLoadModule(
        "/@fs" + process.cwd() + "/packages/audio/src/index.ts",
      )),
    }));
  useAudioStore.setState({ isMuted: false, voicesEnabled: true });
  const timers = new Map();
  let id = 0,
    blocked = false,
    utterances = 0;
  const recordings = [];
  const env = {
    setTimer: (fn) => {
      timers.set(++id, fn);
      return id;
    },
    clearTimer: (i) => timers.delete(i),
    synthesis: {
      getVoices: () => [],
      speak: () => utterances++,
      cancel: () => {},
    },
    createUtterance: (text) => ({ text }),
    createRecording: (url) => {
      const a = {
        src: url,
        currentTime: 0,
        preload: "",
        play: () => {
          if (blocked) {
            const e = new Error("gesture");
            e.name = "NotAllowedError";
            return Promise.reject(e);
          }
          return Promise.resolve();
        },
        pause() {
          this.onpause?.();
        },
      };
      recordings.push(a);
      return a;
    },
  };
  const c = new NarrationController(env),
    clip = VOICE_CLIPS["check-ascentIntro"];
  for (const gender of ["female", "male"]) {
    c.speak(clip.text, "commander", "check-ascentIntro", gender);
    const a = recordings.at(-1);
    assert.equal(a.src.includes("/male/"), gender === "male");
    a.onplaying();
    assert.equal(c.getSnapshot().status, "speaking");
    a.onended();
    assert.equal(c.getSnapshot().status, "idle");
  }
  assert.equal(
    utterances,
    0,
    "recorded lab advice must never fall back to a system voice",
  );
  blocked = true;
  c.speak(clip.text, "commander", "check-ascentIntro", "male");
  await Promise.resolve();
  assert.equal(c.getSnapshot().status, "starting");
  blocked = false;
  c.retryBlocked();
  recordings.at(-1).onplaying();
  assert.equal(c.getSnapshot().status, "speaking");
  c.pause(true);
  useOrientationLifecycleStore.getState().setLoadingBlocked(false);
  c.resume(true);
  recordings.at(-1).onplaying();
  assert.equal(c.getSnapshot().status, "speaking");
  const late = recordings.at(-1).onended;
  c.stop();
  late();
  assert.equal(c.getSnapshot().status, "idle");
  assert.equal(timers.size, 0);
  useOrientationLifecycleStore.getState().setLoadingBlocked(true);
  const before = recordings.length;
  c.speak(clip.text, "commander", "check-ascentIntro", "female");
  assert.equal(recordings.length, before);
  useOrientationLifecycleStore.getState().setLoadingBlocked(false);
  c.resume(true);
  assert.equal(recordings.length, before + 1);
  c.stop();
  let completions = 0;
  c.speak(
    clip.text,
    "commander",
    "check-ascentIntro",
    "female",
    () => completions++,
  );
  const interruptedEnd = recordings.at(-1).onended;
  c.pause(true);
  interruptedEnd();
  assert.equal(completions, 0, "pause must not complete a radio line");
  c.resume(true);
  recordings.at(-1).onended();
  assert.equal(completions, 1, "completion must survive engine suspension");
  c.speak(
    clip.text,
    "commander",
    "check-ascentIntro",
    "male",
    () => completions++,
  );
  const cancelledEnd = recordings.at(-1).onended;
  c.stop();
  cancelledEnd();
  assert.equal(
    completions,
    1,
    "cancelled audio must not launch the next radio line",
  );
  console.log(
    `Audio checks passed: ${Object.keys(VOICE_CLIPS).length} dialogue IDs, ${urls.size} playable assets, both genders, clip ownership, autoplay retry, freeze/resume and stale callback cancellation.`,
  );
} finally {
  await server.close();
}

// Exercise the real companion's effects with fresh inline reply objects, as used by Flight Test Lab.
const vm = await import("node:vm"),
  ts = await import("typescript");
let gender = "female",
  stateIndex = 0,
  refIndex = 0,
  effectIndex = 0;
const states = [],
  refs = [],
  effects = [],
  jobs = new Map(),
  spoken = [];
let nextJob = 0,
  stops = 0;
class Controller {
  subscribe = () => () => {};
  getSnapshot = () => ({ status: "idle" });
  getSpeechTime = () => 0;
  stop = () => stops++;
  pause = () => {};
  speak = (text, character, id, g) => spoken.push({ id, g });
}
const hooks = {
  useState: (f) => {
    const i = stateIndex++;
    if (!(i in states)) states[i] = typeof f === "function" ? f() : f;
    return [states[i], (v) => (states[i] = v)];
  },
  useRef: (v) => {
    const i = refIndex++;
    return refs[i] ?? (refs[i] = { current: v });
  },
  useSyncExternalStore: () => ({ status: "idle" }),
  useEffect: (fn, deps) => {
    const i = effectIndex++,
      old = effects[i];
    if (!old || deps.some((d, k) => d !== old.deps[k])) {
      old?.cleanup?.();
      effects[i] = { deps, cleanup: fn() };
    }
  },
};
const mod = {};
const js = ts.transpileModule(
  readFileSync(
    "apps/web/src/game/moon/narrative/components/EngineerCompanion.tsx",
    "utf8",
  ),
  {
    fileName: "EngineerCompanion.tsx",
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
vm.runInNewContext(js, {
  exports: mod,
  require: (id) =>
    id === "react"
      ? hooks
      : id === "react/jsx-runtime"
        ? { jsx: () => null, jsxs: () => null }
        : id.includes("playerCharacterContext")
          ? { usePlayerGender: () => gender }
          : id.includes("storyNavigationContext")
            ? { useStoryNavigation: () => ({ autoplay: true }) }
            : id.includes("/narration")
              ? {
                  NarrationController: Controller,
                  browserNarrationEnvironment: () => ({}),
                }
              : id.includes("voiceClips")
                ? {
                    ENGINEER_REPLIES: {
                      intro: [{ id: "intro", text: "Welcome" }],
                    },
                    pickEngineerReply: () => ({ id: "intro", text: "Welcome" }),
                  }
                : id === "./engineer.ts"
                  ? { engineerCue: () => ({}) }
                  : {},
  setTimeout: (fn) => {
    jobs.set(++nextJob, fn);
    return nextJob;
  },
  clearTimeout: (id) => jobs.delete(id),
  window: { addEventListener: () => {}, removeEventListener: () => {} },
  document: {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});
function render(enabled = true) {
  stateIndex = refIndex = effectIndex = 0;
  mod.EngineerCompanion({
    reaction: "intro",
    token: 1,
    voiceEnabled: enabled,
    scriptedReply: { id: "check-ascentIntro", text: "Ready for a lift test?" },
  });
}
function flush() {
  const work = [...jobs.values()];
  jobs.clear();
  work.forEach((fn) => fn());
}
render();
render();
flush();
assert.equal(
  spoken.length,
  1,
  "inline reply rerenders must not cancel the first scheduled playback",
);
assert.equal(spoken[0].g, "female");
gender = "male";
render();
flush();
assert.equal(spoken.at(-1).g, "male");
const beforeStop = stops;
render(false);
assert(stops > beforeStop);
effects.forEach((e) => e.cleanup?.());
assert.equal(jobs.size, 0);
console.log(
  "Companion checks passed: stable inline replies, gender change, mute and timer cleanup.",
);
const { createHash } = await import("node:crypto");
const repairs = JSON.parse(
  readFileSync("apps/web/public/story/audio/voice-repairs.json", "utf8"),
);
for (const clip of repairs.clips)
  assert.equal(
    createHash("sha256")
      .update(readFileSync("apps/web/public" + clip.url))
      .digest("hex"),
    clip.sha256,
    clip.url,
  );
console.log(
  `Repair provenance checks passed: ${repairs.clips.length} audio files with exact text, voice and checksums.`,
);
