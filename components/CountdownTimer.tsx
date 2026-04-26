"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { formatDuration } from "@/lib/utils/formatDuration";
import { cn } from "@/lib/utils";

const presets = [60, 180, 300, 600, 900, 1800];

export function CountdownTimer() {
  const timer = useCountdownTimer(300);
  const [custom, setCustom] = useState(5);
  const ring = 2 * Math.PI * 46;
  const offset = ring - ring * timer.progress;
  const tone = timer.progress <= 0.1 ? "text-destructive" : timer.progress <= 0.25 ? "text-amber-500" : "text-primary";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28">
          <svg className="-rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="8"
              strokeDasharray={ring}
              strokeDashoffset={offset}
              className={cn("transition-all duration-500", tone)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">{formatDuration(timer.remaining)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((seconds) => (
            <Button key={seconds} size="sm" variant="outline" onClick={() => timer.setPreset(seconds)}>
              {seconds / 60}m
            </Button>
          ))}
          <div className="flex gap-2">
            <Input className="h-8 w-20" type="number" min={1} value={custom} onChange={(event) => setCustom(Number(event.target.value))} />
            <Button size="sm" variant="outline" onClick={() => timer.setCustomSeconds(Math.max(1, custom) * 60)}>
              Set
            </Button>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={timer.running ? timer.pause : timer.start}>
          {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {timer.running ? "Pause" : "Start"}
        </Button>
        <Button size="sm" variant="outline" onClick={timer.reset}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
