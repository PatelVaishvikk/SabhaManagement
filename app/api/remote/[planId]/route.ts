import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import AssemblyPlan from "@/lib/models/AssemblyPlan";
import LiveState from "@/lib/models/LiveState";
import { verifyRemotePass } from "@/lib/remoteAuth";
import "@/lib/models/Bhajan";
import "@/lib/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RemoteAction =
  | "unlock"
  | "play"
  | "pause"
  | "stop"
  | "next"
  | "previous"
  | "goTo"
  | "idle"
  | "blank"
  | "logo"
  | "clear"
  | "message"
  | "bhajan"
  | "autoAdvance"
  | "mute"
  | "volume"
  | "seek";

export async function POST(request: NextRequest, { params }: { params: { planId: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!verifyRemotePass(body.pass)) {
      return NextResponse.json({ error: "Remote pass is incorrect" }, { status: 401 });
    }

    await dbConnect();
    const action = String(body.action ?? "unlock") as RemoteAction;
    const [plan, state] = await Promise.all([
      AssemblyPlan.findById(params.planId).populate("items.video").populate("bhajanItems.bhajan").lean(),
      LiveState.findOneAndUpdate(
        { planId: params.planId },
        { $setOnInsert: { planId: params.planId } },
        { upsert: true, new: true }
      ).lean()
    ]);

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (action === "unlock") return NextResponse.json({ ok: true });

    const itemCount = plan.items.length;
    const currentIndex = clampIndex(Number(state?.currentIndex ?? 0), itemCount);
    const projectorSeconds = Number(state?.projectorPlaybackSeconds ?? 0);
    const stateSeconds = Number(state?.playbackSeconds ?? 0);
    const incomingSeconds = typeof body.playbackSeconds === "number" ? body.playbackSeconds : undefined;
    const playbackSeconds = Math.max(0, incomingSeconds ?? projectorSeconds ?? stateSeconds ?? 0);
    const previousStatus = state?.playbackStatus === "playing" || state?.playbackStatus === "paused" ? state.playbackStatus : "stopped";
    const patch: Record<string, unknown> = {};

    switch (action) {
      case "play":
        Object.assign(patch, clearEmergency(), {
          playbackStatus: "playing",
          isPlaying: true,
          playbackSeconds
        });
        break;
      case "pause":
        Object.assign(patch, {
          playbackStatus: previousStatus === "stopped" ? "stopped" : "paused",
          isPlaying: false,
          playbackSeconds: previousStatus === "stopped" ? 0 : playbackSeconds
        });
        break;
      case "stop":
        Object.assign(patch, clearEmergency(), stoppedPatch());
        break;
      case "next": {
        const nextIndex = clampIndex(currentIndex + 1, itemCount);
        Object.assign(patch, clearEmergency(), indexPatch(nextIndex, previousStatus));
        break;
      }
      case "previous": {
        const nextIndex = clampIndex(currentIndex - 1, itemCount);
        Object.assign(patch, clearEmergency(), indexPatch(nextIndex, previousStatus));
        break;
      }
      case "goTo": {
        const nextIndex = clampIndex(Number(body.index ?? currentIndex), itemCount);
        Object.assign(patch, clearEmergency(), indexPatch(nextIndex, previousStatus));
        break;
      }
      case "idle":
        Object.assign(patch, stoppedPatch(), { emergencyMode: "idle", emergencyVideo: null, emergencyBhajan: null });
        break;
      case "blank":
        Object.assign(patch, stoppedPatch(), { emergencyMode: "blank", emergencyVideo: null, emergencyBhajan: null });
        break;
      case "logo":
        Object.assign(patch, stoppedPatch(), { emergencyMode: "logo", emergencyVideo: null, emergencyBhajan: null });
        break;
      case "clear":
        Object.assign(patch, clearEmergency(), stoppedPatch());
        break;
      case "message":
        Object.assign(patch, stoppedPatch(), {
          emergencyMode: "message",
          emergencyMessage: String(body.message || "Please stand by"),
          emergencyVideo: null,
          emergencyBhajan: null
        });
        break;
      case "bhajan":
        Object.assign(patch, stoppedPatch(), {
          emergencyMode: "bhajan",
          emergencyMessage: String(body.message || ""),
          emergencyVideo: null,
          emergencyBhajan: typeof body.bhajanId === "string" ? body.bhajanId : null
        });
        break;
      case "autoAdvance":
        patch.autoAdvance = Boolean(body.enabled);
        break;
      case "mute":
        patch.muted = typeof body.muted === "boolean" ? body.muted : !state?.muted;
        break;
      case "volume":
        if (typeof body.volume === "number") patch.volume = Math.max(0, Math.min(1, body.volume));
        break;
      case "seek":
        if (typeof body.playbackSeconds === "number") patch.playbackSeconds = Math.max(0, body.playbackSeconds);
        break;
      default:
        return NextResponse.json({ error: "Unknown remote command" }, { status: 400 });
    }

    const updated = await LiveState.findOneAndUpdate(
      { planId: params.planId },
      {
        $set: {
          ...patch,
          commandSource: "remote",
          commandName: action,
          commandIssuedAt: new Date()
        },
        $inc: { commandSeq: 1 },
        $setOnInsert: { planId: params.planId }
      },
      { upsert: true, new: true, runValidators: true }
    )
      .populate("emergencyBhajan")
      .populate("emergencyVideo")
      .lean();

    return NextResponse.json({ ok: true, liveState: updated });
  } catch (error) {
    return apiError(error, 500);
  }
}

function clampIndex(index: number, itemCount: number) {
  if (itemCount <= 0) return 0;
  return Math.max(0, Math.min(index, itemCount - 1));
}

function stoppedPatch() {
  return {
    playbackStatus: "stopped",
    isPlaying: false,
    playbackSeconds: 0
  };
}

function indexPatch(index: number, previousStatus: "playing" | "paused" | "stopped") {
  return {
    currentIndex: index,
    playbackSeconds: 0,
    playbackStatus: previousStatus,
    isPlaying: previousStatus === "playing"
  };
}

function clearEmergency() {
  return {
    emergencyMode: "none",
    emergencyMessage: "",
    emergencyVideo: null,
    emergencyBhajan: null
  };
}
