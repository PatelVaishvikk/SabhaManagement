import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { apiError, parseTags, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Video from "@/lib/models/Video";
import { videoMetadataSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  await dbConnect();
  const video = await Video.findById(params.id).lean();
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json(video);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const body = await request.json();
    const parsed = videoMetadataSchema.partial().parse({
      ...body,
      tags: Array.isArray(body.tags) ? body.tags : parseTags(body.tags)
    });

    const video = await Video.findByIdAndUpdate(params.id, parsed, { new: true, runValidators: true });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    await pushActivity(`Video updated: ${video.title}`);
    return NextResponse.json(video);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const video = await Video.findById(params.id);
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    let cloudinaryDeleted = false;
    if (video.sourceType === "cloudinary" && video.cloudinaryPublicId) {
      const result = await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: "video", invalidate: true });
      cloudinaryDeleted = result.result === "ok" || result.result === "not found";
    }

    await video.deleteOne();
    await pushActivity(`Video deleted: ${video.title}`);

    return NextResponse.json({ deleted: true, cloudinaryDeleted });
  } catch (error) {
    return apiError(error);
  }
}
