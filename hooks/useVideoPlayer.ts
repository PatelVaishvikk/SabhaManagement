"use client";

import { useCallback, useRef } from "react";

export interface VideoPlayerController {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  mute: () => void;
  unmute: () => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const noopController: VideoPlayerController = {
  play: () => undefined,
  pause: () => undefined,
  stop: () => undefined,
  seekTo: () => undefined,
  mute: () => undefined,
  unmute: () => undefined,
  setVolume: () => undefined,
  getCurrentTime: () => 0,
  getDuration: () => 0
};

export function useVideoPlayer() {
  const controllerRef = useRef<VideoPlayerController>(noopController);

  const setController = useCallback((controller: VideoPlayerController) => {
    controllerRef.current = controller;
  }, []);

  return {
    controllerRef,
    setController,
    play: () => controllerRef.current.play(),
    pause: () => controllerRef.current.pause(),
    stop: () => controllerRef.current.stop(),
    seekTo: (seconds: number) => controllerRef.current.seekTo(seconds),
    mute: () => controllerRef.current.mute(),
    unmute: () => controllerRef.current.unmute(),
    setVolume: (volume: number) => controllerRef.current.setVolume(volume),
    getCurrentTime: () => controllerRef.current.getCurrentTime(),
    getDuration: () => controllerRef.current.getDuration()
  };
}
