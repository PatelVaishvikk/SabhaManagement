"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Eye, EyeOff, ImageIcon, KeyRound, Trash2, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { getCollegeDisplayName } from "@/lib/branding";
import { fetchJson } from "@/lib/clientFetch";
import { settingsSchema } from "@/lib/validators";
import type { AssemblyPlanDoc, SettingsDoc, VideoDoc } from "@/types";

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [idleUploading, setIdleUploading] = useState(false);
  const [remotePin, setRemotePin] = useState<string | null>(null);
  const [pinVisible, setPinVisible] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const idleInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema) as never,
    defaultValues: {
      collegeName: "HSAPSS Windsor",
      logoUrl: "",
      defaultDay: "Friday",
      defaultTime: "09:00",
      autoStopBehavior: "hard stop",
      autoAdvance: false,
      theme: "system"
    }
  });

  useEffect(() => {
    fetchJson<{ pin: string } | null>("/api/settings/remote-pin", null).then((data) => {
      if (data) setRemotePin(data.pin);
    });
  }, []);

  useEffect(() => {
    fetchJson<SettingsDoc | null>("/api/settings", null)
      .then((data) => {
        if (!data) return;
        setSettings(data);
        form.reset({
          collegeName: getCollegeDisplayName(data.collegeName),
          logoUrl: data.logoUrl ?? "",
          defaultDay: data.defaultDay,
          defaultTime: data.defaultTime,
          autoStopBehavior: data.autoStopBehavior,
          autoAdvance: data.autoAdvance,
          theme: data.theme
        });
        setTheme(data.theme);
      });
  }, [form, setTheme]);

  async function save(values: SettingsForm) {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (response.ok) {
      const updated = (await response.json()) as SettingsDoc;
      setSettings(updated);
      setTheme(values.theme);
      toast.success("Settings saved");
    }
  }

  async function uploadLogo(file: File | null) {
    if (!file) return;
    setLogoUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("collegeName", form.getValues("collegeName"));
    const response = await fetch("/api/upload/logo", { method: "POST", body: formData });
    setLogoUploading(false);

    if (response.ok) {
      const updated = (await response.json()) as SettingsDoc;
      setSettings(updated);
      form.setValue("logoUrl", updated.logoUrl ?? "");
      toast.success("Logo uploaded");
    } else {
      toast.error("Logo upload failed");
    }
  }

  async function uploadIdleImage(file: File | null) {
    if (!file) return;
    setIdleUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload/idle-image", { method: "POST", body: formData });
    setIdleUploading(false);

    if (response.ok) {
      const updated = (await response.json()) as SettingsDoc;
      setSettings(updated);
      toast.success("Idle display image saved");
    } else {
      const error = await response.json().catch(() => ({ error: "Idle image upload failed" }));
      toast.error(error.error ?? "Idle image upload failed");
    }
  }

  async function removeIdleImage() {
    const response = await fetch("/api/upload/idle-image", { method: "DELETE" });
    if (response.ok) {
      const updated = (await response.json()) as SettingsDoc;
      setSettings(updated);
      toast.success("Idle display image removed");
    } else {
      toast.error("Could not remove idle image");
    }
  }

  async function clearVideos() {
    if (!window.confirm("This will permanently delete ALL videos from the database and Cloudinary. This cannot be undone. Continue?")) return;
    const videos = await fetchJson<VideoDoc[]>("/api/videos", []);
    await fetch("/api/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: videos.map((video) => video._id) })
    });
    toast.success("Videos cleared");
  }

  async function resetPlans() {
    if (!window.confirm("This will permanently delete ALL assembly plans. This cannot be undone. Continue?")) return;
    const plans = await fetchJson<AssemblyPlanDoc[]>("/api/plans", []);
    await Promise.all(plans.map((plan) => fetch(`/api/plans/${plan._id}`, { method: "DELETE" })));
    toast.success("Plans reset");
  }

  const usedGb = settings?.cloudinaryUsage ? settings.cloudinaryUsage.usedBytes / 1024 / 1024 / 1024 : 0;
  const limitGb = settings?.cloudinaryUsage ? settings.cloudinaryUsage.limitBytes / 1024 / 1024 / 1024 : 25;
  const usagePercent = limitGb ? Math.min(100, (usedGb / limitGb) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
          <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="text-sm text-muted-foreground">{getCollegeDisplayName(settings?.collegeName)} identity, live defaults, local display photos, Cloudinary usage, and data reset controls.</p>
      </div>

      <form className="grid gap-5 xl:grid-cols-[1fr_420px]" onSubmit={form.handleSubmit(save)}>
        <Card>
          <CardHeader>
            <CardTitle>Assembly defaults</CardTitle>
            <CardDescription>Values used in live mode and new planning workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>College name</Label>
              <Input {...form.register("collegeName")} />
            </div>
            <div className="space-y-2">
              <Label>Default day</Label>
              <Input {...form.register("defaultDay")} />
            </div>
            <div className="space-y-2">
              <Label>Default time</Label>
              <Input type="time" {...form.register("defaultTime")} />
            </div>
            <div className="space-y-2">
              <Label>Auto-stop behavior</Label>
              <Select value={form.watch("autoStopBehavior")} onValueChange={(value) => form.setValue("autoStopBehavior", value as SettingsForm["autoStopBehavior"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn only">Warn only</SelectItem>
                  <SelectItem value="hard stop">Hard stop</SelectItem>
                  <SelectItem value="fade then stop">Fade then stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={form.watch("theme")} onValueChange={(value) => form.setValue("theme", value as SettingsForm["theme"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch checked={form.watch("autoAdvance")} onCheckedChange={(checked) => form.setValue("autoAdvance", checked)} />
              <Label>Auto-advance by default</Label>
            </div>
            <div className="md:col-span-2">
              <Button>Save settings</Button>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>College logo</CardTitle>
              <CardDescription>Stored in Cloudinary and referenced from settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.logoUrl ? (
                <Image src={settings.logoUrl} width={192} height={96} alt="" className="h-24 max-w-48 rounded-md border object-contain p-2" />
              ) : (
                <Badge variant="outline">No logo</Badge>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(event) => uploadLogo(event.target.files?.item(0) ?? null)} />
              <Button type="button" variant="outline" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {logoUploading ? "Uploading..." : "Upload logo"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Idle display photo</CardTitle>
              <CardDescription>Shown on the audience screen when no video is playing. Stored in public/uploads/idle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.idleImageUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-md border bg-black">
                  <Image src={settings.idleImageUrl} alt="" fill sizes="420px" className="object-contain" />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-md border bg-muted text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <input
                ref={idleInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => uploadIdleImage(event.target.files?.item(0) ?? null)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={idleUploading} onClick={() => idleInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {idleUploading ? "Saving..." : settings?.idleImageUrl ? "Replace photo" : "Upload photo"}
                </Button>
                {settings?.idleImageUrl ? (
                  <Button type="button" variant="ghost" className="text-destructive" onClick={removeIdleImage}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cloudinary usage</CardTitle>
              <CardDescription>Free tier reference limit is 25GB storage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">
                {settings?.cloudinaryUsage ? `${usedGb.toFixed(2)}GB used of ${limitGb.toFixed(0)}GB` : "Connect Cloudinary credentials to display live usage."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Remote control PIN
              </CardTitle>
              <CardDescription>Share this PIN with volunteers to unlock the mobile remote.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {remotePin !== null ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm tracking-wider">
                    {pinVisible ? remotePin : "•".repeat(remotePin.length)}
                  </code>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setPinVisible((v) => !v)}
                    aria-label={pinVisible ? "Hide PIN" : "Reveal PIN"}
                  >
                    {pinVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Could not load PIN — check REMOTE_CONTROL_PASS in .env.local.</p>
              )}
              <p className="text-xs text-muted-foreground">To change the PIN, update REMOTE_CONTROL_PASS in .env.local and restart the server.</p>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger zone
              </CardTitle>
              <CardDescription>These actions remove MongoDB metadata and Cloudinary videos where applicable.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button type="button" variant="destructive" onClick={clearVideos}>
                Clear all videos
              </Button>
              <Button type="button" variant="outline" onClick={resetPlans}>
                Reset all plans
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
