import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Run the real effects with controlled timers; no browser autoplay policy can mask a missing call.
function harness(file) {
  let cursor = 0;
  const slots = [],
    jobs = new Map(),
    calls = [];
  let nextJob = 0;
  const navigation = { autoplay: true, reviewing: false };
  const context = { gender: "female" };
  class Controller {
    completion;
    speak(text, character, id, gender, completion) {
      this.completion = completion;
      calls.push({ id, gender });
    }
    stop = () => {
      this.completion = undefined;
    };
    pause = () => {};
    finish() {
      const done = this.completion;
      this.completion = undefined;
      done?.();
    }
  }
  const controllers = [];
  class TrackedController extends Controller {
    constructor() {
      super();
      controllers.push(this);
    }
  }
  const hooks = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= {
        value: typeof initial === "function" ? initial() : initial,
      };
      return [
        slots[index].value,
        (value) => {
          slots[index].value =
            typeof value === "function" ? value(slots[index].value) : value;
        },
      ];
    },
    useRef(initial) {
      return (slots[cursor++] ??= { current: initial });
    },
    useCallback(fn, deps) {
      const index = cursor++,
        old = slots[index];
      if (!old || deps.some((value, i) => value !== old.deps[i]))
        slots[index] = { value: fn, deps };
      return slots[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++,
        old = slots[index];
      if (!old || deps.some((value, i) => value !== old.deps[i])) {
        old?.cleanup?.();
        slots[index] = { deps, cleanup: fn() };
      }
    },
  };
  const exchanges = {
    handoff: ["Moving to lander", "Staying in orbit"],
    touchdown: ["Landed safely", "Spacecraft ready"],
    departure: ["Ready to return", "Ready to meet you"],
  };
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(file, "utf8").replaceAll("import.meta.env.BASE_URL", '"/"'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require(id) {
      if (id === "react") return hooks;
      if (id === "react/jsx-runtime")
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (id.includes("storyNavigationContext"))
        return { useStoryNavigation: () => navigation };
      if (id.includes("playerCharacterContext"))
        return { usePlayerGender: () => context.gender };
      if (id.includes("/narration"))
        return {
          NarrationController: TrackedController,
          browserNarrationEnvironment: () => ({}),
        };
      if (id.includes("crewIdentity"))
        return {
          crewRadioPaused: (session) => !!session.paused,
          radioCrew: () => ({
            commander: {
              name: "Commander",
              id: "commander",
              portrait: "c.webp",
            },
            orbit: { name: "Pilot", id: "pilot", portrait: "p.webp" },
          }),
        };
      if (id.includes("crewRadioCopy"))
        return { CREW_RADIO_EXCHANGES: exchanges };
      if (id === "@exo/ui")
        return {
          isEngineFrozen: () => false,
          useLoadingStore: { getState: () => ({ registerLoaderTask() {} }) },
        };
      return {};
    },
    setTimeout(fn) {
      jobs.set(++nextJob, fn);
      return nextJob;
    },
    clearTimeout: (id) => jobs.delete(id),
    Image: class {
      decode = () => Promise.resolve();
    },
    window: { addEventListener() {}, removeEventListener() {} },
  });
  return {
    calls,
    navigation,
    context,
    controllers,
    render(fn) {
      cursor = 0;
      return fn(exports);
    },
    flush() {
      const pending = [...jobs.values()];
      jobs.clear();
      pending.forEach((fn) => fn());
    },
    close() {
      slots.forEach((slot) => slot?.cleanup?.());
      assert.equal(jobs.size, 0);
    },
  };
}
const radioFile = "apps/web/src/game/moon/crew/operations/CrewRadio.tsx";
for (const moment of ["handoff", "touchdown", "departure"]) {
  for (const gender of ["female", "male"]) {
    for (const support of ["robotics-specialist", "systems-engineer"]) {
      const h = harness(radioFile);
      const props = {
        moment,
        voiceEnabled: true,
        received: false,
        session: {
          progress: { playerGender: gender },
          moon: { crew: { support } },
        },
      };
      const render = () =>
        h.render((mod) =>
          mod.CrewRadioExchange({ ...props, session: { ...props.session } }),
        );
      render();
      render();
      h.flush();
      render();
      assert.deepEqual(h.calls, [{ id: `crew-exchange-${moment}-0`, gender }]);
      h.controllers[0].finish();
      assert.deepEqual(h.calls.at(-1), {
        id: `crew-exchange-${moment}-1`,
        gender: support === "robotics-specialist" ? "female" : "male",
      });
      h.controllers[0].finish();
      render();
      h.flush();
      assert.equal(
        h.calls.length,
        2,
        "completed exchanges must not loop on rerenders",
      );
      h.close();
    }
  }
}
for (const state of ["back", "review", "muted", "paused"]) {
  const h = harness(radioFile);
  h.navigation.autoplay = state !== "back";
  h.navigation.reviewing = state === "review";
  const props = {
    moment: "departure",
    voiceEnabled: state !== "muted",
    session: {
      paused: state === "paused",
      progress: { playerGender: "male" },
      moon: { crew: { support: "robotics-specialist" } },
    },
  };
  h.render((mod) => mod.CrewRadioExchange(props));
  h.flush();
  assert.equal(h.calls.length, 0, `${state} must suppress autoplay`);
  h.close();
}
const h = harness(radioFile);
const props = {
  moment: "departure",
  voiceEnabled: true,
  session: {
    progress: { playerGender: "male" },
    moon: { crew: { support: "robotics-specialist" } },
  },
};
h.render((mod) => mod.CrewRadioExchange(props));
h.close();
h.flush();
assert.equal(h.calls.length, 0, "unmount must cancel queued autoplay");

const page = harness(
  "apps/web/src/game/moon/narrative/hooks/usePageNarration.ts",
);
const speak = (id, enabled = true, paused = false) =>
  page.render((mod) => mod.usePageNarration(id, id, enabled, paused));
speak("journey-route");
speak("journey-route");
page.flush();
assert.equal(
  page.calls.length,
  1,
  "telemetry rerenders must not cancel or repeat a phase instruction",
);
speak("journey-tli");
page.flush();
assert.equal(page.calls.at(-1).id, "journey-tli");
page.context.gender = "male";
speak("journey-tli");
page.flush();
assert.equal(page.calls.at(-1).gender, "male");
speak("return-ascending", true, true);
page.flush();
assert.equal(page.calls.length, 3, "paused phases must remain silent");
speak("return-ascending");
page.flush();
assert.equal(page.calls.at(-1).id, "return-ascending");
page.navigation.autoplay = false;
speak("return-rendezvous");
page.flush();
assert.equal(page.calls.length, 4, "Back navigation must remain silent");
page.close();
console.log(
  "Autoplay checks passed: all three radio exchanges, both player/pilot voices, ordered replies, stable rerenders, phase changes, mute/pause/review/Back and unmount cleanup.",
);
