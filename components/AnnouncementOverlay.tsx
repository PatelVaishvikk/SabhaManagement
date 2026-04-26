"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnnouncementDoc } from "@/types";

export function AnnouncementOverlay({ announcements }: { announcements: AnnouncementDoc[] }) {
  const overlays = useMemo(
    () => announcements.filter((announcement) => announcement.active && (announcement.type === "overlay" || announcement.type === "both")),
    [announcements]
  );
  const [visible, setVisible] = useState<AnnouncementDoc | null>(null);

  useEffect(() => {
    if (!overlays.length) {
      setVisible(null);
      return;
    }

    setVisible(overlays[0]);
    const timeout = window.setTimeout(() => setVisible(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [overlays]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-2xl rounded-lg bg-background/90 p-6 text-center text-2xl font-semibold shadow-lg backdrop-blur">
        {visible.text}
      </div>
    </div>
  );
}
