"use client";

import { Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectorLauncherProps {
  planId: string;
  className?: string;
}

export function ProjectorLauncher({ planId, className }: ProjectorLauncherProps) {
  function openProjectorWindow() {
    const url = `${window.location.origin}/display/${planId}?projector=1`;
    const width = 1280;
    const height = 720;
    const left = Math.max(0, window.screenX + 80);
    const top = Math.max(0, window.screenY + 60);
    const features = [
      "popup=yes",
      "menubar=no",
      "toolbar=no",
      "location=no",
      "status=no",
      "scrollbars=no",
      "resizable=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`
    ].join(",");

    const projectorWindow = window.open(url, "assembly-manager-projector", features);
    if (projectorWindow) {
      projectorWindow.focus();
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" variant="default" size="sm" className={cn("shrink-0", className)} onClick={openProjectorWindow}>
      <Tv className="h-4 w-4" />
      Projector
    </Button>
  );
}
