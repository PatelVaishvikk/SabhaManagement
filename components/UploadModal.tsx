"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, Link2, Loader2, Upload, Youtube } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { CLOUDINARY_VIDEO_MAX_BYTES, CLOUDINARY_VIDEO_MAX_MB } from "@/lib/uploadLimits";
import { extractDriveId, getDriveThumbnail } from "@/lib/utils/googleDrive";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/utils/youtube";
import { categories } from "@/lib/validators";
import type { VideoCategory, VideoDoc } from "@/types";

const baseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(categories),
  tags: z.string().optional(),
  duration: z.coerce.number().min(0).optional()
});

const youtubeSchema = baseSchema.extend({ url: z.string().url() });
const driveSchema = baseSchema.extend({ url: z.string().url() });

type BaseForm = z.infer<typeof baseSchema>;
type LinkForm = z.infer<typeof youtubeSchema>;
type DriveForm = z.infer<typeof driveSchema>;

interface UploadModalProps {
  onComplete: (video: VideoDoc) => void;
}

const defaultMeta: BaseForm = {
  title: "",
  description: "",
  category: "Announcement",
  tags: "",
  duration: 0
};

export function UploadModal({ onComplete }: UploadModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("");
  const [eta, setEta] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [youtubePreview, setYoutubePreview] = useState<{ title: string; thumbnailUrl: string; youtubeId: string } | null>(null);
  const [drivePreview, setDrivePreview] = useState<{ driveFileId: string; thumbnailUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadForm = useForm<BaseForm>({
    resolver: zodResolver(baseSchema) as never,
    defaultValues: defaultMeta
  });
  const youtubeForm = useForm<LinkForm>({
    resolver: zodResolver(youtubeSchema) as never,
    defaultValues: { ...defaultMeta, url: "" }
  });
  const driveForm = useForm<DriveForm>({
    resolver: zodResolver(driveSchema) as never,
    defaultValues: { ...defaultMeta, url: "" }
  });

  function onFilePicked(nextFile: File | null) {
    if (!nextFile) return;
    if (nextFile.size > CLOUDINARY_VIDEO_MAX_BYTES) {
      toast.error(`Cloudinary upload limit is ${CLOUDINARY_VIDEO_MAX_MB}MB for this account. Compress the file, use Drive, or upgrade Cloudinary.`);
      return;
    }
    if (nextFile.type !== "video/mp4") {
      toast.error("Only .mp4 files are supported");
      return;
    }
    setFile(nextFile);
    uploadForm.setValue("title", nextFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " "));
  }

  async function previewYouTube(url: string) {
    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) return;

    const fallback = {
      title: "YouTube video",
      thumbnailUrl: getYouTubeThumbnail(youtubeId),
      youtubeId
    };

    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      const data = response.ok ? await response.json() : null;
      const preview = {
        title: data?.title ?? fallback.title,
        thumbnailUrl: data?.thumbnail_url ?? fallback.thumbnailUrl,
        youtubeId
      };
      setYoutubePreview(preview);
      if (!youtubeForm.getValues("title")) youtubeForm.setValue("title", preview.title);
    } catch {
      setYoutubePreview(fallback);
      if (!youtubeForm.getValues("title")) youtubeForm.setValue("title", fallback.title);
    }
  }

  function previewDrive(url: string) {
    const driveFileId = extractDriveId(url);
    if (!driveFileId) {
      setDrivePreview(null);
      return;
    }
    setDrivePreview({ driveFileId, thumbnailUrl: getDriveThumbnail(driveFileId) });
  }

  function uploadFile(values: BaseForm) {
    if (!file) {
      toast.error("Choose an .mp4 file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", values.title);
    formData.append("description", values.description ?? "");
    formData.append("category", values.category);
    formData.append("tags", values.tags ?? "");
    formData.append("duration", String(values.duration ?? 0));

    const xhr = new XMLHttpRequest();
    const startedAt = Date.now();
    setUploading(true);
    setProgress(0);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
      const bytesPerSecond = event.loaded / elapsed;
      const remaining = (event.total - event.loaded) / Math.max(1, bytesPerSecond);
      setProgress(Math.round((event.loaded / event.total) * 100));
      setSpeed(`${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`);
      setEta(`${Math.max(1, Math.round(remaining))}s`);
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const video = JSON.parse(xhr.responseText) as VideoDoc;
        setUploadedPreview(video.thumbnailUrl ?? null);
        onComplete(video);
        toast.success("Video uploaded");
        return;
      }
      const data = safeJson(xhr.responseText);
      toast.error(data?.error ?? "Upload failed");
    };

    xhr.onerror = () => {
      setUploading(false);
      toast.error("Upload failed");
    };

    xhr.open("POST", "/api/videos/upload");
    xhr.send(formData);
  }

  async function saveLink(values: LinkForm, kind: "youtube" | "gdrive") {
    setLinkSaving(true);
    const response = await fetch(`/api/videos/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    setLinkSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Could not save video");
      return;
    }

    const video = (await response.json()) as VideoDoc;
    onComplete(video);
    toast.success("Video added");
    setOpen(false);
  }

  function CategorySelect({ value, onChange }: { value: VideoCategory; onChange: (value: VideoCategory) => void }) {
    return (
      <Select value={value} onValueChange={(next) => onChange(next as VideoCategory)}>
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
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4" />
          Add video
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add video</DialogTitle>
          <DialogDescription>Upload to Cloudinary or reference an external source.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">
              <CloudUpload className="mr-2 h-4 w-4" />
              Upload .mp4
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="mr-2 h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="gdrive">
              <Link2 className="mr-2 h-4 w-4" />
              Drive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <form className="space-y-4" onSubmit={uploadForm.handleSubmit(uploadFile)}>
              <button
                type="button"
                className="flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center transition hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  onFilePicked(event.dataTransfer.files.item(0));
                }}
                onDragOver={(event) => event.preventDefault()}
              >
                <CloudUpload className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">{file ? file.name : "Drop .mp4 or browse"}</span>
                <span className="text-xs text-muted-foreground">
                  {CLOUDINARY_VIDEO_MAX_MB}MB Cloudinary account limit
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="video/mp4" hidden onChange={(event) => onFilePicked(event.target.files?.item(0) ?? null)} />

              <MetadataFields form={uploadForm} categorySelect={CategorySelect} />

              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress}%</span>
                    <span>{speed} · ETA {eta}</span>
                  </div>
                </div>
              )}
              {uploadedPreview && (
                <div className="relative aspect-video w-56 overflow-hidden rounded-md border">
                  <Image src={uploadedPreview} alt="" fill className="object-cover" sizes="224px" />
                </div>
              )}
              <Button disabled={uploading}>
                {uploading && <Loader2 className="animate-spin" />}
                Upload to Cloudinary
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="youtube">
            <form className="space-y-4" onSubmit={youtubeForm.handleSubmit((values) => saveLink(values, "youtube"))}>
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input
                  {...youtubeForm.register("url")}
                  onBlur={(event) => previewYouTube(event.currentTarget.value)}
                  onPaste={(event) => setTimeout(() => previewYouTube((event.target as HTMLInputElement).value), 0)}
                />
              </div>
              {youtubePreview && <PreviewStrip title={youtubePreview.title} thumbnailUrl={youtubePreview.thumbnailUrl} badge="youtube" />}
              <MetadataFields form={youtubeForm} categorySelect={CategorySelect} />
              <Button disabled={linkSaving}>
                {linkSaving && <Loader2 className="animate-spin" />}
                Save YouTube video
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="gdrive">
            <form className="space-y-4" onSubmit={driveForm.handleSubmit((values) => saveLink(values, "gdrive"))}>
              <div className="space-y-2">
                <Label>Google Drive link</Label>
                <Input
                  {...driveForm.register("url")}
                  onBlur={(event) => previewDrive(event.currentTarget.value)}
                  onPaste={(event) => setTimeout(() => previewDrive((event.target as HTMLInputElement).value), 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Make sure your Drive file is set to Anyone with the link can view. Playback uses the app&apos;s Drive streaming proxy, so it behaves more like a normal video file.
                </p>
              </div>
              {drivePreview && <PreviewStrip title={driveForm.watch("title") || drivePreview.driveFileId} thumbnailUrl={drivePreview.thumbnailUrl} badge="drive" />}
              <MetadataFields form={driveForm} categorySelect={CategorySelect} />
              <Button disabled={linkSaving}>
                {linkSaving && <Loader2 className="animate-spin" />}
                Save Drive video
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as { error?: string };
  } catch {
    return null;
  }
}

function MetadataFields({
  form,
  categorySelect,
  durationRequired = false
}: {
  form: UseFormReturn<any>;
  categorySelect: (props: { value: VideoCategory; onChange: (value: VideoCategory) => void }) => JSX.Element;
  durationRequired?: boolean;
}) {
  const CategorySelect = categorySelect;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...form.register("title")} />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <CategorySelect value={form.watch("category") as VideoCategory} onChange={(value) => form.setValue("category", value)} />
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <Input placeholder="weekly, chapel" {...form.register("tags")} />
      </div>
      <div className="space-y-2">
        <Label>{durationRequired ? "Duration seconds" : "Duration seconds optional"}</Label>
        <Input type="number" min={durationRequired ? 1 : 0} {...form.register("duration")} />
        <p className="text-xs text-muted-foreground">
          Optional for link videos. If left blank, the video plays fully and planner totals show it as unknown.
        </p>
        {form.formState.errors.duration?.message ? (
          <p className="text-xs text-destructive">{String(form.formState.errors.duration.message)}</p>
        ) : null}
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Description</Label>
        <Textarea {...form.register("description")} />
      </div>
    </div>
  );
}

function PreviewStrip({ title, thumbnailUrl, badge }: { title: string; thumbnailUrl: string; badge: string }) {
  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="128px" />
      </div>
      <div className="min-w-0">
        <Badge variant="secondary">{badge}</Badge>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{title}</p>
      </div>
    </div>
  );
}
