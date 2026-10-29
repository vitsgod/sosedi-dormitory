import { db } from "./db";
import { hashPassword } from "./security";
export async function seedWorkspace(workspaceId: string, demo = true) {
  const isolated = (
    await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } })
  ).demo;
  const passwordHash = await hashPassword("Demo-password-2026");
  const now = new Date();
  const users = await Promise.all(
    [
      {
        name: "Александр",
        email: "resident@demo.test",
        room: "412",
        role: "RESIDENT",
        specialty: null,
        status: "APPROVED",
        isDemo: demo,
      },
      {
        name: "Сергей Волков",
        email: "master@demo.test",
        room: "",
        role: "MASTER",
        specialty: "PLUMBER",
        status: "APPROVED",
        isDemo: demo,
      },
      {
        name: "Анна Смирнова",
        email: "admin@demo.test",
        room: "",
        role: "ADMIN",
        specialty: null,
        status: "APPROVED",
        isDemo: demo,
      },
      {
        name: "Мария Соколова",
        email: "maria@demo.test",
        room: "218",
        role: "RESIDENT",
        specialty: null,
        status: "APPROVED",
        isDemo: false,
      },
      {
        name: "Даниил Орлов",
        email: "danil@demo.test",
        room: "305",
        role: "RESIDENT",
        specialty: null,
        status: "PENDING",
        isDemo: false,
      },
    ].map((u) =>
      db.user.create({
        data: {
          ...u,
          isDemo: isolated ? u.isDemo : true,
          workspaceId,
          passwordHash,
        },
      }),
    ),
  );
  const machines = await Promise.all(
    [1, 2, 3, 4, 5].map((number) =>
      db.machine.create({ data: { workspaceId, number } }),
    ),
  );
  await db.announcement.createMany({
    data: [
      {
        workspaceId,
        title: "Собрание жильцов",
        body: "Обсудим жизнь общежития, предложения и планы студсовета. Место встречи — холл первого этажа. Точные время и дата указаны в периоде объявления. Это пример для демонстрации сервиса.",
        category: "MEETING",
        pinned: true,
        startsAt: new Date(now.getTime() - 3600000),
        endsAt: new Date(now.getTime() + 3 * 86400000),
      },
      {
        workspaceId,
        title: "Проверка водоснабжения",
        body: "В демонстрационном расписании запланированы технические работы. Перед реальным отключением здесь появится точный интервал и список затронутых помещений.",
        category: "WORKS",
        pinned: false,
        startsAt: new Date(now.getTime() - 86400000),
        endsAt: new Date(now.getTime() + 2 * 86400000),
      },
      {
        workspaceId,
        title: "Прачечная: правила записи",
        body: "Пять машинок доступны со вторника по воскресенье. Уборка с 07:00 до 08:00. Записывайтесь на сутки вперёд и подтверждайте начало стирки в течение 10 минут.",
        category: "INFO",
        pinned: false,
        startsAt: new Date(now.getTime() - 2 * 86400000),
        endsAt: new Date(now.getTime() + 30 * 86400000),
      },
    ],
  });
  await db.maintenanceRequest.create({
    data: {
      authorId: users[0].id,
      title: "Подтекает кран на кухне",
      description:
        "На четвёртом этаже подтекает кран холодной воды. После закрытия остаётся небольшая струйка.",
      specialty: "PLUMBER",
      room: "412",
      status: "NEW",
      history: { create: { status: "NEW" } },
    },
  });
  await db.maintenanceRequest.create({
    data: {
      authorId: users[3].id,
      title: "Не работает смеситель",
      description:
        "Ручка смесителя плохо поворачивается, вода не перекрывается до конца.",
      specialty: "PLUMBER",
      room: "218",
      assigneeId: users[1].id,
      status: "IN_PROGRESS",
      history: { create: [{ status: "NEW" }, { status: "IN_PROGRESS" }] },
    },
  });
  await db.complaint.create({
    data: {
      authorId: users[0].id,
      title: "Шум в коридоре после 23:00",
      description:
        "Несколько вечеров подряд в коридоре четвёртого этажа шумят после отбоя.",
      status: "REVIEWING",
      history: { create: [{ status: "RECEIVED" }, { status: "REVIEWING" }] },
    },
  });
  await db.notification.create({
    data: {
      userId: users[0].id,
      eventKey: `welcome:${users[0].id}`,
      title: "Вы дома. Всё под рукой.",
      body: "Это ваше отдельное демопространство. Попробуйте записаться на стирку или вызвать мастера.",
      href: "/app",
    },
  });
  return {
    workspaceId,
    resident: users[0],
    master: users[1],
    admin: users[2],
    machines,
  };
}
export async function createDemoWorkspace() {
  const w = await db.workspace.create({ data: { demo: true } });
  try {
    return await seedWorkspace(w.id);
  } catch (e) {
    await db.workspace.delete({ where: { id: w.id } });
    throw e;
  }
}
