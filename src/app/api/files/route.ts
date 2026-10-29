import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../../../lib/auth";
import { checkOrigin, errorResponse, limited } from "../../../lib/http";
import { AppError } from "../../../lib/security";
import { saveAttachment } from "../../../lib/storage";
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const user = await requireRole(["RESIDENT"]);
    await limited(`upload:${user.id}`, 12, 60);
    await limited("upload:global", 100, 60);
    if (Number(req.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new AppError("Максимум 5 МБ на фотографию", 413);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Выберите фотографию");
    return NextResponse.json(await saveAttachment(user.id, file));
  } catch (e) {
    return errorResponse(e);
  }
}
