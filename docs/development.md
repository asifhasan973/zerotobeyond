# Development guide

## Workspace

| Path                      | Responsibility                                              |
| ------------------------- | ----------------------------------------------------------- |
| `apps/web/src/game/moon/` | Mission state, story flow, gameplay and 3D scenes           |
| `apps/web/src/features/`  | Cosmic Explorer, labs, Archive and Roadmaps                 |
| `apps/web/src/shared/`    | Site navigation, application shell, services and tutor      |
| `apps/web/server/`        | Local tutor and NASA Horizons API handlers                  |
| `functions/api/`          | Production Cloudflare Pages API entry points                |
| `packages/data/`          | Catalogues, mission references and source metadata          |
| `packages/engine/`        | Calculations, geometry and simulation utilities             |
| `packages/audio/`         | Sound synthesis and shared audio state                      |
| `packages/ui/`            | Loading, orientation, installation and interface components |
| `packages/tsconfig/`      | Shared TypeScript settings                                  |
| `scripts/`                | Dataset preparation and focused regression checks           |

The React application imports workspace packages through `@exo/*`. Packages must
not import application code. Keep calculations and reference data separate from
screen rendering. Dependency versions are recorded in `pnpm-lock.yaml`.

## Navigation and saves

React Router handles public-page navigation while retaining shareable
`/?explore=cosmic`, `archive`, `signal`, `engineering` and `roadmap` URLs. The
navbar's Game button opens mission choices. `/?play=1` and `/?restart=1` enter
the game through a separate document load; New Game retains its confirmation.
`/?report=1` reads a saved mission report and `/?explore=atlas` remains a
compatibility preview.

Mission progress belongs to the current browser/device. Persistence batches
simulation checkpoints and flushes on transitions and page exit. Review and
replay can affect later mission progress; use a separate browser profile for
manual regression checks that change saves.

## Loading and orientation

Landscape is the supported layout. `OrientationGuard`, `LoadingScreen` and
`useOrientationLifecycleStore` coordinate suspension of simulation, audio and
interaction. Asynchronous asset loading continues while gameplay is suspended.
Register asynchronous scene preparation with `useLoadingStore`; dispose Three.js
geometry, materials, textures, animation loops and listeners when a view unmounts.

Entry pages preload their own resources. Larger viewports and subsystems load
on demand. Loading timings can be adjusted through the documented variables in
`.env.example`.

## Installation and caching

`apps/web/vite.config.ts` defines the PWA manifest and Workbox service worker.
`packages/ui/src/state/pwaStore.ts` handles installation state. A captured native
install event is consumed before prompting, even when dismissed. Further clicks
open the platform guide until the browser supplies a fresh event. The guide
supports Escape, keyboard focus containment and return to the invoking control.

Installation and offline availability depend on the browser and cached resources.
Live APIs require a connection. An existing browser session may continue showing
a cached release while its service worker updates.

## Assets and narration

Store artwork and audio under the appropriate domain in `apps/web/public/` and
register asset paths in the owning registry. Preserve NASA and third-party
credits in [SOURCES.md](SOURCES.md) and the corresponding media manifests.
Generated story artwork must remain distinguishable from reference photographs.

Narration prefers local MP3 recordings; browser speech is a fallback for missing
or unscripted text. Commander recordings have separate male and female paths.
Navigation cancels stale playback; loading, orientation and visibility changes
coordinate pause/resume. Forward radio exchanges play in order; Back/review stays
silent and manual replay remains available.

To regenerate repaired narration, install `scripts/audio/requirements.txt` in a
Python environment and run `python scripts/audio/generate-repairs.py`. This
requires network access and updates hashes in
`apps/web/public/story/audio/voice-repairs.json`. Existing clips and source text
remain the reference for playback.

## Verification

Run the commands from [README.md](../README.md#run-locally). `pnpm run build`
includes TypeScript project checks and produces `apps/web/dist/`. Run focused
scripts for the subsystem being changed:

| Area                   | Checks                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| Mission flow and saves | `check-mission-flow.mjs`, `check-replay.mjs`, `check-journey.mjs`       |
| Audio                  | `check-audio.mjs`, `check-narration-autoplay.mjs`                       |
| Cosmic Explorer        | `check-cosmic.mjs`, `check-solar.mjs`                                   |
| Labs                   | `check-blueprint.mjs`, `check-nasa-engineering.mjs`, `check-signal.mjs` |
| Reports and arrival    | `check-mission-report.mjs`, `check-crew-arrival.mjs`                    |
| Installation           | `check-pwa.mjs`                                                         |

All paths above are under `scripts/`. Browser `*-ui.mjs` checks require a local
Playwright installation, a running preview and their documented environment
variables/fixtures. They are optional developer tools, not dependencies needed
to play the game. Automated results do not establish physical-device performance,
complete accessibility or scientific flight accuracy.

See [ci-cd.md](ci-cd.md) for production APIs, secrets and release commands.
