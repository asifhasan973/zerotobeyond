import { SpaceTutor } from "@/shared/tutor/SpaceTutor";
import { lazy, Suspense, useEffect } from "react";
import {
  OrientationGuard,
  LoadingScreen,
  InstallAppModal,
  useLoadingStore,
  registerPreloaderHandlers,
} from "@exo/ui";
import {
  preloadEntrySubsystems,
  preloadMissionSubsystems,
} from "./shared/services";
import { AppErrorBoundary } from "./shared/shell";
// Register web-specific preloading logic with central loading store
registerPreloaderHandlers({
  preloadEntry: preloadEntrySubsystems,
  preloadMission: preloadMissionSubsystems,
});

const SitePage = lazy(() => import("./shared/site/SitePage"));
const SavedMissionReport = lazy(
  () => import("./game/moon/return/debrief/SavedMissionReport"),
);
const ExactStory = lazy(() => import("./game/moon/stages/ExactStory"));

export default function App() {
  const isLoading = useLoadingStore((state) => state.isLoading);
  const query = new URLSearchParams(window.location.search);

  useEffect(() => {
    const cleanRetiredURLs = () => {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.hash.startsWith("#/debug/")) {
        url.hash = "";
        changed = true;
      }
      for (const key of ["debug", "module", "forcePortrait"]) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed)
        window.history.replaceState(
          null,
          "",
          url.pathname + url.search + url.hash,
        );
    };
    cleanRetiredURLs();
    window.addEventListener("hashchange", cleanRetiredURLs);
    return () => window.removeEventListener("hashchange", cleanRetiredURLs);
  }, []);

  useEffect(() => {
    // Trigger loading screen upon landing into the project
    const params = new URLSearchParams(window.location.search);
    const page =
      [
        "atlas",
        "signal",
        "engineering",
        "archive",
        "cosmic",
        "roadmap",
      ].includes(params.get("explore") ?? "") || params.get("report") === "1";
    useLoadingStore.getState().startLoading(page ? "page" : "landing");
  }, []);

  // Determine active view to render
  let content;
  const site = query.get("explore");
  if (query.get("report") === "1") {
    content = <SavedMissionReport />;
  } else if (
    site === "atlas" ||
    site === "signal" ||
    site === "engineering" ||
    site === "archive" ||
    site === "cosmic" ||
    site === "roadmap"
  ) {
    content = <SitePage page={site} />;
  } else {
    content = <ExactStory />;
  }

  return (
    <AppErrorBoundary>
      <OrientationGuard>
        <LoadingScreen />
        <InstallAppModal />
        <div
          inert={isLoading}
          aria-hidden={isLoading || undefined}
          style={{ height: "100%", minHeight: 0 }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "100vh",
                  background: "#0a0616",
                }}
              />
            }
          >
            {content}
            <SpaceTutor />
          </Suspense>
        </div>
      </OrientationGuard>
    </AppErrorBoundary>
  );
}
