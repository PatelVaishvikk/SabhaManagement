"use client";

import { format, isAfter, isSameMonth, intervalToDuration } from "date-fns";
import { CalendarClock, Clock3, Library, Play, Timer, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/clientFetch";
import { getCollegeDisplayName } from "@/lib/branding";
import { formatDuration } from "@/lib/utils/formatDuration";
import { getDriveProxyStreamUrl } from "@/lib/utils/googleDrive";
import type { AssemblyPlanDoc, SettingsDoc, VideoDoc } from "@/types";

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [plans, setPlans] = useState<AssemblyPlanDoc[]>([]);
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickVideo, setQuickVideo] = useState<VideoDoc | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    Promise.all([
      fetchJson<VideoDoc[]>("/api/videos", []),
      fetchJson<AssemblyPlanDoc[]>("/api/plans", []),
      fetchJson<SettingsDoc | null>("/api/settings", null)
    ]).then(([videoData, planData, settingsData]) => {
      setVideos(videoData);
      setPlans(planData);
      setSettings(settingsData);
    });
  }, []);

  // Tick every minute so the countdown stays live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const completedThisMonth = plans.filter((plan) => plan.status === "completed" && isSameMonth(new Date(plan.date), now)).length;
  const totalPlaytime = videos.reduce((sum, video) => sum + video.duration * video.playCount, 0);
  const mostPlayed = [...videos].sort((a, b) => b.playCount - a.playCount)[0];
  const upcoming = plans
    .filter((plan) => plan.status !== "completed" && isAfter(new Date(plan.date), now))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const upcomingCountdown = upcoming
    ? intervalToDuration({ start: now, end: new Date(upcoming.date) })
    : null;
  const countdownLabel = upcomingCountdown
    ? [
        upcomingCountdown.days ? `${upcomingCountdown.days}d` : null,
        upcomingCountdown.hours ? `${upcomingCountdown.hours}h` : null,
        upcomingCountdown.minutes !== undefined ? `${upcomingCountdown.minutes}m` : null
      ]
        .filter(Boolean)
        .join(" ") || "< 1 minute"
    : null;

  const quickResults = useMemo(() => {
    const needle = quickSearch.toLowerCase();
    return videos
      .filter((video) => `${video.title} ${video.tags.join(" ")}`.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [quickSearch, videos]);
  const quickVideoStreamUrl =
    quickVideo?.sourceType === "gdrive" && quickVideo.driveFileId ? getDriveProxyStreamUrl(quickVideo.driveFileId) : quickVideo?.streamUrl;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{getCollegeDisplayName(settings?.collegeName)} weekly sabha overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total videos" value={String(videos.length)} icon={Library} />
        <StatsCard title="Completed this month" value={String(completedThisMonth)} icon={CalendarClock} />
        <StatsCard title="Total playtime" value={formatDuration(totalPlaytime)} icon={Clock3} />
        <StatsCard title="Most played" value={mostPlayed ? `${mostPlayed.playCount}` : "0"} detail={mostPlayed?.title ?? "No plays yet"} icon={Trophy} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming assembly</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming ? (
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{upcoming.title}</h2>
                    <Badge>{upcoming.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {format(new Date(upcoming.date), "PPP")} · {upcoming.items.length} videos
                  </p>
                  {countdownLabel && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                      <Timer className="h-4 w-4" />
                      {countdownLabel} away
                    </p>
                  )}
                </div>
                <Button asChild>
                  <Link href={`/dashboard/live/${upcoming._id}`}>
                    <Play className="h-4 w-4" />
                    Start Assembly
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No future ready or draft plans yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search video" value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} />
            <div className="space-y-2">
              {quickResults.map((video) => (
                <button
                  key={video._id}
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:border-primary"
                  onClick={() => setQuickVideo(video)}
                >
                  <span className="line-clamp-1 text-sm font-medium">{video.title}</span>
                  <Badge variant="outline">{video.sourceType}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(settings?.activityFeed ?? []).slice().reverse().map((activity, index) => (
              <div key={`${activity.event}-${index}`} className="flex items-center justify-between rounded-md border p-3">
                <p className="text-sm">{activity.event}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(activity.at), "PP p")}</p>
              </div>
            ))}
            {!settings?.activityFeed?.length && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(quickVideo)} onOpenChange={(open) => !open && setQuickVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{quickVideo?.title}</DialogTitle>
          </DialogHeader>
          {quickVideo?.sourceType === "youtube" && quickVideo.youtubeId ? (
            <iframe className="aspect-video w-full rounded-md border" src={`https://www.youtube.com/embed/${quickVideo.youtubeId}`} title={quickVideo.title} allowFullScreen />
          ) : quickVideo ? (
            <video className="aspect-video w-full rounded-md bg-black" src={quickVideoStreamUrl} poster={quickVideo.thumbnailUrl} controls />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
