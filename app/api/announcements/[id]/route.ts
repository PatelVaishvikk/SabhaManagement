import { NextRequest, NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Announcement from "@/lib/models/Announcement";
import { announcementSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const parsed = announcementSchema.partial().parse(await request.json());
    const announcement = await Announcement.findByIdAndUpdate(params.id, parsed, { new: true, runValidators: true });
    if (!announcement) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    await pushActivity("Announcement updated");
    return NextResponse.json(announcement);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const announcement = await Announcement.findByIdAndDelete(params.id);
    if (!announcement) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    await pushActivity("Announcement deleted");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
