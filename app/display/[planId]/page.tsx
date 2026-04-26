"use client";

import { CheckCircle2, Maximize2, Play, Tv, WifiOff } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnnouncementOverlay } from "@/components/AnnouncementOverlay";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { BhajanLyricsStage } from "@/components/BhajanLyricsStage";
import { LivePlayer } from "@/components/LivePlayer";
import { PhotoStage } from "@/components/PhotoStage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { getCollegeDisplayName } from "@/lib/branding";
import { fetchJson } from "@/lib/clientFetch";
import type { AnnouncementDoc, AssemblyPlanDoc, BhajanDoc, LiveStateDoc, SettingsDoc, VideoDoc } from "@/types";

interface DisplayPayload {
  plan: AssemblyPlanDoc;
  settings: SettingsDoc;
  announcements: AnnouncementDoc[];
  liveState: LiveStateDoc;
}

export default function AudienceDisplayPage({ params }: { params: { planId: string } }) {
  const player = useVideoPlayer();
  const searchParams = useSearchParams();
  const isProjector = searchParams.get("projector") === "1";
  const [payload, setPayload] = useState<DisplayPayload | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [viewportReady, setViewportReady] = useState(true);
  const lastAppliedVideoIdRef = useRef<string | null>(null);

  const loadDisplay = useCallback(() => {
    fetchJson<DisplayPayload | { error?: string } | null>(`/api/display/${params.planId}`, null)
      .then((data) => {
        if (data && "plan" in data && "settings" in data && "liveState" in data) {
          setPayload(data);
          setOffline(false);
        }
      })
      .catch(() => setOffline(true));
  }, [params.planId]);

  useEffect(() => {
    loadDisplay();
    const interval = window.setInterval(loadDisplay, 750);
    return () => window.clearInterval(interval);
  }, [loadDisplay]);

  useEffect(() => {
    function measureViewport() {
      const ratio = window.innerWidth / Math.max(1, window.innerHeight);
      setViewportReady(ratio >= 1.55 && ratio <= 1.95);
    }

    measureViewport();
    window.addEventListener("resize", measureViewport);
    return () => window.removeEventListener("resize", measureViewport);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCursorHidden(false);
      return;
    }

    let timeout = window.setTimeout(() => setCursorHidden(true), 2500);
    function showCursor() {
      setCursorHidden(false);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setCursorHidden(true), 2500);
    }

    window.addEventListener("mousemove", showCursor);
    window.addEventListener("keydown", showCursor);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("mousemove", showCursor);
      window.removeEventListener("keydown", showCursor);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    type WakeLockSentinel = { release: () => Promise<void> };
    type WakeLockNavigator = Navigator & {
      wakeLock?: {
        request: (type: "screen") => Promise<WakeLockSentinel>;
      };
    };

    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        sentinel = (await (navigator as WakeLockNavigator).wakeLock?.request("screen")) ?? null;
      } catch {
        sentinel = null;
      }
    }

    void requestWakeLock();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !released) {
        void requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
    };
  }, [enabled]);

  const liveState = payload?.liveState;
  const planVideo = payload?.plan.items[liveState?.currentIndex ?? 0]?.video as VideoDoc | undefined;
  const emergencyVideo = typeof liveState?.emergencyVideo === "object" ? (liveState.emergencyVideo as VideoDoc) : undefined;
  const emergencyBhajan = typeof liveState?.emergencyBhajan === "object" ? (liveState.emergencyBhajan as BhajanDoc) : undefined;
  const displayVideo = liveState?.emergencyMode === "video" && emergencyVideo ? emergencyVideo : planVideo;

  const playbackStatus = liveState?.playbackStatus ?? (liveState?.isPlaying ? "playing" : "stopped");
  const showVideo = liveState?.emergencyMode === "none" || liveState?.emergencyMode === "video";
  const showIdle =
    liveState?.emergencyMode === "idle" ||
    ((liveState?.emergencyMode === "none" || liveState?.emergencyMode === "video") && (!displayVideo || playbackStatus === "stopped"));
  const hasLiveState = Boolean(liveState);
  const liveStateIsPlaying = liveState?.isPlaying ?? false;
  const liveStateCurrentIndex = liveState?.currentIndex ?? 0;
  const liveStateEmergencyMode = liveState?.emergencyMode ?? "none";
  const liveStatePlaybackSeconds = liveState?.playbackSeconds ?? 0;
  const liveStateVolume = liveState?.volume ?? 0.85;
  const liveStateMuted = liveState?.muted ?? false;
  const liveStateUpdatedAt = liveState?.updatedAt ?? "";

  const handleReady = useCallback(
    (controller: Parameters<typeof player.setController>[0]) => {
      player.setController(controller);
      if (enabled && liveStateIsPlaying) {
        window.setTimeout(() => player.play(), 300);
      }
    },
    [enabled, liveStateIsPlaying, player]
  );

  useEffect(() => {
    if (!enabled || !hasLiveState) return;

    if (!showVideo) {
      player.pause();
      return;
    }

    const timeout = window.setTimeout(() => {
      player.setVolume(liveStateVolume);
      if (liveStateMuted) player.mute();
      else player.unmute();

      const currentSeconds = player.getCurrentTime();
      const targetSeconds = Math.max(0, liveStatePlaybackSeconds);
      const videoChanged = lastAppliedVideoIdRef.current !== (displayVideo?._id ?? null);
      const drift = Math.abs(currentSeconds - targetSeconds);

      if (videoChanged || drift > (playbackStatus === "playing" ? 2 : 0.35)) {
        player.seekTo(targetSeconds);
      }

      if (playbackStatus === "playing") player.play();
      else player.pause();
      lastAppliedVideoIdRef.current = displayVideo?._id ?? null;
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [
    displayVideo?._id,
    enabled,
    hasLiveState,
    liveStateCurrentIndex,
    liveStateEmergencyMode,
    liveStateIsPlaying,
    liveStateMuted,
    liveStatePlaybackSeconds,
    liveStateUpdatedAt,
    liveStateVolume,
    playbackStatus,
    player,
    showVideo
  ]);

  const priorityAnnouncements = useMemo(() => payload?.announcements ?? [], [payload?.announcements]);
  const collegeName = getCollegeDisplayName(payload?.settings.collegeName);

  const sendHeartbeat = useCallback(() => {
    fetch(`/api/display/${params.planId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        fullscreen: Boolean(document.fullscreenElement),
        playbackStatus,
        playbackSeconds: player.getCurrentTime(),
        emergencyMode: liveStateEmergencyMode,
        currentIndex: liveStateCurrentIndex,
        videoId: displayVideo?._id ?? ""
      })
    }).catch(() => undefined);
  }, [displayVideo?._id, enabled, liveStateCurrentIndex, liveStateEmergencyMode, params.planId, playbackStatus, player]);

  useEffect(() => {
    if (!payload) return;
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 1500);
    return () => window.clearInterval(interval);
  }, [payload, sendHeartbeat]);

  async function enableDisplay() {
    setEnabled(true);
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }
    window.setTimeout(() => {
      if (liveStateIsPlaying) player.play();
    }, 300);
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/70">Loading audience display...</p>
      </main>
    );
  }

  return (
    <main className={`fixed inset-0 z-50 flex flex-col bg-black text-white ${enabled && cursorHidden ? "cursor-none" : ""}`}>
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-5">
        <div className="flex items-center gap-3">
          {payload.settings.logoUrl ? (
            <Image src={payload.settings.logoUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-md object-contain" />
          ) : null}
          <div>
            <p className="text-lg font-semibold">{collegeName}</p>
            <p className="text-sm text-white/70">{payload.plan.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {offline ? (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          ) : null}
          <Badge variant="secondary">{playbackStatus === "playing" ? "Live" : playbackStatus === "paused" ? "Paused" : "Idle"}</Badge>
        </div>
      </header>

      <section className="relative flex min-h-0 flex-1 items-center justify-center">
        {showVideo ? (
          <div className="w-full">
            <LivePlayer video={displayVideo} onReady={handleReady} />
          </div>
        ) : null}

        {showIdle ? (
          <PhotoStage
            imageUrl={payload.settings.idleImageUrl}
            logoUrl={payload.settings.logoUrl}
            title={collegeName}
            subtitle="Ready for sabha"
            className="z-20"
          />
        ) : null}

        {liveState?.emergencyMode === "blank" && <div className="absolute inset-0 z-30 bg-black" />}

        {liveState?.emergencyMode === "bhajan" && (
          <BhajanLyricsStage
            bhajan={emergencyBhajan}
            logoUrl={payload.settings.logoUrl}
            className="z-30"
          />
        )}

        {liveState?.emergencyMode === "logo" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black p-8 text-center">
            <div>
              {payload.settings.logoUrl ? (
                <Image src={payload.settings.logoUrl} alt="" width={240} height={240} className="mx-auto h-56 w-56 object-contain" />
              ) : null}
              <p className="mt-6 text-5xl font-semibold">{collegeName}</p>
            </div>
          </div>
        )}

        {liveState?.emergencyMode === "message" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black p-10 text-center">
            <p className="max-w-5xl text-6xl font-semibold leading-tight">
              {liveState.emergencyMessage || "Please stand by"}
            </p>
          </div>
        )}

        <AnnouncementOverlay announcements={priorityAnnouncements} />

        {!enabled && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
            <div className="w-full max-w-xl rounded-md border border-white/15 bg-zinc-950/95 p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-white/10">
                <Tv className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-semibold">{isProjector ? "Projector setup" : "Audience display"}</h1>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {isProjector
                  ? "Drag this window to the projector screen, then start fullscreen display."
                  : "Start fullscreen audience display when the screen is ready."}
              </p>
              <div className="mt-5 grid gap-2 text-left text-sm text-white/75 md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="font-medium text-white">Window</p>
                  <p className="mt-1 text-xs">Move to projector first</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="font-medium text-white">Screen</p>
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    {viewportReady ? <CheckCircle2 className="h-3 w-3 text-emerald-300" /> : null}
                    {viewportReady ? "Projector shape looks good" : "Resize close to 16:9"}
                  </p>
                </div>
              </div>
              <Button size="lg" className="mt-6" onClick={enableDisplay}>
                <Play className="h-5 w-5" />
                {isProjector ? "Start Projector" : "Enable Audience Display"}
                <Maximize2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <AnnouncementTicker announcements={priorityAnnouncements} />
    </main>
  );
}
