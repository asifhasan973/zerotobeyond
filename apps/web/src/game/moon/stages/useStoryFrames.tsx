import React from "react";
import type { SelectionFrame } from "@/game/moon/crew/SelectionScreens";
import { StoryHeaderExtra } from "./StoryHeaderExtra";

export interface UseStoryFramesOptions {
  onHome: () => void;
  voiceEnabled: boolean;
  soundActive?: boolean;
  toggleAudioMute: () => void;
  storageAvailable: boolean;
  isSaving?: boolean;
  skipError: string | null;
}

export function useStoryFrames({
  onHome,
  voiceEnabled,
  soundActive,
  toggleAudioMute,
  storageAvailable,
  isSaving,
  skipError,
}: UseStoryFramesOptions): {
  frame: SelectionFrame;
  homeFrame: SelectionFrame;
} {
  const frame: SelectionFrame = {
    onHome,
    voiceEnabled,
    soundActive,
    onToggleVoice: toggleAudioMute,
    voiceAvailable: typeof Audio !== "undefined",
    headerExtra: (
      <StoryHeaderExtra
        storageAvailable={storageAvailable}
        isSaving={isSaving}
        skipError={skipError}
        onHome={onHome}
        showSaveStatus={true}
      />
    ),
  };

  const homeFrame: SelectionFrame = {
    ...frame,
    headerExtra: (
      <StoryHeaderExtra
        storageAvailable={storageAvailable}
        isSaving={isSaving}
        skipError={skipError}
        onHome={onHome}
        showSaveStatus={false}
      />
    ),
  };

  return { frame, homeFrame };
}
