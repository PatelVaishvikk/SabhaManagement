import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { apiError, pushActivity, requireAdmin } from "@/lib/api";
import { dbConnect } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";
import { settingsSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSettingsWithDefaults() {
  return Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true }).lean();
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const settings = await getSettingsWithDefaults();
    let cloudinaryUsage: { usedBytes: number; limitBytes: number } | undefined;

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const usage = await cloudinary.api.usage();
        cloudinaryUsage = {
          usedBytes: Number((usage as { storage?: { usage?: number } }).storage?.usage ?? 0),
          limitBytes: 25 * 1024 * 1024 * 1024
        };
      } catch {
        cloudinaryUsage = undefined;
      }
    }

    return NextResponse.json({ ...settings, cloudinaryUsage });
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await dbConnect();
    const parsed = settingsSchema.parse(await request.json());
    const settings = await Settings.findOneAndUpdate({}, { $set: parsed }, { upsert: true, new: true, runValidators: true });
    await pushActivity("Settings updated");
    return NextResponse.json(settings);
  } catch (error) {
    return apiError(error);
  }
}

