import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Announcement from "@/lib/models/Announcement";
import AssemblyPlan from "@/lib/models/AssemblyPlan";
import LiveState from "@/lib/models/LiveState";
import Settings from "@/lib/models/Settings";
import "@/lib/models/Bhajan";
import "@/lib/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { planId: string } }) {
  try {
    await dbConnect();
    const [plan, settings, announcements, liveState] = await Promise.all([
      AssemblyPlan.findById(params.planId).populate("items.video").populate("bhajanItems.bhajan").lean(),
      Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true }).lean(),
      Announcement.find({ active: true }).sort({ priority: 1, createdAt: -1 }).lean(),
      LiveState.findOneAndUpdate(
        { planId: params.planId },
        { $setOnInsert: { planId: params.planId } },
        { upsert: true, new: true }
      )
        .populate("emergencyBhajan")
        .populate("emergencyVideo")
        .lean()
    ]);

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    return NextResponse.json({ plan, settings, announcements, liveState, serverTime: Date.now() });
  } catch (error) {
    return apiError(error, 500);
  }
}
