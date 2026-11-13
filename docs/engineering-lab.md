# Engineering Lab — Mission Blueprint Studio

Open `/?explore=engineering`. The standalone lab supports engineering students and university teams developing an early lunar-science-orbiter concept. It never writes to the active game's mission or preparation save. The original rover power study remains available through **Rover power study**, with its original draft key and NASA references.

## Workflow

Define a science objective → select instruments and resource allocations → test 24 hours → pin and compare designs → export a mission blueprint. The layout has workflow/geometry controls, a scrollable workbench, and live resource budgets. It supports compact landscape through desktop without scrolling the document.

The default scenario selects LROC and LOLA, a 260 Wh battery, 280 W sunlit array, 12 Gbit storage and a 20 W electrical transmitter. The authored orbit lasts 120 minutes: the first 75 are sunlit, observation starts each orbit (24 minutes by default), and downlink occupies the last 15 minutes. These are educational conditions, not actual LRO ephemeris, eclipse or ground-station access predictions.

Browser drafts and comparison snapshots use `zero_to_beyond_engineering_blueprint_v1`. Save is explicit. Baseline pinning also saves both designs when storage is available; on storage failure they remain usable in memory. Invalid/corrupt stored drafts fall back to the bundled reference. No existing game or legacy power-study save is migrated or deleted.

## NASA API: exact inputs and uses

`GET /api/engineering/horizons?date=YYYY-MM-DD` is a read-only, fixed-upstream adapter to `https://ssd.jpl.nasa.gov/api/horizons.api`. The Vite development adapter and Cloudflare Pages Function use the same handler. No API key or paid service is required. Arbitrary upstream URLs/commands are not accepted; invalid dates fail before fetching. Upstream timeout is 12 seconds; upstream errors return 502, never fabricated data. Successful responses are cacheable for one hour.

The request selects Moon **301**, Earth center **500@399**, geometric **VECTORS**, **ICRF/FRAME**, **KM-S**, **TDB**, a one-day interval and one-hour samples. Response validation requires matching target, center, units and frame plus 25 finite hourly vectors with the expected Julian dates. Metadata includes the exact reproducible query URL, retrieval timestamp and NASA API version. The API documentation is https://ssd-api.jpl.nasa.gov/doc/horizons.html.

| NASA input                               | Derived use in this lab                              | Boundary                                                     |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Hourly X/Y/Z vectors                     | Linearly interpolated geocentric Earth–Moon distance | Not a propagated spacecraft orbit                            |
| Distance / 299792.458 km/s               | One-way vacuum signal delay                          | Excludes station, electronics and processing delay           |
| Distance, authored 32 GHz frequency      | Free-space path loss                                 | Ignores occultation, atmosphere and pointing                 |
| Path loss plus authored radio parameters | Power-limited downlink capacity each minute          | Not a validated radio design; fixed contacts and channel cap |

The bundled prediction was retrieved directly from this API for **13–14 November 2026 TDB**. It is a dated prediction, not live tracking. **Fetch NASA data** requests the selected date. A failed refresh preserves a matching dated prediction; a different selected date has unavailable results until matching geometry is fetched or the bundled date is explicitly restored. TDB and UTC are never silently interchanged.

## NASA publication: payload allocation and science volume

Source: Chin et al., **Lunar Reconnaissance Orbiter Overview: The Instrument Suite and Mission** (2007), DOI `10.1007/s11214-007-9153-y`, hosted by NASA: https://science.nasa.gov/wp-content/uploads/2024/01/lro-space-science-paper.pdf.

| Reference location   | Values used                                             | Where they affect results                                                   |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| PDF page 27, Table 7 | LROC 16.5 kg / 27.6 W; LOLA 15.3 kg / 39.6 W            | Selected payload mass and continuous orbit-average electrical allowance     |
| PDF page 7, Table 2  | LROC NAC 515 + WAC 41 = 556 Gbit/day; LOLA 1.4 Gbit/day | Planned and produced science volume under the authored observation schedule |

These are historical pre-launch allocations and reference volumes. They are not measured modern instrument performance, procurement specifications, or instantaneous on/off power. Table 7 is used consistently instead of mixing the paper's differing design estimates. Full camera-suite mass and power accompany the combined NAC/WAC data volume.

