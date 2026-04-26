import { NextRequest, NextResponse } from "next/server";
import { apiError, parseTags, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Video from "@/lib/models/Video";
import { fetchYouTubeMetadata } from "@/lib/utils/youtube";
import { videoMetadataSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const body = await request.json();
    const metadata = await fetchYouTubeMetadata(body.url);
    const duration = Number(body.duration || metadata.duration || 0);
    const parsed = videoMetadataSchema.parse({
      title: body.title || metadata.title,
      description: body.description || "",
      category: body.category || "Announcement",
      tags: parseTags(body.tags),
      duration
    });

    const video = await Video.create({
      ...parsed,
      sourceType: "youtube",
      youtubeId: metadata.youtubeId,
      streamUrl: `https://www.youtube.com/watch?v=${metadata.youtubeId}`,
      thumbnailUrl: metadata.thumbnailUrl
    });

    await pushActivity(`YouTube video added: ${video.title}`);

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
