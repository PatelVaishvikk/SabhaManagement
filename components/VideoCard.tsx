"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Eye, Play, PlayCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/utils/formatDuration";
import { getDriveProxyStreamUrl } from "@/lib/utils/googleDrive";
import { categories } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { VideoDoc } from "@/types";

const editSchema = z.object({
  title: z.string().min(1),
  category: z.enum(categories),
  tags: z.string().optional(),
  description: z.string().optional(),
  duration: z.coerce.number().min(0)
});

type EditForm = z.infer<typeof editSchema>;

interface VideoCardProps {
  video: VideoDoc;
  view: "grid" | "list";
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (video: VideoDoc) => void;
  onDelete: (id: string) => void;
  priority?: boolean;
}

export function VideoCard({ video, view, selected, onSelect, onUpdate, onDelete, priority = false }: VideoCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema) as never,
    defaultValues: {
      title: video.title,
      category: video.category,
      tags: video.tags.join(", "),
      description: video.description ?? "",
      duration: video.duration
    }
  });

  async function save(values: EditForm) {
    setSaving(true);
    const response = await fetch(`/api/videos/${video._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        tags: values.tags ?? ""
      })
    });
    setSaving(false);

    if (response.ok) {
      onUpdate(await response.json());
      setEditOpen(false);
    }
  }

  function PlayerPreview() {
    if (video.sourceType === "youtube" && video.youtubeId) {
      return (
        <iframe
          className="aspect-video w-full rounded-md border"
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    const streamUrl = video.sourceType === "gdrive" && video.driveFileId ? getDriveProxyStreamUrl(video.driveFileId) : video.streamUrl;

    return <video className="aspect-video w-full rounded-md bg-black" src={streamUrl} poster={video.thumbnailUrl} controls />;
  }

  return (
    <>
      <Card className={cn("overflow-hidden transition hover:border-primary/50", selected && "border-primary ring-1 ring-primary")}>
        <CardContent className={cn("p-0", view === "list" && "grid gap-4 md:grid-cols-[220px_1fr]")}>
          <button className="relative aspect-video w-full overflow-hidden bg-muted text-left" onClick={() => setPreviewOpen(true)}>
            {video.thumbnailUrl ? (
              <Image
                src={video.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
                priority={priority}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <span className="absolute bottom-2 right-2 rounded bg-foreground/85 px-2 py-0.5 text-xs text-background">
              {video.duration > 0 ? formatDuration(video.duration) : "Missing duration"}
            </span>
          </button>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="line-clamp-2 text-sm font-semibold">{video.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <PlayCircle className="h-3.5 w-3.5" />
                  {video.playCount} {video.playCount === 1 ? "play" : "plays"}
                </p>
              </div>
              <input
                aria-label={`Select ${video.title}`}
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(video._id)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{video.sourceType}</Badge>
              <Badge variant="outline">{video.category}</Badge>
              {video.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => onDelete(video._id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{video.title}</DialogTitle>
            <DialogDescription>
              {video.sourceType === "gdrive"
                ? "Google Drive playback may require the file to be shared with Anyone with the link can view."
                : `${video.category} video preview`}
            </DialogDescription>
          </DialogHeader>
          <PlayerPreview />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit metadata</DialogTitle>
            <DialogDescription>Update the searchable details stored in MongoDB.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(save)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...form.register("title")} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.watch("category")} onValueChange={(value) => form.setValue("category", value as EditForm["category"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration seconds</Label>
                <Input type="number" min={0} {...form.register("duration")} />
                {video.duration <= 0 ? (
                  <p className="text-xs text-muted-foreground">Add this once so planner totals and auto-stop work.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input placeholder="chapel, weekly" {...form.register("tags")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
