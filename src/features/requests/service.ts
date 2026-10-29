import { z } from "zod";
import { db } from "../../lib/db";
import { getActor, specialties } from "../../lib/accounts";
import { AppError } from "../../lib/security";
const baseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  attachmentIds: z.array(z.string()).max(3).default([]),
});
const requestSchema = baseSchema.extend({
  specialty: z.enum(specialties),
  room: z.string().trim().min(1).max(12),
});
async function checkAttachments(userId: string, ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new AppError("Повтор фотографии");
  if (
    (await db.attachment.count({
      where: { id: { in: ids }, userId, requestId: null, complaintId: null },
    })) !== ids.length
  )
    throw new AppError("Фотография недоступна", 403);
}
export async function createRequest(userId: string, input: unknown) {
  await getActor(userId, ["RESIDENT"]);
  const data = requestSchema.parse(input);
  await checkAttachments(userId, data.attachmentIds);
  return db.$transaction(async (tx) => {
    const r = await tx.maintenanceRequest.create({
      data: {
        authorId: userId,
        title: data.title,
        description: data.description,
        specialty: data.specialty,
        room: data.room,
        history: { create: { status: "NEW" } },
      },
    });
    const attached = await tx.attachment.updateMany({
      where: {
        id: { in: data.attachmentIds },
        userId,
        requestId: null,
        complaintId: null,
      },
      data: { requestId: r.id },
    });
    if (attached.count !== data.attachmentIds.length)
      throw new AppError("Фотография уже прикреплена", 409);
    return r;
  });
}
export async function claimRequest(masterId: string, id: string) {
  const master = await getActor(masterId, ["MASTER"]);
  return db.$transaction(async (tx) => {
    const result = await tx.maintenanceRequest.updateMany({
      where: {
        id,
        status: "NEW",
        specialty: master.specialty ?? "",
        author: { workspaceId: master.workspaceId },
      },
      data: { assigneeId: masterId, status: "IN_PROGRESS" },
    });
    if (!result.count)
      throw new AppError("Заявка уже принята или недоступна", 409);
    const r = await tx.maintenanceRequest.findUniqueOrThrow({ where: { id } });
    await tx.statusEvent.create({
      data: { requestId: id, status: "IN_PROGRESS" },
    });
    await tx.notification.create({
      data: {
        userId: r.authorId,
        eventKey: `request:${id}:work`,
        title: "Мастер взял заявку",
        body: r.title,
        href: "/app?tab=requests",
      },
    });
    return r;
  });
}
export async function completeRequest(masterId: string, id: string) {
  const master = await getActor(masterId, ["MASTER"]);
  return db.$transaction(async (tx) => {
    const changed = await tx.maintenanceRequest.updateMany({
      where: {
        id,
        assigneeId: masterId,
        status: "IN_PROGRESS",
        author: { workspaceId: master.workspaceId },
      },
      data: { status: "DONE" },
    });
    if (!changed.count) throw new AppError("Заявка недоступна", 403);
    const r = await tx.maintenanceRequest.findUniqueOrThrow({ where: { id } });
    await tx.statusEvent.create({ data: { requestId: id, status: "DONE" } });
    await tx.notification.create({
      data: {
        userId: r.authorId,
        eventKey: `request:${id}:done`,
        title: "Работы выполнены",
        body: r.title,
        href: "/app?tab=requests",
      },
    });
  });
}
export async function createComplaint(userId: string, input: unknown) {
  await getActor(userId, ["RESIDENT"]);
  const data = baseSchema.parse(input);
  await checkAttachments(userId, data.attachmentIds);
  return db.$transaction(async (tx) => {
    const c = await tx.complaint.create({
      data: {
        authorId: userId,
        title: data.title,
        description: data.description,
        history: { create: { status: "RECEIVED" } },
      },
    });
    const result = await tx.attachment.updateMany({
      where: {
        id: { in: data.attachmentIds },
        userId,
        requestId: null,
        complaintId: null,
      },
      data: { complaintId: c.id },
    });
    if (result.count !== data.attachmentIds.length)
      throw new AppError("Фотография уже прикреплена", 409);
    return c;
  });
}
export async function setComplaintStatus(
  adminId: string,
  id: string,
  status: string,
) {
  const admin = await getActor(adminId, ["ADMIN"]);
  if (!["RECEIVED", "REVIEWING", "RESOLVED"].includes(status))
    throw new AppError("Неверный статус");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Complaint" WHERE id=${id} FOR UPDATE`;
    const c = await tx.complaint.findFirst({
      where: { id, author: { workspaceId: admin.workspaceId } },
    });
    if (!c) throw new AppError("Жалоба не найдена", 404);
    if (c.status === status) return c;
    const result = await tx.complaint.update({
      where: { id },
      data: { status, history: { create: { status } } },
    });
    await tx.notification.create({
      data: {
        userId: c.authorId,
        eventKey: `complaint:${id}:${Date.now()}:${status}`,
        title: "Статус жалобы изменён",
        body: c.title,
        href: "/app?tab=complaints",
      },
    });
    return result;
  });
}
