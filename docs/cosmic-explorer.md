# Cosmic Explorer

Open `/?explore=cosmic` using the shared navbar. The default Solar System page embeds the official NASA/JPL Eyes viewer at full viewport size. This uses NASA’s documented iframe integration, not a locally rebuilt copy of its renderer or proprietary application bundle. NASA attribution and its original controls remain intact. It requires an internet connection and NASA service availability. The footer offers reload and an external viewer link.

Zero To Beyond’s Travel time, Compare sizes and Plan a mission actions sit in an overlay toolbar. Calculations use the bundled JPL snapshot and a separately selected target/date; they do not read or synchronize selections inside the cross-origin NASA viewer. “View this target” navigates the embedded app through NASA’s deep links. No unsupported message bridge or internal NASA application API is used.

Embedding and route examples: [NASA Eyes educator toolkit](https://science.nasa.gov/wp-content/uploads/2024/08/nasa-eyes-for-museums-relevant-links.pdf). The public HTML, app.css and config.js entry points were inspected; NASA bundles and assets are served by NASA, not copied into this repository.

The original local catalogue explorer remains at `/?explore=cosmic&mode=catalogue`. This independent, lazy-loaded page never writes the Moon mission save. The sections below describe that local atlas.

The atlas contains measured detections and JPL ephemerides only. It does not fill missing catalogue coverage with generated objects or draw a fictional Milky Way outline. Galaxy and quasar coordinates are redshift-derived comoving positions on our past light cone, using Astropy's Planck18 cosmology; the display is not a simultaneous photograph. Stellar positions use HYG v4.1 (Hipparcos, Yale and Gliese), fixed at J2000.0. The selection includes apparent magnitude ≤8 or distance ≤100 pc. Unknown-distance sentinel rows (100000 pc) are excluded. This covers the sky, but is neither a complete Milky Way census nor a density-complete sample. HYG-derived data credits David Nash / Astronexus, [CC BY-SA 4.0](https://github.com/astronexus/HYG-Database).

## Reproduce data

Create a Python environment with `astropy`, then run `python scripts/exploration/prepare-cosmic.py`. The script serializes JPL requests, caches raw responses in `/tmp/ztb-cosmic-raw`, and writes `apps/web/public/exploration/cosmic/catalogue.json` plus numbered catalogue parts. The browser combines these parts; each remains below the Cloudflare Pages per-file limit. There are no runtime upstream API calls or API secrets. Each source retains its exact query and SHA-256. Requests failing validation stop generation instead of fabricating results. Data changes require regenerating and rebuilding the app.

Solar-system coordinates are heliocentric equatorial ICRF kilometres, at TDB epochs, sampled every six hours over 30 days. The displayed calendar is TDB, not a UTC clock. Interpolation is linear and bounded. Historical spacecraft ephemerides may be outdated; they are not live telemetry. Catalogue coordinates align to equatorial axes; the Sun is an approximate origin for distant observations. Cosmological positions use a different distance convention and are labelled accordingly.

## Controls and limits

Choose Pan (default), Orbit or Fly. Left-drag pans or rotates according to mode; right-drag pans; wheel/pinch zooms toward the cursor. Fly uses WASD/QE with the canvas focused. The scale slider zooms about the current view. Selecting an object preserves the camera; Focus here recentres and Fit object also changes scale. Search offers paginated results, named stars and catalogue IDs; category filters apply to both list and scene. Guided tour controls sit in the inspector instead of covering the viewport. Time and tour freeze during lifecycle suspension or hidden documents.

Physical radii mode uses known body radii on the coordinate scale. Readable markers impose a minimum size and therefore exaggerate small objects. Compare sizes uses one linear diameter scale across the planets/Moon, optionally including the Sun. Unknown stellar radii are never invented: star glyph size represents apparent magnitude. Galaxies are oval location glyphs and probes/quasars diamond location glyphs, not reconstructed shapes.

Earth uses NASA Blue Marble and Moon uses LROC. Other planet maps are [Solar System Scope / INOVE CC BY 4.0](https://www.solarsystemscope.com/textures/), NASA-derived but colour-enhanced with reconstructed gaps. Saturn’s ring is schematic and orientation is illustrative. The scene does not claim unmodified true-colour photography or physically accurate illumination/rotation. Survey holes are labelled; they do not represent empty space or the edge of the universe.

Travel estimates use static Earth–target distance divided by a hypothetical speed (maximum c). No acceleration, braking, target motion, fuel or mission feasibility is modelled. For galaxies and quasars, this calculator is replaced by comoving distance and lookback time. Compare and bookmark are view tools, not mission scoring. Bookmarks use `ztb_cosmic_bookmarks_v1`, with session fallback if storage fails. Links preserve object, TDB Julian date and zoom.

## Verification

`node --import ./scripts/register-workspace.mjs scripts/check-cosmic.mjs` checks identity, finite coordinates, source ownership, interpolation boundaries, unit conversions and redshift-derived quantities. The usual workspace lint, TypeScript, build and formatting checks also apply. GPU/device performance and full assistive-technology support require hardware testing.

## Observatory layout

The overview opens on the Solar System. Destination shortcuts switch between Solar System, Earth, Webb, Voyager, stars and the galaxy survey. The exploration desk keeps Earth distance and light delay visible above Travel time, Compare sizes and Science tabs. Mission planning links to the existing Engineering Lab; it does not pass a target or promise a feasible interplanetary design. View controls reveal navigation, physical radii, coordinate grid, sunlight and orbit toggles. Only the active tool content scrolls; primary tools and actions remain visible.

Planet orbit guides are approximate two-body osculating ellipses inferred from centred finite differences of the bundled Horizons states. Solar GM is 132712440041.27942 km³/s² ([JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html)). They are visual guides, not long-range numerical ephemerides or spacecraft routes. Planet positions continue to use bounded Horizons interpolation. Lighting comes from the Sun with an illustrative ambient fill, Earth has a schematic atmosphere rim, and the Sun glow is illustrative. These changes do not add measured cloud motion, terrain, spacecraft shape models or unlimited date coverage.
