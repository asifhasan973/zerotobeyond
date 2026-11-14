import "./register-workspace.mjs";
import assert from "node:assert/strict";
import { usePwaStore } from "../packages/ui/src/state/pwaStore.ts";
const reset = () =>
  usePwaStore.setState({
    isInstalled: false,
    deferredPrompt: null,
    isModalOpen: false,
  });
reset();
await usePwaStore.getState().promptInstall();
assert.equal(usePwaStore.getState().isModalOpen, true);
reset();
let calls = 0;
usePwaStore.getState().setDeferredPrompt({
  prompt: async () => {
    calls++;
  },
  userChoice: Promise.resolve({ outcome: "dismissed", platform: "" }),
});
await usePwaStore.getState().promptInstall();
assert.equal(usePwaStore.getState().deferredPrompt, null);
assert.equal(usePwaStore.getState().isInstalled, false);
await usePwaStore.getState().promptInstall();
assert.equal(calls, 1);
assert.equal(usePwaStore.getState().isModalOpen, true);
reset();
usePwaStore.getState().setDeferredPrompt({
  prompt: async () => {
    calls++;
  },
  userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
});
await usePwaStore.getState().promptInstall();
assert.equal(usePwaStore.getState().isInstalled, true);
await usePwaStore.getState().promptInstall();
assert.equal(calls, 2);
reset();
console.log(
  "PWA checks passed: fallback guidance, dismissed prompt consumption, retry and installed guard.",
);
