import { db } from "../../lib/db";
import { getActor } from "../../lib/accounts";
import { AppError } from "../../lib/security";
import { validateBooking } from "./rules";
import type { Prisma } from "@prisma/client";
export async function lockLaundry(
  tx: Prisma.TransactionClient,
  workspaceId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
}
export async function expireBookings(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  now: Date,
) {
  const where = {
    machine: { workspaceId },
    status: "BOOKED",
    startsAt: { lte: new Date(now.getTime() - 600000) },
  };
  const due = await tx.booking.findMany({
    where,
    select: { id: true, userId: true },
  });
  const result = await tx.booking.updateMany({
    where,
    data: { status: "EXPIRED" },
  });
  if (due.length)
    await tx.notification.createMany({
      data: due.map((b) => ({
        userId: b.userId,
        eventKey: `expired:${b.id}`,
        title: "Бронь освобождена",
        body: "Начало стирки не было подтверждено за 10 минут.",
        href: "/app?tab=laundry",
      })),
      skipDuplicates: true,
    });
  return result;
}
export async function bookMachine(
  userId: string,
  input: { machineId: string; startsAt: string; durationMinutes: number },
  now = new Date(),
) {
  const user = await getActor(userId, ["RESIDENT"]);
  const start = new Date(input.startsAt);
  const end = validateBooking(start, input.durationMinutes, now);
  return db.$transaction(
    async (tx) => {
      await lockLaundry(tx, user.workspaceId);
      await expireBookings(tx, user.workspaceId, now);
      const machine = await tx.machine.findFirst({
        where: {
          id: input.machineId,
          workspaceId: user.workspaceId,
          active: true,
        },
      });
      if (!machine) throw new AppError("Машинка недоступна", 404);
      const overlapping = await tx.booking.findMany({
        where: {
          userId,
          status: { in: ["BOOKED", "RUNNING"] },
          startsAt: { lt: end },
          endsAt: { gt: start },
        },
      });
      const points = overlapping
        .flatMap((b) => [
          { t: Math.max(b.startsAt.getTime(), start.getTime()), delta: 1 },
          { t: Math.min(b.endsAt.getTime(), end.getTime()), delta: -1 },
        ])
        .sort((a, b) => a.t - b.t || a.delta - b.delta);
      let count = 0;
      for (const p of points) {
        count += p.delta;
        if (count >= 3)
          throw new AppError(
            "Можно занять не больше трёх машинок одновременно",
            409,
          );
      }
      if (
        await tx.booking.findFirst({
          where: {
            machineId: machine.id,
            status: { in: ["BOOKED", "RUNNING"] },
            startsAt: { lt: end },
            endsAt: { gt: start },
          },
        })
      )
        throw new AppError("Это время уже заняли. Выберите другой сеанс", 409);
      const booking = await tx.booking.create({
        data: {
          userId,
          machineId: machine.id,
          startsAt: start,
          endsAt: end,
          durationMinutes: input.durationMinutes,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          eventKey: `booking:${booking.id}`,
          title: "Стирка забронирована",
          body: `Машинка № ${machine.number}. Подтвердите начало в течение 10 минут.`,
          href: "/app?tab=laundry",
        },
      });
      return booking;
    },
    { timeout: 15000 },
  );
}
export async function startBooking(
  userId: string,
  id: string,
  now = new Date(),
) {
  const u = await getActor(userId, ["RESIDENT"]);
  return db.$transaction(async (tx) => {
    await lockLaundry(tx, u.workspaceId);
    await expireBookings(tx, u.workspaceId, now);
    const b = await tx.booking.findFirst({
      where: { id, userId, status: "BOOKED" },
    });
    if (!b || b.startsAt > now)
      throw new AppError("Сеанс ещё не начался или бронь уже истекла", 409);
    return tx.booking.update({ where: { id }, data: { status: "RUNNING" } });
  });
}
export async function cancelBooking(
  userId: string,
  id: string,
  now = new Date(),
) {
  const u = await getActor(userId, ["RESIDENT"]);
  return db.$transaction(async (tx) => {
    await lockLaundry(tx, u.workspaceId);
    const b = await tx.booking.findFirst({
      where: { id, userId, status: "BOOKED", startsAt: { gt: now } },
    });
    if (!b) throw new AppError("Отменить можно только свою будущую бронь", 403);
    await tx.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  });
}