Planned volume is `reference Gbit/day × observationMinutes / 120`. Each powered observation minute generates `reference Gbit/day / 1440`. This is an authored scaling of reference daily-average volume, not a camera acquisition or mapping-coverage model. Scientific data returned is a resource outcome, not evidence that a particular image resolution or ground coverage has been achieved.

## NASA framework: review and report

NASA Goddard Mission Design Lab: https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/.

Its requirements, alternatives, mass/power/data estimates, technical-risk and recommendations structure informs the checklist, A/B trade study and report. This is a framework reference, not numerical data, certification, or an official Concept Maturity Level score.

## Educational model and provenance

The source register and expandable **Calculation → source map** explain every output. All authored values and equations are exported:

- Mass = 120 kg bus + 3 kg radio + 1 kg storage + battery Wh / 120 Wh/kg + array W / 50 W/kg + payload allocation. Radio/storage mass is fixed in this simplified model.
- Bus electrical demand is 60 W. Selected payload allocations remain constant. Electrical transmitter demand applies while data is waiting during a contact.
- Battery starts full. Solar directly supplies loads first. Battery efficiencies are 90% charge / 95% discharge; capacity saturation, curtailed generation and unserved load are separate accounts. A shortfall stops observation/downlink for that minute.
- RF power is 30% of electrical transmitter input; 32 GHz, 30/60 dBi transmit/receive gain and 3 dB losses. Received power relative to −140 dBW at an authored 10 Mbps reference sets a proportional capacity, capped at 100 Mbps. This assumes fixed noise/bandwidth/coding conditions.
- Data in shared storage/downlink is mixed proportionally across instruments. Overflow is lost; data still in storage at the deadline is not returned science. Planned requirements remain unchanged during power failures.
- Credits = 140 + battery Wh × 0.06 + array W × 0.08 + storage Gbit × 0.8 + transmitter W × 0.5 + LROC 35 + LOLA 25 when selected. These are simulation credits, not NASA costs.
- Review requires the objective's instruments, mass/credit limits, no unserved electrical demand, at least 20% minimum battery reserve, no storage loss, and at least 80% of planned data returned for each required instrument. The percentages are lab-defined.

Energy conservation: initial battery + generation = served demand + conversion losses + curtailed energy + final battery. Per instrument: produced science = returned + stored + lost. The simulation is deterministic, minute-resolved and immutable; displayed charts sample the state every five minutes. The link summary is at 12:00 TDB, while downlink integration uses interpolated geometry every minute.

Unmodeled requirements remain explicit in the review and report: launch/propulsion, propagated orbit/eclipses/access, detailed radio/pointing/noise, thermal/radiation, reliability and actual procurement cost. A resource pass is not a complete or flight-qualified mission design.

## Export

**Export JSON** includes the model version, mission inputs, complete NASA vectors and query metadata, calculated results, pinned design and its results, source register, output-to-source derivations and open requirements. **Print / Save PDF** opens a self-contained report and the browser print dialog; choose Save as PDF. The printable report includes architecture, equipment, results, comparison summary, source locations, exact API query, equations and assumptions. Mission text is escaped and the report has a restrictive content-security policy. No external PDF service receives the draft.

## Implementation and verification

The UI is isolated under `apps/web/src/features/engineering/blueprint`; mathematical engines live in `@exo/engine/engineering` and reference data in `@exo/data/engineering`. The existing standalone-page component facade and legacy study are preserved. The only Vite configuration addition registers the lab-specific API adapter.

Run:

```sh
node --import ./scripts/register-workspace.mjs --test scripts/check-blueprint.mjs
node --import ./scripts/register-workspace.mjs scripts/check-engineering.mjs
node --import ./scripts/register-workspace.mjs scripts/check-nasa-engineering.mjs
pnpm run lint
pnpm --filter @exo/data exec tsc --noEmit
pnpm --filter @exo/engine exec tsc --noEmit
pnpm --filter @exo/web exec tsc --noEmit -p tsconfig.app.json
pnpm run build
pnpm run format:check
```

Model tests cover conservation, immutable/deterministic output, distinct constraints, geometry sensitivity, invalid dates/drafts, source integrity, API parsing/failure/success and escaped provenance-complete reports. Browser checks cover design changes, comparison, save/reload, source navigation, JSON/report export, NASA refresh/failure and landscape layouts. Physical devices, screen readers and user studies require separate validation.
