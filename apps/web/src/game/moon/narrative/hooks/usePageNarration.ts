import { useEffect, useState } from "react";
import { useStoryNavigation } from "../../core/storyNavigationContext";
import { usePlayerGender } from "./playerCharacterContext";
import {
  NarrationController,
  browserNarrationEnvironment,
} from "../voice/narration";

/** Speak a phase instruction once; telemetry rerenders never restart it. */
export function usePageNarration(
  text: string,
  clipId: string,
  enabled: boolean,
  paused = false,
) {
  const navigation = useStoryNavigation();
  const autoplay = navigation?.autoplay !== false && !navigation?.reviewing;
  const gender = usePlayerGender();
  const [controller] = useState(
    () => new NarrationController(browserNarrationEnvironment()),
  );
  useEffect(() => {
    const timer =
      enabled && autoplay && !paused
        ? setTimeout(
            () => controller.speak(text, "commander", clipId, gender),
            0,
          )
        : undefined;
    return () => {
      clearTimeout(timer);
      controller.stop();
    };
  }, [controller, text, clipId, enabled, autoplay, paused, gender]);
  useEffect(() => {
    const pause = () => controller.pause();
    window.addEventListener("game-help-open", pause);
    return () => window.removeEventListener("game-help-open", pause);
  }, [controller]);
}
