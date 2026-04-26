"use client";

import {
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  LockKeyhole,
  MessageSquareWarning,
  Mic2,
  Monitor,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Tv,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCollegeDisplayName } from "@/lib/branding";
import { fetchJson } from "@/lib/clientFetch";
import { formatDuration } from "@/lib/utils/formatDuration";
import type { AnnouncementDoc, AssemblyPlanDoc, BhajanDoc, LiveStateDoc, SettingsDoc, VideoDoc } from "@/types";

interface DisplayPayload {
  plan: AssemblyPlanDoc;
  settings: SettingsDoc;
  announcements: AnnouncementDoc[];
  liveState: LiveStateDoc;
  serverTime?: number;
}

const passStorageKey = "assembly-manager-remote-pass";
const messagePresets = ["Jai Swaminarayan 🙏", "Please stand by", "Sabha starting soon", "Technical issue", "Break time"];
type Tab = "controls" | "bhajans" | "display";

function haptic(pattern: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export default function MobileRemotePage({ params }: { params: { planId: string } }) {
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [payload, setPayload] = useState<DisplayPayload | null>(null);
  const [message, setMessage] = useState("Please stand by");
  const [sending, setSending] = useState("");
  const [tab, setTab] = useState<Tab>("controls");
  const [localSeconds, setLocalSeconds] = useState(0);
  const [expandBhajans, setExpandBhajans] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localSecondsRef = useRef(localSeconds);
  localSecondsRef.current = localSeconds;

  const liveState = payload?.liveState;
  const status = liveState?.playbackStatus ?? (liveState?.isPlaying ? "playing" : "stopped");
  const currentIndex = liveState?.currentIndex ?? 0;
  const currentItem = payload?.plan.items[currentIndex];
  const currentVideo = currentItem?.video as VideoDoc | undefined;
  const collegeName = getCollegeDisplayName(payload?.settings.collegeName);
  const planItems = useMemo(() => payload?.plan.items ?? [], [payload?.plan.items]);
  const bhajanItems = useMemo(() => payload?.plan.bhajanItems ?? [], [payload?.plan.bhajanItems]);
  const duration = currentVideo?.duration ?? 0;
  const progress = duration > 0 ? Math.min(100, (localSeconds / duration) * 100) : 0;

  // Projector online = seen within last 6 seconds
  const projectorOnline = liveState?.projectorLastSeenAt
    ? (payload?.serverTime ?? Date.now()) - new Date(liveState.projectorLastSeenAt).getTime() < 6000
    : false;

  // Local tick for smooth progress bar
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (status === "playing") {
      tickRef.current = setInterval(() => setLocalSeconds((s) => s + 1), 1000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status]);

  // Sync localSeconds with server (only if drift > 2s to prevent jitter)
  useEffect(() => {
    if (liveState?.playbackSeconds !== undefined) {
      const srv = Number(liveState.playbackSeconds);
      if (Math.abs(srv - localSecondsRef.current) > 2 || status !== "playing") {
        setLocalSeconds(srv);
      }
    }
  }, [liveState?.playbackSeconds, currentIndex, status]);

  const load = useCallback(() => {
    if (!unlocked) return;
    fetchJson<DisplayPayload | null>(`/api/display/${params.planId}`, null).then((data) => {
      if (data && "plan" in data) setPayload(data);
    });
  }, [params.planId, unlocked]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(passStorageKey);
    if (saved) { setPass(saved); void unlock(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    if (!unlocked) return;
    const interval = window.setInterval(load, 1500);
    return () => window.clearInterval(interval);
  }, [load, unlocked]);

  async function unlock(nextPass = pass) {
    setUnlocking(true);
    const res = await fetch(`/api/remote/${params.planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass: nextPass, action: "unlock" })
    });
    setUnlocking(false);
    if (!res.ok) {
      haptic([50, 30, 50]);
      showToast("❌ Wrong PIN — try again", "error");
      setUnlocked(false);
      return;
    }
    haptic([20, 10, 40]);
    window.sessionStorage.setItem(passStorageKey, nextPass);
    setUnlocked(true);
  }

  async function command(action: string, body: Record<string, unknown> = {}) {
    if (!pass) return;
    haptic(12);
    setSending(action);
    const res = await fetch(`/api/remote/${params.planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass, action, ...body })
    });
    setSending("");
    if (!res.ok) {
      haptic([40, 20, 40]);
      const err = await res.json().catch(() => ({ error: "Command failed" }));
      showToast(err.error ?? "Command failed", "error");
      return;
    }
    const data = (await res.json()) as { liveState?: LiveStateDoc };
    if (payload && data.liveState) setPayload({ ...payload, liveState: data.liveState });
  }

  // ── Lock Screen ──────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] p-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Logo mark */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <Tv className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Sabha Remote</h1>
              <p className="text-sm text-white/40">Enter your access PIN</p>
            </div>
          </div>

          {/* PIN card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <form onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
              <div className="relative mb-4">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Remote PIN"
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 pr-12 text-base text-white placeholder-white/20 outline-none ring-0 transition focus:border-violet-500/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={unlocking || !pass}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition active:scale-[0.98] disabled:opacity-50"
              >
                {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {unlocking ? "Verifying…" : "Unlock Remote"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  const emergencyMode = liveState?.emergencyMode ?? "none";

  // ── Main Remote UI ────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0f] text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-700/10 blur-3xl" />
        <div
          className={`absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl transition-all duration-700 ${
            status === "playing" ? "bg-emerald-600/10" : status === "paused" ? "bg-amber-600/8" : "bg-zinc-700/8"
          }`}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/8 bg-white/3 px-4 py-3 backdrop-blur-xl">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white/40 uppercase tracking-widest">{collegeName}</p>
          <p className="truncate text-sm font-semibold text-white">{payload?.plan.title ?? "Loading…"}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Projector status */}
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${projectorOnline ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/40 text-white/30"}`}>
            {projectorOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{projectorOnline ? "Live" : "Offline"}</span>
          </div>
          {/* Playback badge */}
          <div className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
            status === "playing" ? "bg-emerald-500/20 text-emerald-400" :
            status === "paused"  ? "bg-amber-500/20 text-amber-400" :
                                   "bg-zinc-700/40 text-white/40"
          }`}>
            {status}
          </div>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <div className="relative z-10 flex border-b border-white/8 bg-white/2 backdrop-blur-xl">
        {([
          { id: "controls", label: "Controls", icon: <Zap className="h-3.5 w-3.5" /> },
          { id: "bhajans",  label: "Bhajans",  icon: <Music2 className="h-3.5 w-3.5" /> },
          { id: "display",  label: "Display",  icon: <Monitor className="h-3.5 w-3.5" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); haptic(8); }}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all ${
              tab === t.id
                ? "border-b-2 border-violet-500 text-violet-400"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="relative z-10 flex-1 overflow-y-auto pb-8">

        {/* ══════════ CONTROLS TAB ══════════ */}
        {tab === "controls" && (
          <div className="space-y-4 p-4">

            {/* Now Playing card */}
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md">
              <div className="flex gap-3 p-4">
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-black">
                  {currentVideo?.thumbnailUrl ? (
                    <Image src={currentVideo.thumbnailUrl} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/20">
                      <Tv className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">
                    {currentVideo?.title ?? "No video selected"}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {planItems.length ? `${currentIndex + 1} of ${planItems.length}` : "—"}
                    {emergencyMode !== "none" && (
                      <span className="ml-2 rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-400 capitalize">{emergencyMode}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {duration > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-[10px] text-white/30 mb-1.5">
                    <span>{formatDuration(localSeconds)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Big Play Controls ── */}
            <div className="flex items-center justify-center gap-5">
              <ActionBtn
                icon={<SkipBack className="h-6 w-6" />}
                label="Prev"
                loading={sending === "previous"}
                onClick={() => command("previous")}
                size="sm"
              />
              {/* Giant play/pause */}
              <button
                onClick={() => command(status === "playing" ? "pause" : "play", { playbackSeconds: localSeconds })}
                disabled={!!sending}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 ${
                  status === "playing"
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30"
                    : "bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-500/40"
                }`}
              >
                {(sending === "play" || sending === "pause") ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : status === "playing" ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 translate-x-0.5 text-white" />
                )}
                {/* Pulse ring when playing */}
                {status === "playing" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                )}
              </button>
              <ActionBtn
                icon={<SkipForward className="h-6 w-6" />}
                label="Next"
                loading={sending === "next"}
                onClick={() => command("next")}
                size="sm"
              />
            </div>

            {/* Stop */}
            <div className="flex justify-center">
              <button
                onClick={() => command("stop")}
                disabled={!!sending}
                className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2 text-sm font-medium text-red-400 transition active:scale-95 hover:bg-red-500/20"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </div>

            {/* Volume */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/35">Volume</p>
                <button
                  onClick={() => command("mute", { muted: !liveState?.muted })}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    liveState?.muted ? "bg-red-500/20 text-red-400" : "bg-white/8 text-white/50"
                  }`}
                >
                  {liveState?.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {liveState?.muted ? "Muted" : "Live"}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round((liveState?.volume ?? 0.85) * 100)}
                onChange={(e) => command("volume", { volume: Number(e.target.value) / 100 })}
                className="w-full accent-violet-500"
              />
              <div className="mt-1 flex justify-between text-[10px] text-white/20">
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>

            {/* Jump to video */}
            {planItems.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md overflow-hidden">
                <p className="px-4 pt-3.5 pb-2 text-xs font-semibold uppercase tracking-widest text-white/35">Jump to video</p>
                <div className="divide-y divide-white/5">
                  {planItems.map((item, idx) => {
                    const video = item.video as VideoDoc;
                    const active = idx === currentIndex;
                    return (
                      <button
                        key={item._id ?? `${video._id}-${idx}`}
                        onClick={() => command("goTo", { index: idx })}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/8 ${active ? "bg-violet-500/10" : ""}`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-violet-500 text-white" : "bg-white/8 text-white/40"}`}>
                          {idx + 1}
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${active ? "font-semibold text-white" : "text-white/60"}`}>
                          {video.title}
                        </span>
                        {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ BHAJANS TAB ══════════ */}
        {tab === "bhajans" && (
          <div className="space-y-3 p-4">
            {bhajanItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-white/25">
                <Music2 className="h-10 w-10" />
                <p className="text-sm">No bhajans in this plan</p>
              </div>
            ) : (
              bhajanItems.map((item, idx) => {
                const bhajan = item.bhajan as BhajanDoc;
                return (
                  <button
                    key={item._id ?? `${bhajan._id}-${idx}`}
                    onClick={() => command("bhajan", { bhajanId: bhajan._id, message: item.notes || bhajan.notes || "" })}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/4 p-3 text-left backdrop-blur-md transition active:scale-[0.98] active:bg-white/8"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
                      <Image src={bhajan.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{bhajan.title}</p>
                      {(item.notes || bhajan.notes) && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-white/35">{item.notes || bhajan.notes}</p>
                      )}
                      <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${bhajan.lyricsText ? "bg-violet-500/20 text-violet-400" : "bg-white/8 text-white/35"}`}>
                        {bhajan.lyricsText ? <Mic2 className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
                        {bhajan.lyricsText ? "Lyrics" : "Photo only"}
                      </div>
                    </div>
                    <Play className="h-5 w-5 shrink-0 text-violet-400/60" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ══════════ DISPLAY TAB ══════════ */}
        {tab === "display" && (
          <div className="space-y-4 p-4">
            {/* Quick display modes */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-white/35">Screen mode</p>
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { action: "clear",  label: "Show video",  icon: <Play className="h-5 w-5" />,        color: "from-violet-600 to-indigo-700", active: emergencyMode === "none" },
                  { action: "idle",   label: "Idle screen", icon: <ImageIcon className="h-5 w-5" />,   color: "from-sky-600 to-blue-700",      active: emergencyMode === "idle" },
                  { action: "blank",  label: "Black screen",icon: <Square className="h-5 w-5" />,       color: "from-zinc-600 to-zinc-800",     active: emergencyMode === "blank" },
                  { action: "logo",   label: "Show logo",   icon: <Tv className="h-5 w-5" />,           color: "from-emerald-600 to-teal-700",  active: emergencyMode === "logo" },
                ] as { action: string; label: string; icon: React.ReactNode; color: string; active: boolean }[]).map((item) => (
                  <button
                    key={item.action}
                    onClick={() => command(item.action)}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-sm font-semibold transition active:scale-95 ${
                      item.active
                        ? `bg-gradient-to-br ${item.color} shadow-lg text-white`
                        : "border border-white/8 bg-white/4 text-white/50"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto advance toggle */}
            <button
              onClick={() => command("autoAdvance", { enabled: !liveState?.autoAdvance })}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 transition active:scale-[0.99] ${
                liveState?.autoAdvance ? "border-violet-500/40 bg-violet-500/10" : "border-white/8 bg-white/4"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${liveState?.autoAdvance ? "bg-violet-500/30" : "bg-white/8"}`}>
                  <SkipForward className={`h-4 w-4 ${liveState?.autoAdvance ? "text-violet-400" : "text-white/35"}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${liveState?.autoAdvance ? "text-white" : "text-white/50"}`}>Auto-advance</p>
                  <p className="text-xs text-white/25">Move to next video on end</p>
                </div>
              </div>
              <div className={`h-5 w-9 rounded-full transition ${liveState?.autoAdvance ? "bg-violet-500" : "bg-white/15"}`}>
                <div className={`m-0.5 h-4 w-4 rounded-full bg-white transition-all ${liveState?.autoAdvance ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Message */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold">Projector message</p>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagePresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setMessage(p)}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50 transition hover:border-white/20 hover:text-white/80 active:scale-95"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => command("message", { message })}
                disabled={!!sending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition active:scale-[0.98] disabled:opacity-50"
              >
                <MessageSquareWarning className="h-4 w-4" />
                Show on projector
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, onClick, loading = false, size = "md"
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-white/5 text-white/60 transition active:scale-95 active:bg-white/10 disabled:opacity-40 ${
        size === "sm" ? "h-14 w-14" : "h-16 w-16"
      }`}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      <span className="text-[9px] font-medium uppercase tracking-wide">{label}</span>
    </button>
  );
}

// ── Simple toast ──────────────────────────────────────────────────────────────
function showToast(msg: string, type: "error" | "success" = "success") {
  // Use a simple fixed overlay toast since sonner may not be available in this context
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${type === "error" ? "#ef4444" : "#22c55e"};
    color:white;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:600;
    z-index:9999;white-space:nowrap;box-shadow:0 4px 24px rgba(0,0,0,0.4);
    transition:opacity 0.3s;
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 2500);
}
