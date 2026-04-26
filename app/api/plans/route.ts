import { NextRequest, NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import AssemblyPlan from "@/lib/models/AssemblyPlan";
import "@/lib/models/Bhajan";
import "@/lib/models/Video";
import { planSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const plans = await AssemblyPlan.find({})
      .populate("items.video")
      .populate("bhajanItems.bhajan")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(plans);
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const body = await request.json();
    const parsed = planSchema.parse(body);
    const plan = await AssemblyPlan.create(parsed);

    await pushActivity(`Plan created: ${plan.title}`);

    const populated = await AssemblyPlan.findById(plan._id)
      .populate("items.video")
      .populate("bhajanItems.bhajan")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
