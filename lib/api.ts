import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import Settings from "@/lib/models/Settings";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function apiError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status });
}

export function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((tag): string[] => parseTags(tag));
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function pushActivity(event: string) {
  await Settings.findOneAndUpdate(
    {},
    {
      $push: {
        activityFeed: {
          $each: [{ event, at: new Date() }],
          $slice: -20
        }
      }
    },
    { upsert: true, new: true }
  );
}
