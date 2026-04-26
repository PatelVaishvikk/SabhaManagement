import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { fieldValue, firstFile, parseMultipartForm } from "@/lib/formidable";
import { dbConnect } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";
import { uploadImageToCloudinary } from "@/lib/uploadToCloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const { fields, files } = await parseMultipartForm(request);
    const file = firstFile(files.file ?? files.logo);

    if (!file) {
      return NextResponse.json({ error: "Missing logo file" }, { status: 400 });
    }

    const buffer = await fs.readFile(file.filepath);
    const upload = await uploadImageToCloudinary(buffer, file.originalFilename ?? "college-logo");
    const collegeName = fieldValue(fields.collegeName);

    const settings = await Settings.findOneAndUpdate(
      {},
      {
        $set: {
          logoUrl: upload.secureUrl,
          ...(collegeName ? { collegeName } : {})
        }
      },
      { upsert: true, new: true }
    );

    await pushActivity("College logo uploaded");
    return NextResponse.json(settings);
  } catch (error) {
    return apiError(error);
  }
}
