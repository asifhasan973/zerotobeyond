import { lazy, Suspense, useState } from "react";
import type { PreparationSelection } from "@/game/moon/core/design";
import { BlueprintStudio } from "./blueprint";
import "./blueprint/blueprint.css";
const PowerStudy = lazy(() => import("./PowerStudy"));
/** Standalone lab facade: never mounts or mutates the active mission session. */
export default function EngineeringLab({
  preparation,
}: {
  preparation: PreparationSelection;
}) {
  const [legacy, setLegacy] = useState(false);
  if (legacy)
    return (
      <div className="bp-legacy">
        <div className="bp-legacy-bar">
          <button onClick={() => setLegacy(false)}>
            ← Return to Mission Blueprint Studio
          </button>
          <span>Original rover power study · independent draft</span>
        </div>
        <Suspense fallback={<p role="status">Opening power study…</p>}>
          <PowerStudy preparation={preparation} />
        </Suspense>
      </div>
    );
  return <BlueprintStudio onPowerStudy={() => setLegacy(true)} />;
}
