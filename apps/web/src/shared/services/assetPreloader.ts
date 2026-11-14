import { STORM_STORY } from "@/game/moon/flight/journey/radiation/stormAssets";
import {
  preloadImage,
  maintainBrowserAssetCache,
  cacheAssetInBrowser,
} from "@exo/engine";
import { LOADING_CONFIG } from "@exo/ui";

/**
 * Pacing helper simulating weak network conditions between milestone tasks when multiplier > 1.
 */
const paceMilestone = async () => {
  const multiplier = LOADING_CONFIG.progressMultiplier;
  if (multiplier > 1) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.round(180 * (multiplier - 1))),
    );
  }
};

/** Warm home modules and local artwork; archive data loads on its own page. */
export async function preloadEntrySubsystems(
  onProgress: (progress: number, message: string) => void,
): Promise<void> {
  // Step 0: Maintain browser asset cache (7-day inactivity purge)
  maintainBrowserAssetCache().catch(() => {});

  onProgress(5, "Initializing core engine subsystems…");
  await paceMilestone();

  try {
    // 1. Dynamic module chunks (40% milestone target: 5% -> 40%)
    onProgress(15, "Loading story flow and viewport controllers…");
    try {
      await Promise.allSettled([
        import("@/game/moon/shared/expedition/HomeViewport"),
        import("@/game/moon/crew/SelectionScreens"),
      ]);
    } catch (err) {
      console.warn("Module preload notice:", err);
    }
    onProgress(40, "Story controllers compiled");
    await paceMilestone();

    // Entry art and loader carousel images.
    onProgress(75, "Decoding mission deep space imagery…");
    const entryImages = [
      "/story/moon-mission-hero.webp",
      "/assets/loading/artemis_launch.jpg",
      "/assets/loading/orion_earth_view.jpg",
      "/assets/loading/carina_nebula.webp",
      "/assets/loading/apollo_bootprint.jpg",
      "/assets/loading/mars_perseverance.jpg",
    ];
    await Promise.allSettled(entryImages.map((src) => preloadImage(src)));
    onProgress(85, "Imagery textures cached");
    await paceMilestone();

    // Finish entry preparation.
    onProgress(96, "Entry assets ready…");
    await paceMilestone();
  } finally {
    onProgress(100, "All entry subsystems verified");
  }
}

/** Warm mission modules and shared art before the player enters the game. */
export async function preloadMissionSubsystems(
  onProgress: (progress: number, message: string) => void,
): Promise<void> {
  onProgress(5, "Engaging mission simulation pipelines…");
  await paceMilestone();

  try {
    // 1. Heavy simulation modules (40% milestone target: 5% -> 40%)
    onProgress(15, "Loading 3D rocket assembly studio & physics engines…");
    try {
      await Promise.allSettled([
        // Workshop & Rocket Builder
        import("@/game/moon/workshop/lander/WorkshopScreen"),
        import("@/game/moon/workshop/lander/WorkshopViewport"),
        // Flight & Launch
        import("@/game/moon/flight/launch/FlightScreen"),
        import("@/game/moon/flight/launch/FlightViewport"),
        // Moon mission modules
        import("@/game/moon/crew/CrewScreen"),
        import("@/game/moon/readiness/HumanReadinessScreen"),
        import("@/game/moon/workshop/rocket/RocketAssemblyScreen"),
        import("@/game/moon/workshop/rocket/MainRocketViewport"),
        import("@/game/moon/flight/journey/JourneyScreen"),
        import("@/game/moon/landing/LandingScreen"),
        import("@/game/moon/surface/arrival/SurfaceArrivalScreen"),
        import("@/game/moon/rover/components/RoverScreen"),
        import("@/game/moon/return/debrief/RecoveryScreen"),
        import("@/game/moon/return/ReturnScreen"),
        import("@/game/moon/workshop/packing/PackingViewport"),
      ]);
    } catch (err) {
      console.warn("Simulation module preload notice:", err);
    }
    onProgress(40, "Simulation engines assembled");
    await paceMilestone();

    // Shared mission textures and character atlases.
    onProgress(75, "Decoding astronaut dossiers & lunar surface maps…");
    const missionVisualAssets = [
      ...STORM_STORY.map((scene) => scene.src),
      // 3D Flight celestial textures
      "/story/flight/earth-blue-marble.jpg",
      "/story/flight/moon-lroc.jpg",
      // Character rig WebP body & face atlases
      "/story/characters-v1/chief-body.webp",
      "/story/characters-v1/chief-faces-a.webp",
      "/story/characters-v1/chief-faces-b.webp",
      "/story/characters-v1/commander-body.webp",
      "/story/characters-v1/commander-faces-a.webp",
      "/story/characters-v1/commander-faces-b.webp",
      "/story/characters-v1/commander-faces-c.webp",
      "/story/characters-v1/commander-male-atlas.webp",
      // Active mission crew portraits & lunar cabin
      "/story/lunar-cabin-v1.webp",
      "/story/crew-portraits/astrobiologist.webp",
      "/story/crew-portraits/geologist.webp",
      "/story/crew-portraits/robotics-specialist.webp",
      "/story/crew-portraits/scientist-seated-v1.webp",
      "/story/crew-portraits/commander-pressure-suit-v2.webp",
      "/story/crew-portraits/commander-male-pressure-suit-v1.webp",
      "/story/crew-portraits/scientist-pressure-suit-v2.webp",
      "/story/crew-portraits/geologist-pressure-suit-v1.webp",
      "/story/crew-portraits/robotics-pressure-suit-v1.webp",
      "/story/crew-portraits/systems-pressure-suit-v1.webp",
      "/story/crew-portraits/systems-engineer.webp",
    ];
    await Promise.allSettled([
      ...missionVisualAssets.map((src) => preloadImage(src)),
      cacheAssetInBrowser("/story/characters-v1/manifest.json"),
    ]);
    onProgress(90, "Visual textures & character rigs cached");
    await paceMilestone();

    // Finish mission preparation.
    onProgress(95, "Mission assets ready…");
    await paceMilestone();
  } finally {
    onProgress(100, "Flight authorization granted · Systems nominal");
  }
}
