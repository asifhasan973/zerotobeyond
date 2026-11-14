# Recorded narration and recovery

Narration prefers the local MP3 associated with a dialogue ID, exact text and character. Commander recordings have separate female and male paths; Chief recordings remain the same for either player gender. The browser speech synthesizer is a fallback for unscripted text or unavailable media, not the primary source for Flight Test Lab instructions.

The audio repair added recorded Flight Test/Packing prompts, glossary definitions, crew-radio exchanges, pilot/shelter guidance and Moon-arrival instructions. New recordings use Microsoft Edge online text-to-speech through `edge-tts` 7.3.1: Sonia (`en-GB-SoniaNeural`) for female Commander/support voices, Andrew (`en-US-AndrewNeural`) for male Commander/support voices. Existing recordings are retained. Exact text, output paths, provider and hashes for the added clips are in `apps/web/public/story/audio/voice-repairs.json`.

To regenerate those clips, install `scripts/audio/requirements.txt` in a Python environment and run `python scripts/audio/generate-repairs.py`. This preparation step needs network access; normal playback uses bundled files. The generator updates hashes in the manifest. The MP3 playback rate is controlled centrally by `NARRATION_SPEED` with pitch preservation.

Playback owns a single narration channel and cancels stale callbacks on navigation. Loading/orientation suspension defers or replays the current line. Browser autoplay rejection retains the current recording for a retry on the next pointer/keyboard gesture. Hidden documents pause narration; returning to a visible, unfrozen document resumes it. Closing an information dialog resumes a still-active paused narrator when no other dialog is open.

Engineer autoplay depends on stable dialogue fields rather than an inline reply object's identity. Its last-spoken marker is committed only when the scheduled call executes, and includes gender. Thus unrelated rerenders cannot cancel a new line and then incorrectly treat it as already played.

Run `node scripts/check-audio.mjs` for coverage of both gender paths, media ownership, autoplay retry, pause/resume, stale callbacks and companion rerender/gender/mute behavior. `node scripts/check-journey.mjs` verifies route selection and progression. Shared lifecycle reconciliation restores input after obsolete loading blocks, and leaving review clears the shell-owned inert state.

Crew handoff, touchdown and departure automatically play the Commander line followed by the orbit pilot reply when forward navigation allows autoplay. The second line starts only after the first recording ends. Interruptions cancel the sequence, and engine/visibility suspension preserves the pending completion. Listen remains available for manual replay. Journey, Moon-arrival and Earth-return phase instructions also autoplay without restarting on telemetry updates. The radio exchange owns narration while visible, so phase guidance does not interrupt it. Back/review navigation stays silent.

Run `node scripts/check-narration-autoplay.mjs` to verify ordered exchanges, both player/pilot voices, phase updates and autoplay suppression/cleanup.
