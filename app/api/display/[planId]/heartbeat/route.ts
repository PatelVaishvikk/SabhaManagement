import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import LiveState from "@/lib/models/LiveState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { planId: string } }) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const patch: Record<string, unknown> = {
      projectorLastSeenAt: new Date()
    };

    if (typeof body.enabled === "boolean") patch.projectorEnabled = body.enabled;
    if (typeof body.fullscreen === "boolean") patch.projectorFullscreen = body.fullscreen;
    if (["stopped", "playing", "paused"].includes(body.playbackStatus)) {
      patch.projectorPlaybackStatus = body.playbackStatus;
    }
    if (typeof body.playbackSeconds === "number") {
      patch.projectorPlaybackSeconds = Math.max(0, body.playbackSeconds);
    }
    if (["none", "blank", "logo", "message", "video", "idle", "bhajan"].includes(body.emergencyMode)) {
      patch.projectorEmergencyMode = body.emergencyMode;
    }
    if (typeof body.currentIndex === "number") patch.projectorCurrentIndex = Math.max(0, body.currentIndex);
    if (typeof body.videoId === "string") patch.projectorVideoId = body.videoId;

    await LiveState.findOneAndUpdate(
      { planId: params.planId },
      { $set: patch, $setOnInsert: { planId: params.planId } },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 500);
  }
}
