"use client";

import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import type { VideoPlayerController } from "@/hooks/useVideoPlayer";
import { timeToMinutes } from "@/lib/utils/time";
import type { AssemblyPlanDoc, PlaybackStatus, VideoDoc } from "@/types";

export function useLiveAssembly({
  plan,
  controllerRef,
  defaultAutoAdvance = false
}: {
  plan: AssemblyPlanDoc | null;
  controllerRef: MutableRefObject<VideoPlayerController>;
  defaultAutoAdvance?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("stopped");
  const [stopAt, setStopAt] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(defaultAutoAdvance);
  const [pendingAutoplay, setPendingAutoplay] = useState(false);

  const currentItem = plan?.items[currentIndex];
  const currentVideo = currentItem?.video as VideoDoc | undefined;
  const effectiveDuration = useMemo(() => currentItem?.overrideDuration || currentVideo?.duration || 0, [currentItem, currentVideo]);
  const stopSeconds = useMemo(() => {
    if (!currentItem?.autoStop) return null;
    if (currentItem.overrideDuration && currentItem.overrideDuration > 0) return currentItem.overrideDuration;
    if (currentVideo?.duration && currentVideo.duration > 0) return currentVideo.duration;

    const scheduledWindow = scheduledWindowSeconds(currentItem.scheduledStart, currentItem.scheduledEnd);
    return scheduledWindow > 0 ? scheduledWindow : null;
  }, [currentItem, currentVideo]);

  useEffect(() => {
    setAutoAdvance(defaultAutoAdvance);
  }, [defaultAutoAdvance]);

  useEffect(() => {
    if (!pendingAutoplay) return;
    const timeout = window.setTimeout(() => {
      controllerRef.current.play();
      setIsPlaying(true);
      setPlaybackStatus("playing");
      if (stopSeconds) setStopAt(Date.now() + stopSeconds * 1000);
      else setStopAt(null);
      setPendingAutoplay(false);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [controllerRef, pendingAutoplay, stopSeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!stopAt || !isPlaying) return;
      if (Date.now() >= stopAt) {
        controllerRef.current.pause();
        setIsPlaying(false);
        setPlaybackStatus("stopped");
        setStopAt(null);
        toast.info("Video auto-stopped as scheduled");
        if (autoAdvance && plan && currentIndex < plan.items.length - 1) {
          setCurrentIndex((index) => index + 1);
          setPendingAutoplay(true);
        }
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [autoAdvance, controllerRef, currentIndex, isPlaying, plan, stopAt]);

  const remainingSeconds = stopAt ? Math.max(0, Math.ceil((stopAt - Date.now()) / 1000)) : null;

  async function play() {
    controllerRef.current.play();
    setIsPlaying(true);
    setPlaybackStatus("playing");
    if (stopSeconds) setStopAt(Date.now() + stopSeconds * 1000);
    else setStopAt(null);
    if (currentVideo?._id) {
      fetch(`/api/videos/${currentVideo._id}/played`, { method: "PATCH" }).catch(() => undefined);
    }
  }

  function pause() {
    controllerRef.current.pause();
    setIsPlaying(false);
    setPlaybackStatus("paused");
  }

  function stop() {
    controllerRef.current.stop();
    setIsPlaying(false);
    setPlaybackStatus("stopped");
    setStopAt(null);
  }

  function goTo(index: number, autoplay = false) {
    if (!plan) return;
    const bounded = Math.max(0, Math.min(index, plan.items.length - 1));
    controllerRef.current.stop();
    setCurrentIndex(bounded);
    setIsPlaying(false);
    setPlaybackStatus("stopped");
    setStopAt(null);
    setPendingAutoplay(autoplay);
  }

  function handleEnded() {
    setIsPlaying(false);
    setPlaybackStatus("stopped");
    setStopAt(null);
    if (autoAdvance && plan && currentIndex < plan.items.length - 1) {
      goTo(currentIndex + 1, true);
    }
  }

  function extendOneMinute() {
    setStopAt((current) => (current ? current + 60_000 : Date.now() + 60_000));
    toast.success("Extended by 1 minute");
  }

  return {
    currentIndex,
    currentItem,
    currentVideo,
    effectiveDuration,
    isPlaying,
    playbackStatus,
    autoAdvance,
    stopAt,
    stopSeconds,
    remainingSeconds,
    play,
    pause,
    setIsPlaying,
    setPlaybackStatus,
    setPlaybackPlaying: (playing: boolean) => {
      setIsPlaying(playing);
      setPlaybackStatus((status) => (playing ? "playing" : status === "stopped" ? "stopped" : "paused"));
    },
    setAutoAdvance,
    stop,
    next: () => goTo(currentIndex + 1),
    previous: () => goTo(currentIndex - 1),
    goTo,
    handleEnded,
    extendOneMinute,
    toggleAutoAdvance: () => setAutoAdvance((value) => !value)
  };
}

function scheduledWindowSeconds(start: string, end: string) {
  if (!start || !end) return 0;
  const minutes = timeToMinutes(end) - timeToMinutes(start);
  return minutes > 0 ? minutes * 60 : 0;
}
