import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the current remote control PIN to authenticated admins only. */
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const pin = process.env.REMOTE_CONTROL_PASS?.trim() ?? "";
  return NextResponse.json({ pin });
}
