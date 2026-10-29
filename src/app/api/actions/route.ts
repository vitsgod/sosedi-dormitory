import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { checkOrigin, errorResponse, limited } from "../../../lib/http";
import { AppError } from "../../../lib/security";
import { getActor, approveUser, changeRole } from "../../../lib/accounts";
import { db } from "../../../lib/db";
import {
  bookMachine,
  startBooking,
  cancelBooking,
} from "../../../features/laundry/service";
import {
  createRequest,
  claimRequest,
  completeRequest,
  createComplaint,
  setComplaintStatus,
} from "../../../features/requests/service";
const idSchema = z.string().min(1).max(100);
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const u = await requireUser();
    await limited(`action:${u.id}`, 120, 1);
    const raw = await req.json();
    const action = z.string().parse(raw.action);
    let result: unknown;
    switch (action) {
      case "book":
        result = await bookMachine(
          u.id,
          z
            .object({
              machineId: idSchema,
              startsAt: z.iso.datetime({ offset: true }),
              durationMinutes: z.number(),
            })
            .parse(raw),
        );
        break;
      case "start":
        result = await startBooking(u.id, idSchema.parse(raw.id));
        break;
      case "cancel":
        result = await cancelBooking(u.id, idSchema.parse(raw.id));
        break;
      case "request":
        result = await createRequest(u.id, raw);
        break;
      case "claim":
        result = await claimRequest(u.id, idSchema.parse(raw.id));
        break;
      case "complete":
        result = await completeRequest(u.id, idSchema.parse(raw.id));
        break;
      case "complaint":
        result = await createComplaint(u.id, raw);
        break;
      case "complaint-status":
        result = await setComplaintStatus(
          u.id,
          idSchema.parse(raw.id),
          z.string().parse(raw.status),
        );
        break;
      case "approve":
        result = await approveUser(
          u.id,
          idSchema.parse(raw.id),
          z.string().parse(raw.status),
        );
        break;
      case "role":
        result = await changeRole(
          u.id,
          idSchema.parse(raw.id),
          z.string().parse(raw.role),
          raw.specialty ?? null,
        );
        break;
      case "read":
        await getActor(u.id, ["RESIDENT", "MASTER", "ADMIN"]);
        result = await db.notification.updateMany({
          where: {
            userId: u.id,
            ...(raw.id ? { id: idSchema.parse(raw.id) } : {}),
          },
          data: { read: true },
        });
        break;
      case "machine":
        await getActor(u.id, ["ADMIN"]);
        result = await db.machine.updateMany({
          where: { id: idSchema.parse(raw.id), workspaceId: u.workspaceId },
          data: { active: z.boolean().parse(raw.active) },
        });
        break;
      case "announcement": {
        await getActor(u.id, ["ADMIN"]);
        const data = z
          .object({
            title: z.string().trim().min(3).max(120),
            body: z.string().trim().min(10).max(3000),
            category: z.enum(["INFO", "WORKS", "MEETING"]),
            pinned: z.boolean(),
            startsAt: z.iso.datetime({ offset: true }),
            endsAt: z.iso.datetime({ offset: true }),
          })
          .parse(raw);
        if (new Date(data.endsAt) <= new Date(data.startsAt))
          throw new AppError("Окончание должно быть позже начала");
        result = await db.$transaction(async (tx) => {
          const a = await tx.announcement.create({
            data: { ...data, workspaceId: u.workspaceId },
          });
          if (a.pinned && a.startsAt <= new Date()) {
            const users = await tx.user.findMany({
              where: { workspaceId: u.workspaceId, status: "APPROVED" },
            });
            await tx.notification.createMany({
              data: users.map((user) => ({
                userId: user.id,
                eventKey: `announcement:${a.id}:${user.id}`,
                title: "Важное объявление",
                body: a.title,
                href: "/app?tab=announcements",
              })),
              skipDuplicates: true,
            });
          }
          return a;
        });
        break;
      }
      case "archive":
        await getActor(u.id, ["ADMIN"]);
        result = await db.announcement.updateMany({
          where: { id: idSchema.parse(raw.id), workspaceId: u.workspaceId },
          data: { endsAt: new Date() },
        });
        break;
      default:
        throw new AppError("Неизвестное действие");
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return errorResponse(e);
  }
}
