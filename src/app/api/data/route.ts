import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { refreshDashboard } from "../../../lib/dashboard";
import { errorResponse } from "../../../lib/http";
export async function GET() {
  try {
    return NextResponse.json(await refreshDashboard((await requireUser()).id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
