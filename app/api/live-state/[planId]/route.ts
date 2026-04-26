import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import LiveState from "@/lib/models/LiveState";
import "@/lib/models/Bhajan";
import "@/lib/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getState(planId: string) {
  return LiveState.findOneAndUpdate(
    { planId },
    { $setOnInsert: { planId } },
    { upsert: true, new: true }
  )
    .populate("emergencyBhajan")
    .populate("emergencyVideo")
    .lean();
}

export async function GET(_: NextRequest, { params }: { params: { planId: string } }) {
  try {
    await dbConnect();
    const state = await getState(params.planId);
    return NextResponse.json(state);
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { planId: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const body = await request.json();
    const current = await LiveState.findOneAndUpdate(
      { planId: params.planId },
      { $setOnInsert: { planId: params.planId } },
      { upsert: true, new: true }
    );

    if (
      body.clientRole === "operator-sync" &&
      current?.commandSource === "remote" &&
      Number(current.commandSeq ?? 0) > Number(body.operatorSeenCommandSeq ?? 0)
    ) {
      const state = await LiveState.findOne({ planId: params.planId })
        .populate("emergencyBhajan")
        .populate("emergencyVideo")
        .lean();
      return NextResponse.json(state);
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.currentIndex === "number") patch.currentIndex = Math.max(0, body.currentIndex);
    if (typeof body.isPlaying === "boolean") patch.isPlaying = body.isPlaying;
    if (["stopped", "playing", "paused"].includes(body.playbackStatus)) {
      patch.playbackStatus = body.playbackStatus;
      patch.isPlaying = body.playbackStatus === "playing";
    }
    if (typeof body.playbackSeconds === "number") patch.playbackSeconds = Math.max(0, body.playbackSeconds);
    if (typeof body.volume === "number") patch.volume = Math.max(0, Math.min(1, body.volume));
    if (typeof body.muted === "boolean") patch.muted = body.muted;
    if (typeof body.autoAdvance === "boolean") patch.autoAdvance = body.autoAdvance;
    if (body.commandSource === "operator" || body.commandSource === "remote") patch.commandSource = body.commandSource;
    if (typeof body.commandName === "string") patch.commandName = body.commandName;
    if (typeof body.commandSeq === "number") patch.commandSeq = Math.max(0, body.commandSeq);
    if (typeof body.commandIssuedAt === "string" || body.commandIssuedAt instanceof Date) {
      patch.commandIssuedAt = new Date(body.commandIssuedAt);
    }
    if (["none", "blank", "logo", "message", "video", "idle", "bhajan"].includes(body.emergencyMode)) {
      patch.emergencyMode = body.emergencyMode;
    }
    if (typeof body.emergencyMessage === "string") patch.emergencyMessage = body.emergencyMessage;
    if (typeof body.emergencyVideo === "string" || body.emergencyVideo === null) {
      patch.emergencyVideo = body.emergencyVideo;
    }
    if (typeof body.emergencyBhajan === "string" || body.emergencyBhajan === null) {
      patch.emergencyBhajan = body.emergencyBhajan;
    }

    const state = await LiveState.findOneAndUpdate(
      { planId: params.planId },
      { $set: patch, $setOnInsert: { planId: params.planId } },
      { upsert: true, new: true, runValidators: true }
    )
      .populate("emergencyBhajan")
      .populate("emergencyVideo")
      .lean();

    return NextResponse.json(state);
  } catch (error) {
    return apiError(error, 500);
  }
}
