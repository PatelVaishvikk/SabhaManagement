import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail?: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
          {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
