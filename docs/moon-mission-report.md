# Your Moon Mission Report

The report extends the existing end-of-mission debrief. It reads the existing workshop session without adding a mission-results store or changing mission mechanics.

## Data mapping

| Report item                      | Saved owner / existing helper                                                                              | Units                               | Availability and limits                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective and game region        | `moon.objective`, `moon.site`                                                                              | Named categories                    | Regions are illustrative; no mission-to-lunar-coordinate transform exists.                                                                      |
| Crew recovery / outcome          | `returnComplete(returnFlight, designSignature)`, `missionOutcome`                                          | Crew count / status                 | Requires matching signature, splashdown and ocean recovery; a step ID alone is insufficient. Save restoration replays return receipts.          |
| Collected samples                | Unique rover cargo + deposited IDs, or `science.samples`                                                   | Samples                             | Older rover runs store identifiers without analytical composition.                                                                              |
| Stowed and returned samples      | Unique deposited rover IDs or stowed science samples; recovery gate                                        | Samples, kg                         | Cargo left on the Moon is excluded. Returned mass is 0 until recovery. Rover samples use the existing 0.2 kg game model.                        |
| Observations and delivery        | Unique `science.records[].id`, instrument, signal, result, classification, quality/confidence, transmitted | Text / categorical quality          | No invented confidence percentages. Transmission is distinct from physical return; Earth receipt additionally requires recovery in this report. |
| Ice interpretation               | Existing `expectedFinding` over delivered optical/gas observations at the same location/time               | Confirmed / negative / inconclusive | Hydrogen alone is not confirmation. Findings apply within the simulation. Missing channels remain inconclusive.                                 |
| Geology interpretation           | Delivered mineral-evidence classifications                                                                 | Named rock class                    | Inconclusive results and the instrument used remain visible.                                                                                    |
| Science points                   | Existing `deliveredPoints` via mission card                                                                | SP                                  | Existing simulation ledger; viewing the report earns nothing.                                                                                   |
| Journey                          | Completed activities, landing state, deployed surface, return outcome                                      | Recorded / not recorded             | No manufactured timestamps or durations.                                                                                                        |
| Battery                          | Existing debrief landing-resource calculation and recorded rover/surface end state                         | Wh, W                               | Landing start is calculated; end is the final surface record. Net balance is not cumulative consumption.                                        |
| Fuel and supplies                | Existing debrief accounting and approved manifest                                                          | kg, crew-days, kWh                  | Descent, ascent and service accounts remain separate. Missing approved accounting is unavailable.                                               |
| Decisions and next investigation | Existing debrief decision / recommendation helpers                                                         | Explanatory text                    | Equipment capabilities and planning alternatives are labeled as calculations, not replayed outcomes.                                            |
| Previous run                     | Existing comparison key/schema v1                                                                          | Recorded comparison fields          | Same-objective compatibility retained; seed and assistance are confounders.                                                                     |
| NASA location reference          | Local Atlas JSON, LOLA / Diviner metadata and overview layers                                              | m, K/°C, degrees                    | Always a labeled reference-region preview for current mission regions; never a claimed landing/sample coordinate. Null data remains missing.    |

## Experience

Overview, findings, evidence meaning, location reference, engineering lessons and next investigation are in-place sections of one report. NASA reference data is secondary and loaded only when requested. The original mission save and comparison schema are retained. The legacy Atlas URL provides a labeled reference preview and an explicit completed-report action when restored recovery evidence permits it.

## Compatibility and limitations

The full mission save remains v13, with existing v12 restoration. Comparison storage remains v1 and retains same-objective compatibility checks. No new report persistence key is created. The report location state, map layer, zoom and section choice are view state only. New-attempt actions in the live debrief reuse the existing confirmation; merely browsing the report cannot spend resources or restart a mission.

Missing remaining supplies, cabin energy or propellant balances produce unavailable consumption values. Recorded zero remains a real exhausted balance. Ice observations without saved pairing information preserve their recorded interpretation while explaining that agreeing measurement channels cannot be reconstructed. Observation and sample identifiers are deduplicated for report/comparison counts; exported science-point totals also avoid repeated observation IDs.

Current mission region IDs cannot be mapped to Atlas presets. Reference selection does not change the mission's location. NASA historical temperature alone does not establish ice; overview slope does not certify safety; no communications coverage is inferred.

## Verification

Run `node scripts/check-mission-report.mjs` for receipt validation, legacy saves,
missing versus zero resource values, read-only derivation and completed report
reopening. Generated fixtures are written under `/tmp`, not to a player's browser.

The optional `scripts/check-mission-report-ui.mjs` exercises report sections,
reference-map controls, comparison, focus behavior, save preservation and failure
states using an isolated browser context. It requires a running preview,
Playwright and the generated save fixture. Automated checks do not certify
physical-device performance, assistive technology or learner comprehension.

## Journey save compatibility

Undated legacy journey states retain their version-1 initialization until a dated departure is explicitly selected. Version-2 command replay restores the selected lunar orbit tier and accepts valid historical departure dates after the rolling date picker advances. Interactive date selection remains limited to the currently offered dates. Invalid orbit tier identifiers are ignored. `node scripts/check-mission-report.mjs` covers completed report reopening, orbit-tier replay and historical departure retention.
