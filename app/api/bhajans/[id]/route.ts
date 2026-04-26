import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Bhajan from "@/lib/models/Bhajan";
import { deletePublicUpload } from "@/lib/publicUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bhajanUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  lyricsText: z.string().optional(),
  lyricsLanguage: z.string().optional(),
  order: z.coerce.number().min(0).optional(),
  active: z.boolean().optional()
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const parsed = bhajanUpdateSchema.parse(await request.json());
    const patch = {
      ...parsed,
      ...(typeof parsed.lyricsText === "string" ? { lyricsUpdatedAt: new Date() } : {})
    };
    const bhajan = await Bhajan.findByIdAndUpdate(params.id, patch, { new: true, runValidators: true });
    if (!bhajan) return NextResponse.json({ error: "Bhajan not found" }, { status: 404 });

    await pushActivity(`Bhajan updated: ${bhajan.title}`);
    return NextResponse.json(bhajan);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const bhajan = await Bhajan.findByIdAndDelete(params.id);
    if (!bhajan) return NextResponse.json({ error: "Bhajan not found" }, { status: 404 });

    await deletePublicUpload(bhajan.filePath);
    await pushActivity(`Bhajan deleted: ${bhajan.title}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
