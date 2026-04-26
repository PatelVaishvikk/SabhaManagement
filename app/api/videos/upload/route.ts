import { NextResponse } from "next/server";
import { apiError, parseTags, pushActivity, requireAdmin } from "@/lib/api";
import { fieldValue, firstFile, parseMultipartForm } from "@/lib/formidable";
import { dbConnect } from "@/lib/mongodb";
import Video from "@/lib/models/Video";
import { CLOUDINARY_VIDEO_MAX_BYTES, CLOUDINARY_VIDEO_MAX_MB } from "@/lib/uploadLimits";
import { uploadVideoFileToCloudinary } from "@/lib/uploadToCloudinary";
import { videoMetadataSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const { fields, files } = await parseMultipartForm(request);
    const file = firstFile(files.file ?? files.video);

    if (!file) {
      return NextResponse.json({ error: "Missing video file" }, { status: 400 });
    }

    const originalFilename = file.originalFilename ?? "assembly-video.mp4";
    const isMp4 = file.mimetype === "video/mp4" || /\.mp4$/i.test(originalFilename);
    if (!isMp4) {
      return NextResponse.json({ error: "Only .mp4 video uploads are supported" }, { status: 400 });
    }

    if (file.size > CLOUDINARY_VIDEO_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `Cloudinary upload limit is ${CLOUDINARY_VIDEO_MAX_MB}MB for this account. Compress the file, use Google Drive, or upgrade Cloudinary.`
        },
        { status: 400 }
      );
    }

    const upload = await uploadVideoFileToCloudinary(file.filepath, originalFilename);
    const fallbackTitle = originalFilename.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");

    const metadata = videoMetadataSchema.parse({
      title: fieldValue(fields.title) || fallbackTitle,
      description: fieldValue(fields.description),
      category: fieldValue(fields.category) || "Announcement",
      tags: parseTags(fieldValue(fields.tags)),
      duration: Number(fieldValue(fields.duration)) || upload.duration
    });

    const video = await Video.create({
      ...metadata,
      sourceType: "cloudinary",
      cloudinaryUrl: upload.secureUrl,
      cloudinaryPublicId: upload.publicId,
      streamUrl: upload.secureUrl,
      thumbnailUrl: upload.thumbnailUrl
    });

    await pushActivity(`Video uploaded: ${video.title}`);

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Video upload failed", error);
    return apiError(error);
  }
}
