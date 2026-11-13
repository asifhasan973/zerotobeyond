# Solar radiation challenge

After a successful Earth departure burn, the outbound coast pauses its chapter progression at 35% for an authored solar-particle event. Two illustrated crew scenes precede the existing capsule cutaway.

1. View the warning and commander's shelter briefing.
2. Match water, food and supplies to their interior stowage bays using drag, tap/select or keyboard-activated buttons.
3. Move all three crew into the shelter.
4. Start monitoring: a Three.js spacecraft scene shows illustrative particle trails. The compressed reading progresses from Elevated to Falling.
5. At All-clear, open the system checks, verify power/navigation/radio and resume the journey.

Radiation is invisible; trails are an explanatory overlay. The event, trend and shielding arrangement are authored teaching content, not live NASA measurements or a validated spacecraft shelter design. [NASA Orion crew systems](https://www.nasa.gov/reference/crew-systems/) supplies the scientific reference.

## Navigation and persistence

Back reverses shelter interactions; Replay restarts the active emergency. Saves retain illustration position, supplies, crew, monitoring and checks. Old completed journeys remain complete. Old unfinished coast saves encounter the event on their next active update. The surface chapter's existing radiation incidents are separate.

Skip from Earth orbit or a preceding transfer maneuver advances to the warning instead of skipping the emergency. Skip while already in the emergency remains an explicit assisted advancement. Scripted checkpoint generation can still use the lower-level journey skip event.

The animation respects pause, orientation/loading freezes, document visibility, reduced-motion preference and the gentle setting. It releases frame callbacks, resize observation, renderer and Three.js resources on unmount. If WebGL fails, textual monitoring remains available.

## Verification

`node scripts/check-journey.mjs` checks transfer/capture accounting, the shelter trigger, valid/invalid placement, Back/Replay, monitoring, Skip and save compatibility. Optional `SOLAR_SAVE_OUTPUT` and `RADIATION_SAVE_OUTPUT` environment paths export fixtures for focused browser checks. Browser checks have exercised drag/tap/keyboard input, landscape layouts, the 3D canvas and All-clear → system checks. These are not full physical-device or accessibility certification.
