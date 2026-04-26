"use client";

import { Grid2X2, List, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UploadModal } from "@/components/UploadModal";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { fetchJson } from "@/lib/clientFetch";
import { categories } from "@/lib/validators";
import { useLibraryStore } from "@/stores/useLibraryStore";
import type { VideoDoc } from "@/types";

export default function LibraryPage() {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    view,
    search,
    category,
    sourceType,
    sort,
    selectedIds,
    setView,
    setSearch,
    setCategory,
    setSourceType,
    setSort,
    toggleSelected,
    clearSelected
  } = useLibraryStore();

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("category", category);
    params.set("sourceType", sourceType);
    params.set("sort", sort);
    return params.toString();
  }, [search, category, sourceType, sort]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchJson<VideoDoc[]>(`/api/videos?${query}`, [])
      .then((data) => {
        if (active) setVideos(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  function upsertVideo(video: VideoDoc) {
    setVideos((current) => {
      const exists = current.some((item) => item._id === video._id);
      if (exists) return current.map((item) => (item._id === video._id ? video : item));
      return [video, ...current];
    });
  }

  async function deleteVideo(id: string) {
    const response = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (response.ok) {
      setVideos((current) => current.filter((video) => video._id !== id));
      toast.success("Video deleted");
    }
  }

  async function bulkDelete() {
    const response = await fetch("/api/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });

    if (response.ok) {
      setVideos((current) => current.filter((video) => !selectedIds.includes(video._id)));
      clearSelected();
      toast.success("Selected videos deleted");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Video Library</h1>
          <p className="text-sm text-muted-foreground">Cloudinary uploads, YouTube links, and Google Drive references.</p>
        </div>
        <UploadModal onComplete={upsertVideo} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Library controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_170px_170px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title or tag" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="cloudinary">Cloudinary</SelectItem>
              <SelectItem value="gdrive">Drive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="mostPlayed">Most played</SelectItem>
              <SelectItem value="recentlyPlayed">Recently played</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant={view === "grid" ? "secondary" : "outline"} size="icon" onClick={() => setView("grid")} aria-label="Grid view">
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "outline"} size="icon" onClick={() => setView("list")} aria-label="List view">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <p className="text-sm">{selectedIds.length} selected</p>
          <Button variant="destructive" size="sm" onClick={bulkDelete}>
            <Trash2 className="h-4 w-4" />
            Bulk delete
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/3]" />
          ))}
        </div>
      ) : (
        <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "space-y-4"}>
          {videos.map((video, index) => (
            <VideoCard
              key={video._id}
              video={video}
              view={view}
              selected={selectedIds.includes(video._id)}
              onSelect={toggleSelected}
              onUpdate={upsertVideo}
              onDelete={deleteVideo}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
