import { NextResponse } from "next/server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ invoices: [] });
}
