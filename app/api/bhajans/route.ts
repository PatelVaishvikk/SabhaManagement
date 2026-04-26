import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Bhajan from "@/lib/models/Bhajan";
import { savePublicImage } from "@/lib/publicUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bhajanCreateSchema = z.object({
  title: z.string().min(1).default("Untitled bhajan"),
  notes: z.string().optional().default(""),
  lyricsText: z.string().optional().default(""),
  lyricsLanguage: z.string().optional().default("guj")
});

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const bhajans = await Bhajan.find({}).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json(bhajans);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Bhajan image is required" }, { status: 400 });
    }

    const parsed = bhajanCreateSchema.parse({
      title: formData.get("title") || "Untitled bhajan",
      notes: formData.get("notes") || "",
      lyricsText: formData.get("lyricsText") || "",
      lyricsLanguage: formData.get("lyricsLanguage") || "guj"
    });
    const latest = await Bhajan.findOne({}).sort({ order: -1 }).lean();
    const upload = await savePublicImage(file, "bhajans");
    const bhajan = await Bhajan.create({
      ...parsed,
      lyricsUpdatedAt: parsed.lyricsText ? new Date() : undefined,
      imageUrl: upload.url,
      filePath: upload.filePath,
      order: Number(latest?.order ?? 0) + 1,
      active: true
    });

    await pushActivity(`Bhajan photo uploaded: ${bhajan.title}`);
    return NextResponse.json(bhajan, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
