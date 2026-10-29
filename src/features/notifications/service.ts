import { db } from "../../lib/db";
import { lockLaundry, expireBookings } from "../laundry/service";
import { cleanupAttachments } from "../../lib/storage";
export async function runScheduledJobs(now = new Date()) {
  let expired = 0,
    notificationsCreated = 0;
  const workspaces = await db.workspace.findMany({ select: { id: true } });
  for (const w of workspaces) {
    await db.$transaction(
      async (tx) => {
        await lockLaundry(tx, w.id);
        const due = await tx.booking.findMany({
          where: {
            machine: { workspaceId: w.id },
            status: "BOOKED",
            startsAt: { lte: new Date(now.getTime() - 600000) },
          },
        });
        expired += (await expireBookings(tx, w.id, now)).count;
        const active = await tx.booking.findMany({
          where: {
            machine: { workspaceId: w.id },
            status: { in: ["BOOKED", "RUNNING"] },
            startsAt: { lte: new Date(now.getTime() + 900000) },
          },
          include: { machine: true },
        });
        const notes = [
          ...due.map((b) => ({
            userId: b.userId,
            eventKey: `expired:${b.id}`,
            title: "Бронь освобождена",
            body: "Начало стирки не было подтверждено за 10 минут.",
            href: "/app?tab=laundry",
          })),
        ];
        for (const b of active) {
          if (b.status === "BOOKED")
            notes.push({
              userId: b.userId,
              eventKey: `reminder:${b.id}`,
              title: "Скоро ваша стирка",
              body: `Машинка № ${b.machine.number}. Не забудьте подтвердить начало.`,
              href: "/app?tab=laundry",
            });
          if (
            b.status === "RUNNING" &&
            new Date(b.startsAt.getTime() + b.durationMinutes * 60000) <= now
          )
            notes.push({
              userId: b.userId,
              eventKey: `finish:${b.id}`,
              title: "Стирка закончилась",
              body: `Заберите бельё из машинки № ${b.machine.number}.`,
              href: "/app?tab=laundry",
            });
        }
        if (notes.length)
          notificationsCreated += (
            await tx.notification.createMany({
              data: notes,
              skipDuplicates: true,
            })
          ).count;
        await tx.booking.updateMany({
          where: {
            machine: { workspaceId: w.id },
            status: "RUNNING",
            endsAt: { lte: now },
          },
          data: { status: "DONE" },
        });
      },
      { timeout: 15000 },
    );
  }
  const important = await db.announcement.findMany({
    where: { pinned: true, startsAt: { lte: now }, endsAt: { gt: now } },
    select: { id: true, workspaceId: true, title: true },
  });
  for (const a of important) {
    const users = await db.user.findMany({
      where: { workspaceId: a.workspaceId, status: "APPROVED" },
      select: { id: true },
    });
    if (users.length)
      notificationsCreated += (
        await db.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            eventKey: `announcement:${a.id}:${u.id}`,
            title: "Важное объявление",
            body: a.title,
            href: "/app?tab=announcements",
          })),
          skipDuplicates: true,
        })
      ).count;
  }
  await cleanupAttachments(now);
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.workspace.deleteMany({
    where: {
      demo: true,
      createdAt: { lt: new Date(now.getTime() - 8 * 86400000) },
    },
  });
  return { expired, notificationsCreated };
}
