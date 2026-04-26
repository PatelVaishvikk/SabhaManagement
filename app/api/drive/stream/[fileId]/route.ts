import { NextRequest, NextResponse } from "next/server";
import { getDriveStreamUrl } from "@/lib/utils/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  if (!DRIVE_ID_PATTERN.test(params.fileId)) {
    return NextResponse.json({ error: "Invalid Google Drive file id" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  const fileId = encodeURIComponent(params.fileId);

  // If we have an API key, redirect to the direct REST API media stream
  // This bypasses the Google Drive "virus scan" HTML interstitial for large files
  if (apiKey) {
    const directUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${encodeURIComponent(apiKey)}`;
    return NextResponse.redirect(directUrl, { status: 302 });
  }

  // Fallback: Redirect to the classic download endpoint. 
  // For files >100MB, this may return an HTML scan warning and fail playback,
  // which is why the API key is highly recommended.
  return NextResponse.redirect(getDriveStreamUrl(params.fileId), { status: 302 });
}

export async function HEAD(request: NextRequest, { params }: { params: { fileId: string } }) {
  return GET(request, { params });
}
