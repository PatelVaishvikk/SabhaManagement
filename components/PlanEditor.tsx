"use client";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, Plus, Save, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { addSecondsToTime, detectTimeConflicts } from "@/lib/utils/time";
import { formatDuration } from "@/lib/utils/formatDuration";
import type { AssemblyPlanBhajanItem, AssemblyPlanDoc, AssemblyPlanItem, BhajanDoc, PlanStatus, VideoDoc } from "@/types";

interface PlanEditorProps {
  initialPlan: AssemblyPlanDoc;
  videos: VideoDoc[];
  bhajans: BhajanDoc[];
  defaultStartTime?: string;
}

type EditableItem = Omit<AssemblyPlanItem, "video"> & { id: string; video: VideoDoc };
type EditableBhajanItem = Omit<AssemblyPlanBhajanItem, "bhajan"> & { id: string; bhajan: BhajanDoc };

function normalizeItem(item: AssemblyPlanItem, index: number): EditableItem {
  const video = item.video as VideoDoc;
  return {
    id: item._id ?? `${video._id}-${index}`,
    video,
    scheduledStart: item.scheduledStart,
    scheduledEnd: item.scheduledEnd,
    overrideDuration: item.overrideDuration,
    autoStop: item.autoStop,
    notes: item.notes ?? ""
  };
}

function normalizeBhajanItem(item: AssemblyPlanBhajanItem, index: number): EditableBhajanItem {
  const bhajan = item.bhajan as BhajanDoc;
  return {
    id: item._id ?? `${bhajan._id}-${index}`,
    bhajan,
    notes: item.notes ?? ""
  };
}

