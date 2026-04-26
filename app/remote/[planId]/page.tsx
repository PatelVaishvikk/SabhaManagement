"use client";

import {
  Eye,
  ImageIcon,
  Loader2,
  LockKeyhole,
  MessageSquareWarning,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Tv,
  Volume2,
  VolumeX
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getCollegeDisplayName } from "@/lib/branding";
import { fetchJson } from "@/lib/clientFetch";
import type { AnnouncementDoc, AssemblyPlanDoc, BhajanDoc, LiveStateDoc, SettingsDoc, VideoDoc } from "@/types";

interface DisplayPayload {
  plan: AssemblyPlanDoc;
  settings: SettingsDoc;
  announcements: AnnouncementDoc[];
  liveState: LiveStateDoc;
}

const passStorageKey = "assembly-manager-remote-pass";
const messagePresets = ["Jai Swaminarayan", "Please stand by", "Sabha starting soon", "Technical issue", "Break time"];

export default function MobileRemotePage({ params }: { params: { planId: string } }) {
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [payload, setPayload] = useState<DisplayPayload | null>(null);
  const [message, setMessage] = useState("Please stand by");
  const [sending, setSending] = useState("");

  const liveState = payload?.liveState;
  const status = liveState?.playbackStatus ?? (liveState?.isPlaying ? "playing" : "stopped");
  const currentIndex = liveState?.currentIndex ?? 0;
  const currentItem = payload?.plan.items[currentIndex];
  const currentVideo = currentItem?.video as VideoDoc | undefined;
  const collegeName = getCollegeDisplayName(payload?.settings.collegeName);

  const planItems = useMemo(() => payload?.plan.items ?? [], [payload?.plan.items]);
  const bhajanItems = useMemo(() => payload?.plan.bhajanItems ?? [], [payload?.plan.bhajanItems]);

  const load = useCallback(() => {
    if (!unlocked) return;
    fetchJson<DisplayPayload | null>(`/api/display/${params.planId}`, null).then((data) => {
      if (data && "plan" in data) setPayload(data);
    });
  }, [params.planId, unlocked]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(passStorageKey);
    if (saved) {
      setPass(saved);
      void unlock(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    if (!unlocked) return;
    const interval = window.setInterval(load, 1000);
    return () => window.clearInterval(interval);
  }, [load, unlocked]);

  async function unlock(nextPass = pass) {
    setUnlocking(true);
    const response = await fetch(`/api/remote/${params.planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass: nextPass, action: "unlock" })
    });
    setUnlocking(false);

    if (!response.ok) {
      toast.error("Remote pass is incorrect");
      setUnlocked(false);
      return;
    }

    window.sessionStorage.setItem(passStorageKey, nextPass);
    setUnlocked(true);
  }

  async function command(action: string, body: Record<string, unknown> = {}) {
    if (!pass) {
      toast.error("Enter the remote pass first");
      return;
    }
    setSending(action);
    const response = await fetch(`/api/remote/${params.planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass, action, ...body })
    });
    setSending("");

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Remote command failed" }));
      toast.error(error.error ?? "Remote command failed");
      return;
    }

    const data = (await response.json()) as { liveState?: LiveStateDoc };
    if (payload && data.liveState) {
      setPayload({ ...payload, liveState: data.liveState });
    }
  }

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="w-full max-w-sm rounded-md border border-white/10 bg-zinc-900 p-5 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Mobile Remote</h1>
          <p className="mt-1 text-sm text-white/60">Unlock HSAPSS Windsor sabha controls.</p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void unlock();
            }}
          >
            <Input
              type="password"
              value={pass}
              onChange={(event) => setPass(event.target.value)}
              placeholder="Remote pass"
              className="bg-zinc-950"
              autoFocus
            />
            <Button className="w-full" disabled={unlocking}>
              {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              Unlock remote
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 text-lg font-semibold">{collegeName}</p>
            <p className="line-clamp-1 text-xs text-white/55">{payload?.plan.title ?? "Loading sabha..."}</p>
          </div>
          <Badge variant={status === "playing" ? "default" : status === "paused" ? "secondary" : "outline"}>
            {status}
          </Badge>
        </div>
      </header>

      <div className="space-y-4 p-4 pb-24">
        <section className="rounded-md border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-wide text-white/45">Now controlling</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded bg-black">
              {currentVideo?.thumbnailUrl ? (
                <Image src={currentVideo.thumbnailUrl} alt="" fill sizes="112px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-white/40">
                  <Tv className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-base font-semibold">{currentVideo?.title ?? "No video selected"}</p>
              <p className="mt-1 text-xs text-white/50">
                Item {planItems.length ? currentIndex + 1 : 0} of {planItems.length} · {liveState?.emergencyMode ?? "none"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <RemoteButton label="Previous" icon={<SkipBack className="h-7 w-7" />} onClick={() => command("previous")} />
          <RemoteButton
            label={status === "playing" ? "Pause" : "Play"}
            icon={status === "playing" ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            primary
            loading={sending === "play" || sending === "pause"}
            onClick={() => command(status === "playing" ? "pause" : "play")}
          />
          <RemoteButton label="Next" icon={<SkipForward className="h-7 w-7" />} onClick={() => command("next")} />
          <RemoteButton label="Stop" icon={<Square className="h-7 w-7" />} danger onClick={() => command("stop")} />
          <RemoteButton label="Idle" icon={<ImageIcon className="h-7 w-7" />} onClick={() => command("idle")} />
          <RemoteButton label="Clear" icon={<Eye className="h-7 w-7" />} onClick={() => command("clear")} />
        </section>

        <section className="rounded-md border border-white/10 bg-zinc-900 p-4">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="border-white/15 bg-zinc-950 text-white" onClick={() => command("blank")}>
              Blank
            </Button>
            <Button variant="outline" className="border-white/15 bg-zinc-950 text-white" onClick={() => command("logo")}>
              Logo
            </Button>
            <Button
              variant={liveState?.autoAdvance ? "default" : "outline"}
              className={liveState?.autoAdvance ? "" : "border-white/15 bg-zinc-950 text-white"}
              onClick={() => command("autoAdvance", { enabled: !liveState?.autoAdvance })}
            >
              Auto
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              className="border-white/15 bg-zinc-950 text-white"
              onClick={() => command("mute", { muted: !liveState?.muted })}
              aria-label="Mute"
            >
              {liveState?.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[liveState?.volume ?? 0.85]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(value) => command("volume", { volume: value[0] ?? 0.85 })}
            />
          </div>
        </section>

        <section className="rounded-md border border-white/10 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4 text-primary" />
            <p className="font-semibold">Projector message</p>
          </div>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-20 bg-zinc-950" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {messagePresets.map((preset) => (
              <Button key={preset} variant="outline" className="border-white/15 bg-zinc-950 text-white" onClick={() => setMessage(preset)}>
                {preset}
              </Button>
            ))}
          </div>
          <Button className="mt-3 w-full" onClick={() => command("message", { message })}>
            Show message
          </Button>
        </section>

        <section className="rounded-md border border-white/10 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Music2 className="h-4 w-4 text-primary" />
            <p className="font-semibold">Sabha bhajans</p>
          </div>
          <div className="space-y-2">
            {bhajanItems.map((item, index) => {
              const bhajan = item.bhajan as BhajanDoc;
              return (
                <button
                  key={item._id ?? `${bhajan._id}-${index}`}
                  className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-zinc-950 p-2 text-left"
                  onClick={() => command("bhajan", { bhajanId: bhajan._id, message: item.notes || bhajan.notes || "" })}
                >
                  <span className="relative aspect-video overflow-hidden rounded bg-black">
                    <Image src={bhajan.imageUrl} alt="" fill sizes="64px" className="object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-sm font-medium">
                      {index + 1}. {bhajan.title}
                    </span>
                    <span className="line-clamp-1 text-xs text-white/45">{item.notes || bhajan.notes || "Show on projector"}</span>
                  </span>
                  <Badge variant={bhajan.lyricsText ? "secondary" : "outline"}>{bhajan.lyricsText ? "lyrics" : "photo"}</Badge>
                </button>
              );
            })}
            {!bhajanItems.length ? <p className="rounded-md border border-dashed border-white/15 p-4 text-center text-sm text-white/45">No bhajans in this plan.</p> : null}
          </div>
        </section>

        <section className="rounded-md border border-white/10 bg-zinc-900 p-4">
          <p className="mb-3 font-semibold">Jump to video</p>
          <div className="space-y-2">
            {planItems.map((item, index) => {
              const video = item.video as VideoDoc;
              const active = index === currentIndex;
              return (
                <button
                  key={item._id ?? `${video._id}-${index}`}
                  className={`w-full rounded-md border p-3 text-left ${active ? "border-primary bg-primary/15" : "border-white/10 bg-zinc-950"}`}
                  onClick={() => command("goTo", { index })}
                >
                  <p className="line-clamp-1 text-sm font-medium">
                    {index + 1}. {video.title}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {item.scheduledStart}-{item.scheduledEnd}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function RemoteButton({
  label,
  icon,
  onClick,
  primary = false,
  danger = false,
  loading = false
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium shadow-sm active:scale-[0.99] ${
        primary
          ? "border-primary bg-primary text-primary-foreground"
          : danger
            ? "border-red-500/50 bg-red-500/15 text-red-100"
            : "border-white/10 bg-zinc-900 text-white"
      }`}
      onClick={onClick}
    >
      {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : icon}
      {label}
    </button>
  );
}
