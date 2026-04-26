"use client";

import type { AnnouncementDoc } from "@/types";

export function AnnouncementTicker({ announcements }: { announcements: AnnouncementDoc[] }) {
  const tickerText = announcements
    .filter((announcement) => announcement.active && (announcement.type === "ticker" || announcement.type === "both"))
    .map((announcement) => announcement.text)
    .join("   •   ");

  if (!tickerText) return <div className="h-10 border-t bg-card" />;

  return (
    <div className="h-10 overflow-hidden border-t bg-foreground text-background">
      <div className="flex h-full items-center whitespace-nowrap text-sm font-medium animate-marquee">{tickerText}</div>
    </div>
  );
}