export function PlanEditor({ initialPlan, videos, bhajans, defaultStartTime = "09:00" }: PlanEditorProps) {
  const [title, setTitle] = useState(initialPlan.title);
  const [description, setDescription] = useState(initialPlan.description ?? "");
  const [date, setDate] = useState(initialPlan.date.slice(0, 10));
  const [items, setItems] = useState<EditableItem[]>(() => initialPlan.items.map(normalizeItem));
  const [bhajanItems, setBhajanItems] = useState<EditableBhajanItem[]>(() => (initialPlan.bhajanItems ?? []).map(normalizeBhajanItem));
  const [search, setSearch] = useState("");
  const [bhajanSearch, setBhajanSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const filteredVideos = videos.filter((video) => {
    const text = `${video.title} ${video.tags.join(" ")}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });
  const selectedBhajanIds = new Set(bhajanItems.map((item) => item.bhajan._id));
  const filteredBhajans = bhajans.filter((bhajan) => {
    const text = `${bhajan.title} ${bhajan.notes ?? ""} ${bhajan.lyricsText ?? ""}`.toLowerCase();
    return bhajan.active && !selectedBhajanIds.has(bhajan._id) && text.includes(bhajanSearch.toLowerCase());
  });

  const totalDuration = items.reduce((sum, item) => sum + (item.overrideDuration || item.video.duration || 0), 0);
  const missingDurations = items.filter((item) => !item.overrideDuration && !item.video.duration).length;
  const totalDurationText =
    missingDurations > 0
      ? `${formatDuration(totalDuration)} known + ${missingDurations} full/unknown video${missingDurations === 1 ? "" : "s"}`
      : formatDuration(totalDuration);
  const hasConflicts = useMemo(() => detectTimeConflicts(items), [items]);

  function addVideo(video: VideoDoc) {
    const start = items.at(-1)?.scheduledEnd ?? defaultStartTime;
    const duration = video.duration || 0;
    setItems((current) => [
      ...current,
      {
        id: `${video._id}-${Date.now()}`,
        video,
        scheduledStart: start,
        scheduledEnd: addSecondsToTime(start, duration),
        overrideDuration: undefined,
        autoStop: duration > 0,
        notes: ""
      }
    ]);
  }

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.scheduledStart || patch.overrideDuration !== undefined) {
          next.scheduledEnd = addSecondsToTime(next.scheduledStart, next.overrideDuration || next.video.duration || 0);
        }
        return next;
      })
    );
  }

  function addBhajan(bhajan: BhajanDoc) {
    setBhajanItems((current) => [
      ...current,
      {
        id: `${bhajan._id}-${Date.now()}`,
        bhajan,
        notes: ""
      }
    ]);
  }

  function updateBhajanItem(id: string, patch: Partial<EditableBhajanItem>) {
    setBhajanItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function onBhajanDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBhajanItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  async function save(status: PlanStatus) {
    setSaving(true);
    const response = await fetch(`/api/plans/${initialPlan._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        date,
        status,
        items: items.map((item) => ({
          video: item.video._id,
          scheduledStart: item.scheduledStart,
          scheduledEnd: item.scheduledEnd,
          overrideDuration: item.overrideDuration,
          autoStop: item.autoStop,
          notes: item.notes
        })),
        bhajanItems: bhajanItems.map((item) => ({
          bhajan: item.bhajan._id,
          notes: item.notes
        }))
      })
    });
    setSaving(false);

    if (response.ok) {
      toast.success(status === "ready" ? "Plan marked ready" : "Plan saved");
    } else {
      toast.error("Could not save plan");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Plan details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Assembly sequence</CardTitle>
            {hasConflicts && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Time conflict
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Start and end are the planned clock times for the assembly schedule. If a video has no saved duration, the end time stays the same as the start time and the video will play fully unless you set Override sec.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((item, index) => (
                  <SortablePlanItem
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateItem}
                    onRemove={(id) => setItems((current) => current.filter((currentItem) => currentItem.id !== id))}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {items.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No videos added yet.</p>}
            {missingDurations > 0 && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                {missingDurations} item{missingDurations === 1 ? "" : "s"} have no saved duration. They will play fully by default.
                Set Override sec only when you want the video to finish early or at a specific planned time.
              </p>
            )}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Total duration {totalDurationText}</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={saving} onClick={() => save("draft")}>
                  <Save className="h-4 w-4" />
                  Save draft
                </Button>
                <Button disabled={saving} onClick={() => save("ready")}>
                  Mark ready
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Bhajan list for this sabha</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                This is separate from the wallpaper. Lyrics-ready bhajans open as a large audience reading screen in live mode.
              </p>
            </div>
            <Badge variant="outline">{bhajanItems.length} bhajans</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBhajanDragEnd}>
              <SortableContext items={bhajanItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {bhajanItems.map((item, index) => (
                  <SortableBhajanItem
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateBhajanItem}
                    onRemove={(id) => setBhajanItems((current) => current.filter((currentItem) => currentItem.id !== id))}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {bhajanItems.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No bhajans added to this sabha yet. Add from the Bhajan Library picker on the right.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add from library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search videos" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {filteredVideos.map((video) => (
                <button
                  key={video._id}
                  className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition hover:border-primary"
                  onClick={() => addVideo(video)}
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-sm font-medium">{video.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {video.duration > 0 ? formatDuration(video.duration) : "Missing duration"} · {video.category}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add bhajans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search bhajans" value={bhajanSearch} onChange={(event) => setBhajanSearch(event.target.value)} />
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {filteredBhajans.map((bhajan) => (
                <button
                  key={bhajan._id}
                  className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border p-2 text-left transition hover:border-primary"
                  onClick={() => addBhajan(bhajan)}
                >
                  <span className="relative aspect-video overflow-hidden rounded bg-black">
                    <Image src={bhajan.imageUrl} alt="" fill sizes="64px" className="object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-sm font-medium">{bhajan.title}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{bhajan.notes || "Bhajan"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={bhajan.lyricsText ? "secondary" : "outline"} className="text-[10px]">
                      {bhajan.lyricsText ? "lyrics" : "photo"}
                    </Badge>
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))}
              {filteredBhajans.length === 0 && <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">No available bhajans found.</p>}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function SortablePlanItem({
  item,
  index,
  onUpdate,
  onRemove
}: {
  item: EditableItem;
  index: number;
  onUpdate: (id: string, patch: Partial<EditableItem>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const hasKnownTiming = Boolean(item.overrideDuration || item.video.duration);
  const startEqualsEnd = item.scheduledStart === item.scheduledEnd;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-background p-3">
      <div className="grid gap-3 md:grid-cols-[auto_1fr_110px_110px_110px_auto] md:items-center">
        <button className="cursor-grab text-muted-foreground" type="button" {...attributes} {...listeners} aria-label="Drag item">
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold">
            {index + 1}. {item.video.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.overrideDuration || item.video.duration
              ? formatDuration(item.overrideDuration || item.video.duration || 0)
              : "Plays full video"}
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Starts at</Label>
          <Input type="time" value={item.scheduledStart} onChange={(event) => onUpdate(item.id, { scheduledStart: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ends at</Label>
          <Input type="time" value={item.scheduledEnd} onChange={(event) => onUpdate(item.id, { scheduledEnd: event.target.value })} />
          {!hasKnownTiming && startEqualsEnd ? <p className="text-[11px] text-muted-foreground">Unknown length, plays full.</p> : null}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Override sec</Label>
          <Input
            type="number"
            min={0}
            value={item.overrideDuration ?? ""}
            onChange={(event) =>
              onUpdate(item.id, {
                overrideDuration: event.target.value ? Number(event.target.value) : undefined
              })
            }
          />
          <p className="text-[11px] text-muted-foreground">Only set this to cut or time-limit the video.</p>
        </div>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onRemove(item.id)} aria-label="Remove video">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <Input placeholder="Notes" value={item.notes ?? ""} onChange={(event) => onUpdate(item.id, { notes: event.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={item.autoStop} onCheckedChange={(checked) => onUpdate(item.id, { autoStop: checked })} />
          Auto-stop
        </label>
      </div>
    </div>
  );
}

function SortableBhajanItem({
  item,
  index,
  onUpdate,
  onRemove
}: {
  item: EditableBhajanItem;
  index: number;
  onUpdate: (id: string, patch: Partial<EditableBhajanItem>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[auto_96px_1fr_auto] md:items-center">
      <button className="cursor-grab text-muted-foreground" type="button" {...attributes} {...listeners} aria-label="Drag bhajan">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="relative aspect-video overflow-hidden rounded-md bg-black">
        <Image src={item.bhajan.imageUrl} alt="" fill sizes="96px" className="object-contain" />
      </div>
      <div className="min-w-0 space-y-2">
        <div>
          <p className="line-clamp-1 text-sm font-semibold">
            {index + 1}. {item.bhajan.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={item.bhajan.lyricsText ? "secondary" : "outline"} className="text-[10px]">
              {item.bhajan.lyricsText ? "lyrics screen" : "photo screen"}
            </Badge>
            <p className="text-xs text-muted-foreground">{item.bhajan.notes || "Bhajan"}</p>
          </div>
        </div>
        <Input placeholder="Live note for this sabha" value={item.notes ?? ""} onChange={(event) => onUpdate(item.id, { notes: event.target.value })} />
      </div>
      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onRemove(item.id)} aria-label="Remove bhajan">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
