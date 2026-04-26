import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { apiError, parseTags, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Video from "@/lib/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const sourceType = searchParams.get("sourceType");
    const sort = searchParams.get("sort") ?? "newest";

    const query: Record<string, unknown> = {};
    if (category && category !== "all") query.category = category;
    if (sourceType && sourceType !== "all") query.sourceType = sourceType;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      mostPlayed: { playCount: -1 },
      recentlyPlayed: { lastPlayedAt: -1 },
      duration: { duration: -1 }
    };

    const videos = await Video.find(query).sort(sortMap[sort] ?? sortMap.newest).lean();
    return NextResponse.json(videos);
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const { ids } = (await request.json()) as { ids?: string[] };
    if (!ids?.length) return NextResponse.json({ deleted: 0 });

    const videos = await Video.find({ _id: { $in: ids } }).lean();
    const cloudinaryResults = await Promise.all(
      videos
        .filter((video) => video.sourceType === "cloudinary" && video.cloudinaryPublicId)
        .map((video) => cloudinary.uploader.destroy(video.cloudinaryPublicId as string, { resource_type: "video", invalidate: true }))
    );

    const result = await Video.deleteMany({ _id: { $in: ids } });
    await pushActivity(`Bulk deleted ${result.deletedCount} video${result.deletedCount === 1 ? "" : "s"}`);

    return NextResponse.json({
      deleted: result.deletedCount,
      cloudinaryDeleted: cloudinaryResults.filter((item) => item.result === "ok" || item.result === "not found").length
    });
  } catch (error) {
    return apiError(error);
  }
}
