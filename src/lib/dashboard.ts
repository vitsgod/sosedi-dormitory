import { db } from "./db";
import { getActor } from "./accounts";
import { runScheduledJobs } from "../features/notifications/service";
export async function getPublicAnnouncements(
  workspaceId = "public",
  now = new Date(),
) {
  return db.announcement.findMany({
    where: { workspaceId, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}
export async function getDashboard(userId: string) {
  const user = await getActor(userId, ["RESIDENT", "MASTER", "ADMIN"]);
  const now = new Date();
  const [
    machines,
    bookings,
    requests,
    complaints,
    announcements,
    notifications,
    users,
    managedAnnouncements,
  ] = await Promise.all([
    db.machine.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { number: "asc" },
    }),
    db.booking.findMany({
      where: {
        machine: { workspaceId: user.workspaceId },
        endsAt: { gte: new Date(now.getTime() - 86400000) },
      },
      include: { machine: true },
      orderBy: { startsAt: "asc" },
    }),
    db.maintenanceRequest.findMany({
      where:
        user.role === "RESIDENT"
          ? { authorId: userId }
          : user.role === "MASTER"
            ? {
                author: { workspaceId: user.workspaceId },
                specialty: user.specialty ?? "",
                OR: [{ assigneeId: null }, { assigneeId: user.id }],
              }
            : { author: { workspaceId: user.workspaceId } },
      include: {
        author: { select: { name: true, room: true } },
        assignee: { select: { name: true } },
        attachments: { select: { id: true } },
        history: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    user.role === "MASTER"
      ? []
      : db.complaint.findMany({
          where:
            user.role === "ADMIN"
              ? { author: { workspaceId: user.workspaceId } }
              : { authorId: userId },
          include: {
            author: { select: { name: true, room: true } },
            attachments: { select: { id: true } },
            history: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
    getPublicAnnouncements(user.workspaceId),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    user.role === "ADMIN"
      ? db.user.findMany({
          where: { workspaceId: user.workspaceId },
          select: {
            id: true,
            name: true,
            email: true,
            room: true,
            role: true,
            specialty: true,
            status: true,
            isDemo: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
    user.role === "ADMIN"
      ? db.announcement.findMany({
          where: { workspaceId: user.workspaceId },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [],
  ]);
  return {
    user: {
      id: user.id,
      name: user.name,
      room: user.room,
      role: user.role,
      specialty: user.specialty,
      isDemo: user.isDemo,
    },
    machines,
    bookings: bookings.map((b) => ({
      ...b,
      userId: b.userId === userId ? b.userId : "other",
    })),
    requests,
    complaints,
    announcements,
    notifications,
    users,
    managedAnnouncements,
  };
}
export async function refreshDashboard(userId: string) {
  await runScheduledJobs();
  return getDashboard(userId);
}
