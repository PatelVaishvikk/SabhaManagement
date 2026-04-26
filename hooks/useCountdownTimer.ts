"use client";

import { useEffect, useMemo, useState } from "react";

export function useCountdownTimer(initialSeconds = 300) {
  const [duration, setDuration] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          playChime();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  const progress = useMemo(() => (duration ? remaining / duration : 0), [duration, remaining]);

  function setPreset(seconds: number) {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
  }

  function reset() {
    setRemaining(duration);
    setRunning(false);
  }

  return {
    duration,
    remaining,
    running,
    progress,
    setPreset,
    setCustomSeconds: setPreset,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset
  };
}

function playChime() {
  const AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  const ctx = new AudioContextConstructor();
  const osc = ctx.createOscillator();
  osc.frequency.value = 880;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}
