import { NextRequest, NextResponse } from "next/server";
import { apiError, parseTags, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Video from "@/lib/models/Video";
import { extractDriveId, getDriveProxyStreamUrl, getDriveThumbnail } from "@/lib/utils/googleDrive";
import { videoMetadataSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const body = await request.json();
    const driveFileId = extractDriveId(body.url ?? "");
    if (!driveFileId) {
      return NextResponse.json({ error: "Invalid Google Drive link" }, { status: 400 });
    }

    const duration = Number(body.duration || 0);
    const parsed = videoMetadataSchema.parse({
      title: body.title || "Google Drive video",
      description: body.description || "",
      category: body.category || "Announcement",
      tags: parseTags(body.tags),
      duration
    });

    const video = await Video.create({
      ...parsed,
      sourceType: "gdrive",
      driveFileId,
      streamUrl: getDriveProxyStreamUrl(driveFileId),
      thumbnailUrl: getDriveThumbnail(driveFileId)
    });

    await pushActivity(`Google Drive video added: ${video.title}`);

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
