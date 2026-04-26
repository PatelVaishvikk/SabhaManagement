import { addWeeks } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import AssemblyPlan from "@/lib/models/AssemblyPlan";
import "@/lib/models/Bhajan";
import "@/lib/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const source = await AssemblyPlan.findById(params.id).lean();
    if (!source) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const date = body.newDate ? new Date(body.newDate) : addWeeks(new Date(source.date), 1);

    const duplicate = await AssemblyPlan.create({
      title: `${source.title} Copy`,
      date,
      description: source.description,
      status: "draft",
      items: source.items.map((item) => ({
        video: item.video,
        scheduledStart: item.scheduledStart,
        scheduledEnd: item.scheduledEnd,
        overrideDuration: item.overrideDuration,
        autoStop: item.autoStop,
        notes: item.notes
      })),
      bhajanItems: (source.bhajanItems ?? []).map((item) => ({
        bhajan: item.bhajan,
        notes: item.notes
      }))
    });

    await pushActivity(`Plan duplicated: ${duplicate.title}`);

    const populated = await AssemblyPlan.findById(duplicate._id)
      .populate("items.video")
      .populate("bhajanItems.bhajan")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
