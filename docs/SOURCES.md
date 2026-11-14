# NASA data, references and asset credits

These sources serve different purposes: numerical inputs, historical/scientific background, or visual references. They do not make the project's authored gameplay values official NASA specifications.

## Numerical and reference data

| Source                                                                                                              | Use in Zero To Beyond                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)                                                             | Bundled Moon/Sun state vectors for outbound transfer; dated Earth–Moon geometry for Blueprint distance, delay and radio-link calculations. |
| [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)                                                 | Coarse lunar elevation, site-height and slope reference layers.                                                                            |
| [LRO Diviner](https://www.diviner.ucla.edu/data)                                                                    | Dated lunar south-polar temperature map samples in location and Power Study references. NASA mission data hosted by the instrument team.   |
| [NASA SVS Moon phase and libration](https://svs.gsfc.nasa.gov/5587/)                                                | Dated lunar distance and viewing geometry in the Power Study.                                                                              |
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/)                                                               | Dated solar-flare, CME and particle-event context; not a real-time radiation-dose forecast.                                                |
| [NASA LCRNS reference constellation](https://ntrs.nasa.gov/citations/20250002698)                                   | Reference architecture for the Signal Lab, not operational navigation coverage.                                                            |
| [GRAIL gravity products](https://pds-geosciences.wustl.edu/missions/grail/)                                         | Lunar gravity coefficients used in preparing Signal Lab simulation assets.                                                                 |
| [NASA/JPL NAIF SPICE](https://naif.jpl.nasa.gov/naif/data.html)                                                     | Ephemeris, lunar orientation, frames, time and constants for Signal Lab geometry.                                                          |
| [LRO instrument suite and mission](https://science.nasa.gov/wp-content/uploads/2024/01/lro-space-science-paper.pdf) | Published historical LROC/LOLA mass, power and data allocations for Blueprint trade studies.                                               |

Exact source files, retrieval metadata and model limitations are recorded in `apps/web/public/exploration/signal/manifest.json`, `apps/web/src/features/engineering/nasaReference.json`, `packages/data/src/engineering/reference.ts` and `apps/web/src/game/moon/flight/journey/transferData.json`.

## Scientific and historical background

- [NASA Goddard Mission Design Lab](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/): multidisciplinary design and trade studies.
- [NASA VIPER](https://science.nasa.gov/mission/viper/): instrument capabilities, lunar operations and the distinction between clues and confirmed ice.
- [NASA Moon science](https://science.nasa.gov/moon/): water, ice, rocks and composition.
- [NASA Apollo](https://www.nasa.gov/the-apollo-program/): lunar crew architecture, rendezvous and return.
- [NASA Glenn ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/): fuel/mass relationships.
- [NASA Orion crew systems](https://www.nasa.gov/reference/crew-systems/): onboard radiation monitoring and temporary crew shelter concepts.

Additional page-specific references are registered in `apps/web/src/game/moon/shared/missionSources.ts` and `packages/data/src/missions/sources.ts`.

## Visual and audio assets

- [NASA Image and Video Library](https://images.nasa.gov/) and [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/): archive media, educational imagery and visual references. Individual source URLs/credits are retained in the archive data and Space keywords media registry.
- [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/): Moon visualization textures; these are not terrain navigation or hazard maps.
- Character artwork, story scenes and other authored visual/audio content were created with ChatGPT assistance. Solar warning/briefing artwork is fictional narrative illustration, not a NASA photograph.
- The software constructs spacecraft, rover and shelter visualizations as teaching models. Screenshots in `docs/images/` show the application, not real missions.

Original source credits and applicable usage terms remain with their publishers. Inclusion of NASA material does not imply endorsement. Some educational glossary media comes from non-NASA publishers; its individual source links remain in `apps/web/src/game/moon/core/learning/keywordMedia.ts`.

## Software and AI

React, TypeScript, Vite, Three.js, Motion, Zustand, Lucide, Vite PWA and Turborepo provide the application/tooling stack; package manifests and `pnpm-lock.yaml` record dependencies. ChatGPT assisted development and content creation. [Google Gemini API](https://ai.google.dev/gemini-api/docs) powers Orbit; questions, bounded conversation history and current-page context are sent to the provider. It is not a custom-trained NASA model.

### Recorded narration repairs

New Flight Test/Packing, glossary, crew-radio, journey and Moon-arrival recordings were synthesized using Microsoft Edge text-to-speech via `edge-tts` 7.3.1 (Sonia female / Andrew male). Existing audio assets were retained. `apps/web/public/story/audio/voice-repairs.json` records each added clip's text, voice and checksum; see `docs/audio.md` for reproducibility and playback behavior.
