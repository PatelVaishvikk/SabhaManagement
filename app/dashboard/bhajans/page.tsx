"use client";

import { FileText, ImagePlus, Loader2, Save, ScanText, Search, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/clientFetch";
import type { BhajanDoc } from "@/types";

export default function BhajansPage() {
  const [bhajans, setBhajans] = useState<BhajanDoc[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [lyricsDrafts, setLyricsDrafts] = useState<Record<string, string>>({});
  const [ocrStates, setOcrStates] = useState<Record<string, { status: string; progress: number }>>({});
  const [savingLyricsId, setSavingLyricsId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lyricsFilter, setLyricsFilter] = useState<"all" | "lyrics" | "photo">("all");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const stats = useMemo(
    () => ({
      total: bhajans.length,
      active: bhajans.filter((bhajan) => bhajan.active).length,
      lyricsReady: bhajans.filter((bhajan) => Boolean(bhajan.lyricsText?.trim())).length
    }),
    [bhajans]
  );
  const filteredBhajans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bhajans.filter((bhajan) => {
      const hasLyrics = Boolean(bhajan.lyricsText?.trim());
      if (lyricsFilter === "lyrics" && !hasLyrics) return false;
      if (lyricsFilter === "photo" && hasLyrics) return false;
      if (!normalizedQuery) return true;

      const searchable = `${bhajan.title} ${bhajan.notes ?? ""} ${bhajan.lyricsText ?? ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [bhajans, lyricsFilter, query]);

  useEffect(() => {
    fetchJson<BhajanDoc[]>("/api/bhajans", []).then((data) => {
      setBhajans(data);
      setLyricsDrafts(Object.fromEntries(data.map((bhajan) => [bhajan._id, bhajan.lyricsText ?? ""])));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function uploadBhajan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a bhajan photo first");
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name.replace(/\.[^.]+$/, ""));
    formData.append("notes", notes);
    formData.append("lyricsLanguage", "guj");

    const response = await fetch("/api/bhajans", { method: "POST", body: formData });
    setSaving(false);

    if (response.ok) {
      const created = (await response.json()) as BhajanDoc;
      setBhajans((current) => [...current, created].sort((a, b) => a.order - b.order));
      setLyricsDrafts((current) => ({ ...current, [created._id]: created.lyricsText ?? "" }));
      setTitle("");
      setNotes("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Bhajan photo uploaded");
    } else {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      toast.error(error.error ?? "Upload failed");
    }
  }

  async function updateBhajan(id: string, patch: Partial<BhajanDoc>) {
    const response = await fetch(`/api/bhajans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });

    if (response.ok) {
      const updated = (await response.json()) as BhajanDoc;
      setBhajans((current) => current.map((bhajan) => (bhajan._id === id ? updated : bhajan)));
      if ("lyricsText" in patch) {
        setLyricsDrafts((current) => ({ ...current, [id]: updated.lyricsText ?? "" }));
      }
      return updated;
    } else {
      toast.error("Could not update bhajan");
      return null;
    }
  }

  async function deleteBhajan(id: string) {
    const bhajan = bhajans.find((item) => item._id === id);
    if (!window.confirm(`Delete "${bhajan?.title ?? "this bhajan"}" and remove its public image file?`)) return;

    const response = await fetch(`/api/bhajans/${id}`, { method: "DELETE" });
    if (response.ok) {
      setBhajans((current) => current.filter((item) => item._id !== id));
      toast.success("Bhajan deleted");
    } else {
      toast.error("Could not delete bhajan");
    }
  }

  function pickFile(nextFile: File | null) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    setFile(nextFile);
    if (!title) setTitle(nextFile.name.replace(/\.[^.]+$/, ""));
  }

  function updateLyricsDraft(id: string, value: string) {
    setLyricsDrafts((current) => ({ ...current, [id]: value }));
  }

  async function saveLyrics(bhajan: BhajanDoc) {
    setSavingLyricsId(bhajan._id);
    const updated = await updateBhajan(bhajan._id, {
      lyricsText: lyricsDrafts[bhajan._id] ?? "",
      lyricsLanguage: "guj"
    });
    setSavingLyricsId(null);
    if (updated) toast.success("Bhajan lyrics saved");
  }

  async function extractLyrics(bhajan: BhajanDoc) {
    setOcrStates((current) => ({ ...current, [bhajan._id]: { status: "Preparing Gujarati OCR", progress: 0 } }));

    try {
      const { recognize } = await import("tesseract.js");
      const imageUrl = new URL(bhajan.imageUrl, window.location.origin).toString();
      const result = await recognize(imageUrl, "guj+eng", {
        logger: (message) => {
          const progress = Math.round((message.progress ?? 0) * 100);
          setOcrStates((current) => ({
            ...current,
            [bhajan._id]: {
              status: message.status || "Reading bhajan photo",
              progress: Number.isFinite(progress) ? progress : 0
            }
          }));
        }
      });
      const cleaned = cleanExtractedText(result.data.text);

      if (!cleaned) {
        toast.error("No readable Gujarati text found. Try a clearer photo or paste the lyrics manually.");
        return;
      }

      updateLyricsDraft(bhajan._id, cleaned);
      toast.success("Text extracted. Review it, then save lyrics.");
    } catch {
      toast.error("Could not extract text. You can still paste and save lyrics manually.");
    } finally {
      setOcrStates((current) => {
        const next = { ...current };
        delete next[bhajan._id];
        return next;
      });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Bhajan List</h1>
        <p className="text-sm text-muted-foreground">
          Upload bhajan photos, extract Gujarati lyrics, and show a clean reading screen from live mode.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add bhajan photo</CardTitle>
          <CardDescription>Images are stored as normal project files under the public folder.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 lg:grid-cols-[340px_1fr_auto]" onSubmit={uploadBhajan}>
            <button
              type="button"
              className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted text-muted-foreground transition hover:border-primary hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                pickFile(event.dataTransfer.files.item(0));
              }}
            >
              {previewUrl ? (
                <Image src={previewUrl} alt="" fill sizes="340px" className="object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm">
                  <ImagePlus className="h-8 w-8" />
                  Drop photo or browse
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => pickFile(event.target.files?.item(0) ?? null)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Morning bhajan" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional singer, tempo, or assembly note" />
              </div>
            </div>
            <div className="flex items-end">
              <Button disabled={saving} className="w-full lg:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total bhajans</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Available in live mode</p>
          <p className="mt-1 text-2xl font-semibold">{stats.active}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Lyrics screens ready</p>
          <p className="mt-1 text-2xl font-semibold">{stats.lyricsReady}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-card p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, notes, or lyrics"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          {(["all", "lyrics", "photo"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={lyricsFilter === value ? "default" : "outline"}
              onClick={() => setLyricsFilter(value)}
            >
              {value === "all" ? "All" : value === "lyrics" ? "Lyrics ready" : "Photo only"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredBhajans.map((bhajan) => (
          <Card key={bhajan._id} className="overflow-hidden">
            <div className="relative aspect-video bg-black">
              <Image src={bhajan.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 420px" className="object-contain" />
            </div>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="line-clamp-1 text-sm font-semibold">{bhajan.title}</h2>
                  {bhajan.notes ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{bhajan.notes}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={bhajan.active ? "default" : "outline"}>{bhajan.active ? "Active" : "Hidden"}</Badge>
                  <Badge variant={bhajan.lyricsText ? "secondary" : "outline"}>{bhajan.lyricsText ? "Lyrics ready" : "Photo only"}</Badge>
                </div>
              </div>
              <div className="space-y-3 rounded-md border bg-muted/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Audience lyrics</p>
                  </div>
                  {bhajan.lyricsUpdatedAt ? (
                    <span className="text-[11px] text-muted-foreground">
                      Updated {new Date(bhajan.lyricsUpdatedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <Textarea
                  className="min-h-36 resize-y bg-background font-sans text-sm leading-6"
                  placeholder="Paste or extract Gujarati lyrics here"
                  value={lyricsDrafts[bhajan._id] ?? bhajan.lyricsText ?? ""}
                  onChange={(event) => updateLyricsDraft(bhajan._id, event.target.value)}
                />
                {ocrStates[bhajan._id] ? (
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-background">
                      <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(8, ocrStates[bhajan._id].progress)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {ocrStates[bhajan._id].status} {ocrStates[bhajan._id].progress ? `${ocrStates[bhajan._id].progress}%` : ""}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => extractLyrics(bhajan)} disabled={Boolean(ocrStates[bhajan._id])}>
                    {ocrStates[bhajan._id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                    Extract Gujarati
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveLyrics(bhajan)}
                    disabled={savingLyricsId === bhajan._id || (lyricsDrafts[bhajan._id] ?? "") === (bhajan.lyricsText ?? "")}
                  >
                    {savingLyricsId === bhajan._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save lyrics
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={bhajan.active} onCheckedChange={(active) => updateBhajan(bhajan._id, { active })} />
                  Available in live mode
                </label>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteBhajan(bhajan._id)} aria-label="Delete bhajan">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!bhajans.length ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No bhajan photos yet. Upload your first lyric slide above.
        </div>
      ) : null}
      {bhajans.length > 0 && filteredBhajans.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No bhajans match this search or filter.
        </div>
      ) : null}
    </div>
  );
}

function cleanExtractedText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[|]{2,}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
