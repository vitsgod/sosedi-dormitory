import { NextRequest } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { errorResponse } from "../../../../lib/http";
import { readAttachment } from "../../../../lib/storage";
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    const f = await readAttachment(u.id, (await ctx.params).id);
    return new Response(new Uint8Array(f.buffer), {
      headers: {
        "Content-Type": f.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
