import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "./db";
import { getActor } from "./accounts";
import { AppError } from "./security";
const root = () => path.resolve(process.env.UPLOAD_DIR || "uploads");
export async function canReadAttachment(
  userId: string,
  file: {
    userId: string;
    requestId: string | null;
    complaintId: string | null;
  },
) {
  const user = await getActor(userId, ["RESIDENT", "MASTER", "ADMIN"]);
  const author = await db.user.findUnique({ where: { id: file.userId } });
  if (!author || user.workspaceId !== author.workspaceId) return false;
  if (user.id === file.userId || user.role === "ADMIN") return true;
  if (file.requestId && user.role === "MASTER") {
    const r = await db.maintenanceRequest.findUnique({
      where: { id: file.requestId },
    });
    return (
      !!r &&
      r.specialty === user.specialty &&
      (r.assigneeId === null || r.assigneeId === user.id)
    );
  }
  return false;
}
export async function saveAttachment(userId: string, file: File) {
  await getActor(userId, ["RESIDENT"]);
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new AppError("Нужен JPEG, PNG или WebP до 5 МБ");
  const buffer = Buffer.from(await file.arrayBuffer());
  let image: Buffer;
  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: 25000000,
    }).metadata();
    const types: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    if (types[metadata.format || ""] !== file.type) throw new Error("format");
    image = await sharp(buffer, { limitInputPixels: 25000000 })
      .rotate()
      .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError("Файл не является допустимой фотографией");
  }
  const storageKey = `${randomUUID()}.webp`;
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), storageKey), image);
  return db.attachment.create({
    data: { userId, storageKey, mime: "image/webp" },
    select: { id: true },
  });
}
export async function readAttachment(userId: string, id: string) {
  const f = await db.attachment.findUnique({ where: { id } });
  if (!f || !(await canReadAttachment(userId, f)))
    throw new AppError("Файл недоступен", 404);
  return {
    buffer: await readFile(path.join(root(), f.storageKey)),
    mime: f.mime,
  };
}
export async function cleanupAttachments(now: Date) {
  const old = new Date(now.getTime() - 86400000),
    expired = new Date(now.getTime() - 8 * 86400000);
  const eligible = {
    OR: [
      { requestId: null, complaintId: null, createdAt: { lt: old } },
      { user: { workspace: { demo: true, createdAt: { lt: expired } } } },
    ],
  };
  const candidates = await db.attachment.findMany({
    where: eligible,
    select: { id: true },
  });
  for (const f of candidates)
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Attachment" WHERE id=${f.id} FOR UPDATE`;
      const current = await tx.attachment.findFirst({
        where: { id: f.id, ...eligible },
      });
      if (!current) return;
      try {
        await unlink(path.join(root(), current.storageKey));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      await tx.attachment.delete({ where: { id: f.id } });
    });
}
