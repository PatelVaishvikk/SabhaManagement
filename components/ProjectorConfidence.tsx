"use client";

import { CheckCircle2, Clock3, Smartphone, Tv, WifiOff } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LiveStateDoc } from "@/types";

interface ProjectorConfidenceProps {
  state: LiveStateDoc | null;
  operatorSeconds: number;
  remoteHref: string;
}

export function ProjectorConfidence({ state, operatorSeconds, remoteHref }: ProjectorConfidenceProps) {
  const lastSeen = state?.projectorLastSeenAt ? new Date(state.projectorLastSeenAt) : null;
  const ageSeconds = lastSeen ? Math.max(0, Math.round((Date.now() - lastSeen.getTime()) / 1000)) : null;
  const connected = typeof ageSeconds === "number" && ageSeconds <= 5;
  const drift = Math.abs((state?.projectorPlaybackSeconds ?? 0) - operatorSeconds);
  const driftLabel = Number.isFinite(drift) ? `${drift.toFixed(1)}s` : "0.0s";

  return (
    <section className="border-b p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Projector confidence</p>
          <p className="text-xs text-muted-foreground">Audience screen mirror status</p>
        </div>
        <Badge variant={connected ? "default" : "destructive"} className="gap-1">
          {connected ? <CheckCircle2 className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? "connected" : "waiting"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border bg-background/60 p-2">
          <p className="text-muted-foreground">Last seen</p>
          <p className="mt-1 font-medium">{ageSeconds === null ? "Not opened" : `${ageSeconds}s ago`}</p>
        </div>
        <div className="rounded-md border bg-background/60 p-2">
          <p className="text-muted-foreground">Fullscreen</p>
          <p className="mt-1 font-medium">{state?.projectorFullscreen ? "On" : "Off"}</p>
        </div>
        <div className="rounded-md border bg-background/60 p-2">
          <p className="text-muted-foreground">Projector mode</p>
          <p className="mt-1 font-medium">{state?.projectorEmergencyMode ?? "none"}</p>
        </div>
        <div className="rounded-md border bg-background/60 p-2">
          <p className="text-muted-foreground">Time drift</p>
          <p className="mt-1 flex items-center gap-1 font-medium">
            <Clock3 className="h-3 w-3" />
            {driftLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline" className="justify-start">
          <Link href={remoteHref} target="_blank">
            <Smartphone className="h-4 w-4" />
            Mobile remote
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 rounded-md border bg-background/60 px-2 text-xs text-muted-foreground">
          <Tv className="h-4 w-4" />
          {state?.projectorPlaybackStatus ?? "stopped"}
        </div>
      </div>
      {state?.commandName ? (
        <p className="mt-2 line-clamp-1 text-[11px] text-muted-foreground">
          Last remote command: {state.commandName}
        </p>
      ) : null}
    </section>
  );
}
