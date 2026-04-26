"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlanEditor } from "@/components/PlanEditor";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/clientFetch";
import type { AssemblyPlanDoc, BhajanDoc, SettingsDoc, VideoDoc } from "@/types";

export default function PlanEditorPage({ params }: { params: { id: string } }) {
  const [plan, setPlan] = useState<AssemblyPlanDoc | null>(null);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [bhajans, setBhajans] = useState<BhajanDoc[]>([]);
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<AssemblyPlanDoc | null>(`/api/plans/${params.id}`, null),
      fetchJson<VideoDoc[]>("/api/videos", []),
      fetchJson<BhajanDoc[]>("/api/bhajans", []),
      fetchJson<SettingsDoc | null>("/api/settings", null)
    ])
      .then(([planData, videoData, bhajanData, settingsData]) => {
        setPlan(planData);
        setVideos(videoData);
        setBhajans(bhajanData);
        setSettings(settingsData);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading plan...</p>;
  if (!plan) return <p className="text-sm text-muted-foreground">Plan not found.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Edit Plan</h1>
          <p className="text-sm text-muted-foreground">Arrange videos, tune timings, and prepare live assembly mode.</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/live/${plan._id}`}>Open live mode</Link>
        </Button>
      </div>
      <PlanEditor initialPlan={plan} videos={videos} bhajans={bhajans} defaultStartTime={settings?.defaultTime ?? "09:00"} />
    </div>
  );
}
