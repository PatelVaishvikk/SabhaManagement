import { NextRequest, NextResponse } from "next/server";
import { getDriveStreamUrl } from "@/lib/utils/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function getDriveUpstreamUrls(fileId: string): string[] {
  const encodedFileId = encodeURIComponent(fileId);
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  const urls: string[] = [];

  if (apiKey) {
    urls.push(`https://www.googleapis.com/drive/v3/files/${encodedFileId}?alt=media&key=${encodeURIComponent(apiKey)}`);
  }

  urls.push(getDriveStreamUrl(fileId));
  urls.push(`https://drive.usercontent.google.com/download?id=${encodedFileId}&export=download&confirm=t`);

  return urls;
}

function buildUpstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "video/*,application/octet-stream,*/*"
  };
  const range = request.headers.get("range");
  const ifRange = request.headers.get("if-range");

  if (range) headers.Range = range;
  if (ifRange) headers["If-Range"] = ifRange;

  return headers;
}

function responseHeadersFrom(upstream: Response): Headers {
  const headers = new Headers();
  const upstreamType = upstream.headers.get("content-type") ?? "";
  const contentType = upstreamType.includes("application/octet-stream") || !upstreamType ? "video/mp4" : upstreamType;

  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") ?? "bytes");
  headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");

  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

async function proxyDriveVideo(request: NextRequest, fileId: string, method: "GET" | "HEAD") {
  if (!DRIVE_ID_PATTERN.test(fileId)) {
    return NextResponse.json({ error: "Invalid Google Drive file id" }, { status: 400 });
  }

  let lastStatus = 502;

  for (const url of getDriveUpstreamUrls(fileId)) {
    try {
      const upstream = await fetch(url, {
        method,
        headers: buildUpstreamHeaders(request),
        redirect: "follow",
        cache: "no-store"
      });
      const contentType = upstream.headers.get("content-type") ?? "";
      lastStatus = upstream.status;

      if (!upstream.ok || contentType.includes("text/html")) {
        continue;
      }

      return new Response(method === "HEAD" ? null : upstream.body, {
        status: upstream.status,
        headers: responseHeadersFrom(upstream)
      });
    } catch {
      lastStatus = 502;
    }
  }

  return NextResponse.json(
    {
      error:
        "Google Drive could not provide a streamable video response. Make sure the file is shared as Anyone with the link can view, or add GOOGLE_DRIVE_API_KEY for public Drive API streaming."
    },
    { status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502 }
  );
}

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  return proxyDriveVideo(request, params.fileId, "GET");
}

export async function HEAD(request: NextRequest, { params }: { params: { fileId: string } }) {
  return proxyDriveVideo(request, params.fileId, "HEAD");
}
