import { NextRequest, NextResponse } from "next/server";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";
import cloudinary from "@/lib/cloudinary";
import { uploadIdleImageToCloudinary } from "@/lib/uploadToCloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadIdleImageToCloudinary(buffer, file.name || "idle-image");

    // Delete old Cloudinary idle image if it exists
    const previous = await Settings.findOne().lean();
    if (previous?.idleImageFilePath) {
      try {
        await cloudinary.uploader.destroy(previous.idleImageFilePath, { resource_type: "image" });
      } catch {
        // Non-fatal — continue even if old image can't be deleted
      }
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      {
        idleImageUrl: upload.secureUrl,
        idleImageFilePath: upload.publicId  // store Cloudinary public_id for future deletion
      },
      { upsert: true, new: true, runValidators: true }
    );

    await pushActivity("Idle display image uploaded");
    return NextResponse.json(settings);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const previous = await Settings.findOne().lean();

    // Delete from Cloudinary if we have a public_id stored
    if (previous?.idleImageFilePath) {
      try {
        await cloudinary.uploader.destroy(previous.idleImageFilePath, { resource_type: "image" });
      } catch {
        // Non-fatal
      }
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      { idleImageUrl: "", idleImageFilePath: "" },
      { upsert: true, new: true, runValidators: true }
    );

    await pushActivity("Idle display image removed");
    return NextResponse.json(settings);
  } catch (error) {
    return apiError(error);
  }
}
