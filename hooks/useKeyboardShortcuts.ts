"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  playPause: () => void;
  next: () => void;
  previous: () => void;
  fullscreen: () => void;
  mute: () => void;
  exitFullscreen: () => void;
  autoAdvance: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (event.code === "Space") {
        event.preventDefault();
        handlers.playPause();
      }
      if (event.key.toLowerCase() === "n") handlers.next();
      if (event.key.toLowerCase() === "p") handlers.previous();
      if (event.key.toLowerCase() === "f") handlers.fullscreen();
      if (event.key.toLowerCase() === "m") handlers.mute();
      if (event.key === "Escape") handlers.exitFullscreen();
      if (event.key.toLowerCase() === "a") handlers.autoAdvance();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
