export const JOURNEY_LINES = {
  pilotTli:
    "Align with the marker. Hold Space to fire. Cut the engine at the target delta-v.",
  pilotLoi:
    "Align to 0° for retrograde braking. Reduce throttle near the target, then check trajectory.",
  shelter:
    "Commander: Prepare the cabin shelter. Keep everyone inside until the all-clear.",
  ready: "Your departure plan is locked. Ready to launch!",
  route: "We’re in Earth orbit! Pick our route to the Moon.",
  tli: "Point forward. Fire the engine to leave Earth orbit.",
  coast: "Moon-bound! Our upper stage is away. Enjoy the coast.",
  loi: "Point backward. Slow down so the Moon can hold us.",
  burn: "Engine firing. Watch the fuel and keep our return reserve.",
  wrongForward: "Point forward to head for the Moon.",
  wrongBackward: "Point backward to slow down at the Moon.",
  early: "Wait for the green window. No fuel spent.",
  missed: "Window missed. Retry this burn; no fuel spent.",
  paused: "Journey paused. Continue when you’re ready.",
  arrived: "Lunar orbit reached! All three crew are safe. Landing comes next.",
} as const;
