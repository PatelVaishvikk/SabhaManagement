"use client";

import { CountdownTimer } from "@/components/CountdownTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TimerPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Countdown Timer</h1>
        <p className="text-sm text-muted-foreground">Standalone assembly countdown.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <CountdownTimer />
        </CardContent>
      </Card>
    </div>
  );
}
