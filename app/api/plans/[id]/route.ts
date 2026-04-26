import { NextRequest, NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import AssemblyPlan from "@/lib/models/AssemblyPlan";
import "@/lib/models/Bhajan";
import "@/lib/models/Video";
import { planSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  await dbConnect();
  const plan = await AssemblyPlan.findById(params.id)
    .populate("items.video")
    .populate("bhajanItems.bhajan")
    .lean();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  return NextResponse.json(plan);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const body = await request.json();
    const parsed = planSchema.partial().parse(body);
    const plan = await AssemblyPlan.findByIdAndUpdate(params.id, parsed, { new: true, runValidators: true })
      .populate("items.video")
      .populate("bhajanItems.bhajan");

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    await pushActivity(plan.status === "completed" ? `Assembly completed: ${plan.title}` : `Plan updated: ${plan.title}`);

    return NextResponse.json(plan);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const plan = await AssemblyPlan.findByIdAndDelete(params.id);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    await pushActivity(`Plan deleted: ${plan.title}`);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
