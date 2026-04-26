"use client";

import {
  AlertTriangle,
  ExternalLink,
  Eye,
  ImageIcon,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Smartphone,
  SkipBack,
  SkipForward,
  Square,
  Tv,
  Volume2,
  VolumeX
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnnouncementOverlay } from "@/components/AnnouncementOverlay";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { BhajanLyricsStage } from "@/components/BhajanLyricsStage";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LivePlayer } from "@/components/LivePlayer";
import { PhotoStage } from "@/components/PhotoStage";
import { ProjectorConfidence } from "@/components/ProjectorConfidence";
import { ProjectorLauncher } from "@/components/ProjectorLauncher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLiveAssembly } from "@/hooks/useLiveAssembly";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { getCollegeDisplayName } from "@/lib/branding";
import { fetchJson } from "@/lib/clientFetch";
import { formatDuration } from "@/lib/utils/formatDuration";
import { timeToMinutes } from "@/lib/utils/time";
import type { AnnouncementDoc, AssemblyPlanBhajanItem, AssemblyPlanDoc, BhajanDoc, EmergencyMode, LiveStateDoc, PlaybackStatus, SettingsDoc, VideoDoc } from "@/types";

export default function LiveAssemblyPage({ params }: { params: { planId: string } }) {
  const router = useRouter();
  const player = useVideoPlayer();
  const [plan, setPlan] = useState<AssemblyPlanDoc | null>(null);
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [clock, setClock] = useState(new Date());
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState<EmergencyMode>("none");
  const [emergencyMessage, setEmergencyMessage] = useState("Please stand by");
  const [backupVideoId, setBackupVideoId] = useState("");
  const [emergencyVideo, setEmergencyVideo] = useState<VideoDoc | null>(null);
  const [emergencyBhajan, setEmergencyBhajan] = useState<BhajanDoc | null>(null);
  const [mirrorState, setMirrorState] = useState<LiveStateDoc | null>(null);
  const appliedRemoteCommandSeqRef = useRef(0);

  const live = useLiveAssembly({
    plan,
    controllerRef: player.controllerRef,
    defaultAutoAdvance: settings?.autoAdvance ?? false
  });

  useEffect(() => {
    Promise.all([
      fetchJson<AssemblyPlanDoc | null>(`/api/plans/${params.planId}`, null),
      fetchJson<SettingsDoc | null>("/api/settings", null),
      fetchJson<VideoDoc[]>("/api/videos", [])
    ]).then(([planData, settingsData, videoData]) => {
      setPlan(planData);
      setSettings(settingsData);
      setVideos(videoData);
    });
  }, [params.planId]);

  useEffect(() => {
    function loadAnnouncements() {
      fetch("/api/announcements?active=true")
        .then((response) => response.text())
        .then((text) => (text.trim() ? (JSON.parse(text) as AnnouncementDoc[]) : []))
        .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
        .catch(() => undefined);
    }

    loadAnnouncements();
    const interval = window.setInterval(loadAnnouncements, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => undefined);
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => undefined);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      if (value) player.unmute();
      else player.mute();
      return !value;
    });
  }, [player]);

  const playPause = useCallback(() => {
    if (live.isPlaying) live.pause();
    else void live.play();
  }, [live]);

  const handlers = useMemo(
    () => ({
      playPause,
      next: live.next,
      previous: live.previous,
      fullscreen: toggleFullscreen,
      mute: toggleMute,
      exitFullscreen: () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        setFullscreen(false);
      },
      autoAdvance: live.toggleAutoAdvance
    }),
    [live.next, live.previous, live.toggleAutoAdvance, playPause, toggleFullscreen, toggleMute]
  );

  useKeyboardShortcuts(handlers);

  const syncLiveState = useCallback(
    (patch: Record<string, unknown>) => {
      fetch(`/api/live-state/${params.planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }).catch(() => undefined);
    },
    [params.planId]
  );

  const getPlaybackSeconds = useCallback(() => {
    const seconds = player.controllerRef.current.getCurrentTime();
    return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  }, [player.controllerRef]);

  const syncMirrorState = useCallback(
    (patch: Record<string, unknown> = {}) => {
      syncLiveState({
        clientRole: "operator-sync",
        operatorSeenCommandSeq: appliedRemoteCommandSeqRef.current,
        currentIndex: live.currentIndex,
        isPlaying: live.isPlaying,
        playbackStatus: live.playbackStatus,
        playbackSeconds: getPlaybackSeconds(),
        volume,
        muted,
        autoAdvance: live.autoAdvance,
        emergencyMode,
        ...patch
      });
    },
    [emergencyMode, getPlaybackSeconds, live.autoAdvance, live.currentIndex, live.isPlaying, live.playbackStatus, muted, syncLiveState, volume]
  );

  const applyRemoteState = useCallback(
    (state: LiveStateDoc) => {
      const mode = state.emergencyMode ?? "none";
      const status: PlaybackStatus = state.playbackStatus ?? (state.isPlaying ? "playing" : "stopped");
      const targetSeconds = Math.max(0, state.playbackSeconds ?? 0);
      const targetIndex = Math.max(0, state.currentIndex ?? 0);
      const nextEmergencyVideo = typeof state.emergencyVideo === "object" ? (state.emergencyVideo as VideoDoc) : null;
      const nextEmergencyBhajan = typeof state.emergencyBhajan === "object" ? (state.emergencyBhajan as BhajanDoc) : null;

      setEmergencyMode(mode);
      setEmergencyMessage(state.emergencyMessage || "Please stand by");
      setEmergencyVideo(nextEmergencyVideo);
      setEmergencyBhajan(nextEmergencyBhajan);

      if (typeof state.volume === "number") {
        setVolume(state.volume);
        player.setVolume(state.volume);
      }
      setMuted(Boolean(state.muted));
      if (state.muted) player.mute();
      else player.unmute();
      if (typeof state.autoAdvance === "boolean") live.setAutoAdvance(state.autoAdvance);

      const indexChanged = targetIndex !== live.currentIndex;
      if (indexChanged) {
        live.goTo(targetIndex);
      }

      window.setTimeout(
        () => {
          if (mode !== "none" && mode !== "video") {
            player.pause();
            live.setIsPlaying(false);
            live.setPlaybackStatus("stopped");
            return;
          }

          if (status === "stopped") {
            player.stop();
            live.setIsPlaying(false);
            live.setPlaybackStatus("stopped");
            return;
          }

          player.seekTo(targetSeconds);
          if (status === "playing") {
            player.play();
            live.setIsPlaying(true);
            live.setPlaybackStatus("playing");
          } else {
            player.pause();
            live.setIsPlaying(false);
            live.setPlaybackStatus("paused");
          }
        },
        indexChanged ? 450 : 80
      );
    },
    [live, player]
  );

  useEffect(() => {
    if (!plan) return;
    syncMirrorState();
  }, [live.autoAdvance, live.currentIndex, live.isPlaying, live.playbackStatus, muted, plan, syncMirrorState, volume]);

  useEffect(() => {
    if (!plan) return;
    const interval = window.setInterval(
      () => syncMirrorState({ playbackSeconds: getPlaybackSeconds() }),
      live.isPlaying || emergencyMode === "video" ? 1000 : 2500
    );

    return () => window.clearInterval(interval);
  }, [emergencyMode, getPlaybackSeconds, live.isPlaying, plan, syncMirrorState]);

  useEffect(() => {
    if (!plan) return;

    function loadMirrorState() {
      fetchJson<LiveStateDoc | null>(`/api/live-state/${params.planId}`, null).then((state) => {
        if (!state) return;
        setMirrorState(state);

        const commandSeq = state.commandSeq ?? 0;
        if (state.commandSource === "remote" && commandSeq > appliedRemoteCommandSeqRef.current) {
          appliedRemoteCommandSeqRef.current = commandSeq;
          applyRemoteState(state);
        }
      });
    }

    loadMirrorState();
    const interval = window.setInterval(loadMirrorState, 1000);
    return () => window.clearInterval(interval);
  }, [applyRemoteState, params.planId, plan]);

  async function endAssembly() {
    if (!plan) return;
    const response = await fetch(`/api/plans/${plan._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" })
    });

    if (response.ok) {
      toast.success("Assembly marked completed");
      router.push("/dashboard/planner");
    }
  }

  function onVolumeChange(value: number[]) {
    const next = value[0] ?? volume;
    setVolume(next);
    player.setVolume(next);
    syncMirrorState({ volume: next });
  }

  function pauseEverything() {
    if (live.playbackStatus === "stopped") {
      player.pause();
      syncMirrorState({ isPlaying: false, playbackStatus: "stopped", playbackSeconds: 0 });
      return;
    }
    live.pause();
    syncMirrorState({ isPlaying: false, playbackStatus: "paused", playbackSeconds: getPlaybackSeconds() });
  }

  function setEmergency(mode: EmergencyMode, message = emergencyMessage, video?: VideoDoc | null, bhajan?: BhajanDoc | null) {
    setEmergencyMode(mode);
    setEmergencyVideo(video ?? null);
    setEmergencyBhajan(bhajan ?? null);
    if (mode !== "video") player.pause();
    if (mode !== "none") {
      live.setIsPlaying(false);
      live.setPlaybackStatus("stopped");
    }
    syncLiveState({
      emergencyMode: mode,
      emergencyMessage: message,
      emergencyVideo: video?._id ?? null,
      emergencyBhajan: bhajan?._id ?? null,
      isPlaying: false,
      playbackStatus: "stopped",
      playbackSeconds: 0,
      volume,
      muted
    });
  }

  function clearEmergency() {
    player.stop();
    live.setIsPlaying(false);
    live.setPlaybackStatus("stopped");
    setEmergencyMode("none");
    setEmergencyVideo(null);
    setEmergencyBhajan(null);
    syncLiveState({
      emergencyMode: "none",
      emergencyMessage: "",
      emergencyVideo: null,
      emergencyBhajan: null,
      isPlaying: false,
      playbackStatus: "stopped",
      playbackSeconds: 0,
      volume,
      muted
    });
  }

  function playBackupVideo() {
    const video = videos.find((item) => item._id === backupVideoId);
    if (!video) {
      toast.error("Choose a backup video first");
      return;
    }
    setEmergencyMode("video");
    setEmergencyVideo(video);
    syncLiveState({
      emergencyMode: "video",
      emergencyVideo: video._id,
      emergencyMessage: "",
      isPlaying: true,
      playbackStatus: "playing",
      playbackSeconds: 0,
      volume,
      muted
    });
    window.setTimeout(() => {
      player.play();
      live.setIsPlaying(true);
      live.setPlaybackStatus("playing");
    }, 700);
  }

  function showBhajan(item: AssemblyPlanBhajanItem) {
    const bhajan = item.bhajan as BhajanDoc;
    if (!bhajan) {
      toast.error("This bhajan is not available");
      return;
    }
    setEmergency("bhajan", item.notes || bhajan.notes || "", null, {
      ...bhajan,
      notes: item.notes || bhajan.notes
    });
  }

  if (!plan) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-sm text-muted-foreground">Loading live assembly...</div>;
  }

  const currentVideo = live.currentVideo;
  const displayVideo = emergencyMode === "video" && emergencyVideo ? emergencyVideo : currentVideo;
  const sabhaBhajanItems = plan.bhajanItems ?? [];
  const showIdleStage = emergencyMode === "none" && live.playbackStatus === "stopped";
  const collegeName = getCollegeDisplayName(settings?.collegeName);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          {settings?.logoUrl ? <Image src={settings.logoUrl} width={40} height={40} alt="" className="h-10 w-10 rounded-md object-contain" /> : null}
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold">{collegeName}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{plan.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={live.autoAdvance ? "default" : "outline"}>Auto-advance {live.autoAdvance ? "on" : "off"}</Badge>
          <ProjectorLauncher planId={plan._id} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/remote/${plan._id}`} target="_blank">
              <Smartphone className="h-4 w-4" />
              Mobile remote
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/display/${plan._id}`} target="_blank">
              <Tv className="h-4 w-4" />
              Audience display
            </Link>
          </Button>
          <p className="font-mono text-sm">{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
          <Button size="icon" variant="outline" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="relative min-h-0 bg-black">
          <LivePlayer
            video={displayVideo}
            onReady={player.setController}
            onEnded={
              emergencyMode === "video"
                ? () => {
                    live.setIsPlaying(false);
                    live.setPlaybackStatus("stopped");
                    syncMirrorState({ isPlaying: false, playbackStatus: "stopped", playbackSeconds: 0 });
                  }
                : live.handleEnded
            }
            onPlayingChange={live.setPlaybackPlaying}
          />
          <AnnouncementOverlay announcements={announcements} />
          {showIdleStage && (
            <PhotoStage
              imageUrl={settings?.idleImageUrl}
              logoUrl={settings?.logoUrl}
              title={collegeName}
              subtitle="Ready for sabha"
              className="z-10"
            />
          )}
          {emergencyMode === "blank" && <div className="absolute inset-0 z-30 bg-black" />}
          {emergencyMode === "idle" && (
            <PhotoStage
              imageUrl={settings?.idleImageUrl}
              logoUrl={settings?.logoUrl}
              title={collegeName}
              subtitle="Ready for sabha"
              className="z-20"
            />
          )}
          {emergencyMode === "bhajan" && (
            <BhajanLyricsStage
              bhajan={emergencyBhajan}
              logoUrl={settings?.logoUrl}
              className="z-20"
            />
          )}
          {emergencyMode === "logo" && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
              <div className="text-center text-white">
                {settings?.logoUrl ? (
                  <Image src={settings.logoUrl} alt="" width={180} height={180} className="mx-auto h-40 w-40 object-contain" />
                ) : null}
                <p className="mt-4 text-3xl font-semibold">{collegeName}</p>
              </div>
            </div>
          )}
          {emergencyMode === "message" && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-8 text-center text-white">
              <p className="max-w-4xl text-5xl font-semibold leading-tight">{emergencyMessage}</p>
            </div>
          )}
          {live.remainingSeconds !== null && live.remainingSeconds < 30 && (
            <div className="absolute left-4 top-4 rounded-md bg-background/90 px-3 py-2 text-sm font-medium shadow">
              Auto-stopping in {live.remainingSeconds}s
            </div>
          )}
        </main>

        <aside className="hidden min-h-0 flex-col overflow-hidden border-l bg-card xl:flex">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <ProjectorConfidence
              state={mirrorState}
              operatorSeconds={getPlaybackSeconds()}
              remoteHref={`/remote/${plan._id}`}
            />
            <section className="border-b p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Emergency controls</p>
                  <p className="text-xs text-muted-foreground">Projector-safe overrides</p>
                </div>
                <Badge variant={emergencyMode === "none" ? "outline" : "destructive"}>{emergencyMode === "none" ? "normal" : emergencyMode}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" className="justify-start" onClick={pauseEverything}>
                  <Pause className="h-4 w-4" />
                  Pause all
                </Button>
                <Button size="sm" variant="outline" className="justify-start" onClick={() => setEmergency("blank")}>
                  <Square className="h-4 w-4" />
                  Blank
                </Button>
                <Button size="sm" variant="outline" className="justify-start" onClick={() => setEmergency("logo")}>
                  <ImageIcon className="h-4 w-4" />
                  Logo
                </Button>
                <Button size="sm" variant="outline" className="justify-start" onClick={() => setEmergency("idle")}>
                  <ImageIcon className="h-4 w-4" />
                  Idle
                </Button>
                <Button size="sm" variant="secondary" className="col-span-2 justify-start" onClick={clearEmergency}>
                  <Eye className="h-4 w-4" />
                  Clear override
                </Button>
              </div>
              <div className="mt-3 space-y-2 rounded-md border bg-background/60 p-3">
                <p className="text-xs font-medium text-muted-foreground">Message on projector</p>
                <Input value={emergencyMessage} onChange={(event) => setEmergencyMessage(event.target.value)} />
                <Button size="sm" className="w-full" variant="secondary" onClick={() => setEmergency("message", emergencyMessage)}>
                  <AlertTriangle className="h-4 w-4" />
                  Show message
                </Button>
              </div>
              <div className="mt-3 space-y-2 rounded-md border bg-background/60 p-3">
                <p className="text-xs font-medium text-muted-foreground">Backup video</p>
                <Select value={backupVideoId} onValueChange={setBackupVideoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose backup video" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.map((video) => (
                      <SelectItem key={video._id} value={video._id}>
                        {video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full" onClick={playBackupVideo}>
                  <ExternalLink className="h-4 w-4" />
                  Play backup
                </Button>
              </div>
            </section>

            <section className="border-b p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Sabha bhajan list</p>
                <p className="text-xs text-muted-foreground">Ordered in the planner. Separate from the wallpaper.</p>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {sabhaBhajanItems.map((item, index) => {
                  const bhajan = item.bhajan as BhajanDoc;
                  return (
                    <button
                      key={item._id ?? `${bhajan._id}-${index}`}
                      className={`grid w-full grid-cols-[54px_1fr_auto] items-center gap-3 rounded-md border p-2 text-left transition ${
                        emergencyMode === "bhajan" && emergencyBhajan?._id === bhajan._id ? "border-primary bg-primary/10" : "hover:border-primary"
                      }`}
                      onClick={() => showBhajan(item)}
                    >
                      <span className="relative aspect-video overflow-hidden rounded bg-black">
                        <Image src={bhajan.imageUrl} alt="" fill sizes="54px" className="object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-1 text-sm font-medium">
                          {index + 1}. {bhajan.title}
                        </span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{item.notes || bhajan.notes || "Tap to show on projector"}</span>
                      </span>
                      <Badge variant={bhajan.lyricsText ? "secondary" : "outline"} className="text-[10px]">
                        {bhajan.lyricsText ? "lyrics" : "photo"}
                      </Badge>
                    </button>
                  );
                })}
                {sabhaBhajanItems.length === 0 && (
                  <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Add bhajans to this plan from the planner page.
                  </p>
                )}
              </div>
            </section>

            <section className="border-b p-4">
              <CountdownTimer />
            </section>

            <section className="p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Upcoming videos</p>
                <p className="text-xs text-muted-foreground">{plan.items.length} plan items</p>
              </div>
              <div className="space-y-2">
                {plan.items.map((item, index) => {
                  const video = item.video as VideoDoc;
                  const active = index === live.currentIndex;
                  const timedStop = item.autoStop && Boolean(item.overrideDuration || video.duration || scheduledWindowSeconds(item.scheduledStart, item.scheduledEnd));
                  return (
                    <button
                      key={item._id ?? `${video._id}-${index}`}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        active ? "border-primary bg-primary/10" : "hover:border-primary"
                      }`}
                      onClick={() => live.goTo(index)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">{video.title}</p>
                        <Badge variant={timedStop ? "secondary" : "outline"}>{timedStop ? "timed" : "full"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.scheduledStart}-{item.scheduledEnd} · {formatDuration(item.overrideDuration || video.duration || 0)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </aside>
      </div>

      <footer className="shrink-0 border-t bg-card">
        <div className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="outline" onClick={live.previous} aria-label="Previous video">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={playPause} aria-label="Play or pause">
              {live.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="outline" onClick={live.stop} aria-label="Stop video">
              <Square className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={live.next} aria-label="Next video">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleMute} aria-label="Mute">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider className="w-32" value={[volume]} min={0} max={1} step={0.01} onValueChange={onVolumeChange} />
            <label className="ml-2 flex items-center gap-2 text-sm">
              <Switch checked={live.autoAdvance} onCheckedChange={live.toggleAutoAdvance} />
              Auto-advance
            </label>
            {live.remainingSeconds !== null && (
              <Button size="sm" variant="outline" onClick={live.extendOneMinute}>
                Extend 1 min
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            <div className="text-sm">
              <p className="font-medium">{displayVideo?.title ?? "No video"}</p>
              <p className="text-xs text-muted-foreground">
                {live.remainingSeconds !== null ? `Auto-stop ${formatDuration(live.remainingSeconds)}` : "Plays full video"}
              </p>
            </div>
            <Button variant="destructive" onClick={endAssembly}>
              End assembly
            </Button>
          </div>
        </div>
        <AnnouncementTicker announcements={announcements} />
      </footer>
    </div>
  );
}

function scheduledWindowSeconds(start: string, end: string) {
  if (!start || !end) return 0;
  const minutes = timeToMinutes(end) - timeToMinutes(start);
  return minutes > 0 ? minutes * 60 : 0;
}
