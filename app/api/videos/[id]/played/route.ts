import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Video from "@/lib/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const video = await Video.findByIdAndUpdate(
      params.id,
      { $inc: { playCount: 1 }, $set: { lastPlayedAt: new Date() } },
      { new: true }
    );
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json(video);
  } catch (error) {
    return apiError(error);
  }
}
