"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { fetchJson } from "@/lib/clientFetch";
import { announcementSchema } from "@/lib/validators";
import type { AnnouncementDoc } from "@/types";

type AnnouncementForm = z.infer<typeof announcementSchema>;

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);
  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema) as never,
    defaultValues: {
      text: "",
      type: "ticker",
      priority: "medium",
      scheduledAt: "",
      active: true
    }
  });

  useEffect(() => {
    fetchJson<AnnouncementDoc[]>("/api/announcements", []).then((data) => setAnnouncements(data));
  }, []);

  async function createAnnouncement(values: AnnouncementForm) {
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (response.ok) {
      const announcement = (await response.json()) as AnnouncementDoc;
      setAnnouncements((current) => [announcement, ...current]);
      form.reset({ text: "", type: "ticker", priority: "medium", scheduledAt: "", active: true });
      toast.success("Announcement created");
    }
  }

  async function updateAnnouncement(id: string, patch: Partial<AnnouncementDoc>) {
    const response = await fetch(`/api/announcements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });

    if (response.ok) {
      const announcement = (await response.json()) as AnnouncementDoc;
      setAnnouncements((current) => current.map((item) => (item._id === id ? announcement : item)));
    }
  }

  async function deleteAnnouncement(id: string) {
    const response = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAnnouncements((current) => current.filter((announcement) => announcement._id !== id));
      toast.success("Announcement deleted");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Announcements</h1>
        <p className="text-sm text-muted-foreground">Ticker and overlay messages poll into live mode every 5 seconds.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={form.handleSubmit(createAnnouncement)}>
            <div className="space-y-2 md:col-span-3">
              <Label>Text</Label>
              <Textarea {...form.register("text")} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.watch("type")} onValueChange={(value) => form.setValue("type", value as AnnouncementForm["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticker">Ticker</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.watch("priority")} onValueChange={(value) => form.setValue("priority", value as AnnouncementForm["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled time</Label>
              <Input placeholder="09:20" {...form.register("scheduledAt")} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.watch("active")} onCheckedChange={(checked) => form.setValue("active", checked)} />
              <Label>Active</Label>
            </div>
            <div className="md:col-span-2 md:flex md:justify-end">
              <Button>
                <Megaphone className="h-4 w-4" />
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {announcements.map((announcement) => (
          <Card key={announcement._id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{announcement.type}</Badge>
                    <Badge variant="outline">{announcement.priority}</Badge>
                    {announcement.scheduledAt ? <Badge variant="secondary">{announcement.scheduledAt}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm">{announcement.text}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={announcement.active} onCheckedChange={(active) => updateAnnouncement(announcement._id, { active })} />
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteAnnouncement(announcement._id)} aria-label="Delete announcement">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
