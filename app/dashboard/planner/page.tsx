"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addWeeks, format } from "date-fns";
import { CalendarPlus, Copy, Link2, MonitorPlay, Pencil, Smartphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { fetchJson } from "@/lib/clientFetch";
import { formatDuration } from "@/lib/utils/formatDuration";
import type { AssemblyPlanDoc, VideoDoc } from "@/types";

const createPlanSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional()
});

type CreatePlanForm = z.infer<typeof createPlanSchema>;

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(text);
  } else {
    // Fallback for HTTP (non-secure) contexts e.g. mobile on local network
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export default function PlannerPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<AssemblyPlanDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const form = useForm<CreatePlanForm>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      title: "Weekly Assembly",
      date: format(new Date(), "yyyy-MM-dd"),
      description: ""
    }
  });

  useEffect(() => {
    fetchJson<AssemblyPlanDoc[]>("/api/plans", [])
      .then((data) => setPlans(data))
      .finally(() => setLoading(false));
  }, []);

  async function createPlan(values: CreatePlanForm) {
    const response = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, status: "draft", items: [], bhajanItems: [] })
    });

    if (!response.ok) {
      toast.error("Could not create plan");
      return;
    }

    const plan = await readResponseJson<AssemblyPlanDoc | null>(response, null);
    if (!plan) {
      toast.error("Plan was created, but the response could not be read. Refresh the planner.");
      return;
    }
    router.push(`/dashboard/planner/${plan._id}`);
  }

  async function duplicatePlan(plan: AssemblyPlanDoc) {
    const response = await fetch(`/api/plans/${plan._id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDate: addWeeks(new Date(plan.date), 1).toISOString() })
    });

    if (response.ok) {
      const duplicated = await readResponseJson<AssemblyPlanDoc | null>(response, null);
      if (!duplicated) {
        toast.error("Plan duplicated, but the response could not be read. Refresh the planner.");
        return;
      }
      setPlans((current) => [duplicated, ...current]);
      toast.success("Plan duplicated");
    }
  }

  async function deletePlan(id: string) {
    const response = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    if (response.ok) {
      setPlans((current) => current.filter((plan) => plan._id !== id));
      toast.success("Plan deleted");
    }
  }

  function planDuration(plan: AssemblyPlanDoc) {
    return plan.items.reduce((sum, item) => {
      const video = item.video as VideoDoc;
      return sum + (item.overrideDuration || video.duration || 0);
    }, 0);
  }

  function planDurationLabel(plan: AssemblyPlanDoc) {
    const known = planDuration(plan);
    const unknown = plan.items.filter((item) => {
      const video = item.video as VideoDoc;
      return !item.overrideDuration && !video.duration;
    }).length;

    return unknown > 0
      ? `${formatDuration(known)} known + ${unknown} full/unknown`
      : formatDuration(known);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Assembly Planner</h1>
        <p className="text-sm text-muted-foreground">Create weekly sequences, duplicate recurring plans, and launch live mode.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_180px_auto]" onSubmit={form.handleSubmit(createPlan)}>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register("date")} />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <CalendarPlus className="h-4 w-4" />
                Create
              </Button>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Description</Label>
              <Textarea {...form.register("description")} />
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        ) : (
          plans.map((plan) => (
            <Card key={plan._id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{plan.title}</h2>
                      <Badge variant={plan.status === "completed" ? "secondary" : plan.status === "ready" ? "default" : "outline"}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {format(new Date(plan.date), "PPP")} · {plan.items.length} videos · {planDurationLabel(plan)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="icon" variant="outline" aria-label="Edit plan">
                      <Link href={`/dashboard/planner/${plan._id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="icon" variant="secondary" aria-label="Start live mode">
                      <Link href={`/dashboard/live/${plan._id}`}>
                        <MonitorPlay className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="icon" variant="outline" aria-label="Open mobile remote">
                      <a href={`/remote/${plan._id}`} target="_blank" rel="noreferrer">
                        <Smartphone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Copy remote link"
                      onClick={() => {
                        const url = `${window.location.origin}/remote/${plan._id}`;
                        copyToClipboard(url);
                        toast.success("Remote link copied!", { description: url });
                      }}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Duplicate plan" onClick={() => duplicatePlan(plan)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" aria-label="Delete plan" onClick={() => deletePlan(plan._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

async function readResponseJson<T>(response: Response, fallback: T): Promise<T> {
  try {
    const text = await response.text();
    return text.trim() ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}
