import { NextRequest, NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Announcement from "@/lib/models/Announcement";
import { announcementSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  await dbConnect();
  const activeOnly = new URL(request.url).searchParams.get("active") === "true";
  const query = activeOnly ? { active: true } : {};
  const announcements = await Announcement.find(query)
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  return NextResponse.json(announcements);
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const parsed = announcementSchema.parse(await request.json());
    const announcement = await Announcement.create(parsed);
    await pushActivity("Announcement created");
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
