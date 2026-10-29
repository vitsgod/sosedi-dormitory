import { beforeAll, afterAll, describe, test, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createDemoWorkspace } from "../../src/lib/demo";
import {
  bookMachine,
  startBooking,
  cancelBooking,
} from "../../src/features/laundry/service";
import {
  claimRequest,
  completeRequest,
  createRequest,
  createComplaint,
  setComplaintStatus,
} from "../../src/features/requests/service";
import { runScheduledJobs } from "../../src/features/notifications/service";
import { canReadAttachment } from "../../src/lib/storage";
import {
  registerUser,
  loginUser,
  approveUser,
  changeRole,
} from "../../src/lib/accounts";
import { getDashboard } from "../../src/lib/dashboard";
if (!process.env.DATABASE_URL?.includes("/dormitory_test"))
  throw new Error("Tests require dedicated dormitory_test database");
const db = new PrismaClient();
let ids: Awaited<ReturnType<typeof createDemoWorkspace>>;
const now = new Date("2026-11-03T05:00:00Z");
beforeAll(async () => {
  ids = await createDemoWorkspace();
});
afterAll(async () => {
  if (ids) await db.workspace.delete({ where: { id: ids.workspaceId } });
  await db.$disconnect();
});
describe("auth", () => {
  test("registration remains pending until admin approves", async () => {
    const u = await registerUser(
      {
        name: "Тестовый жилец",
        email: `u-${Date.now()}@example.test`,
        room: "222",
        password: "test-password-123",
      },
      ids.workspaceId,
    );
    expect(u.status).toBe("PENDING");
    await expect(
      bookMachine(
        u.id,
        {
          machineId: ids.machines[0].id,
          startsAt: now.toISOString(),
          durationMinutes: 60,
        },
        now,
      ),
    ).rejects.toThrow("подтверждения");
    await approveUser(ids.admin.id, u.id, "APPROVED");
    expect(
      (await loginUser(u.email, "test-password-123", ids.workspaceId)).id,
    ).toBe(u.id);
    await expect(
      loginUser(u.email, "wrong", ids.workspaceId),
    ).rejects.toThrow();
  });
  test("residents cannot grant roles and demo profiles are protected", async () => {
    await expect(
      changeRole(ids.resident.id, ids.master.id, "ADMIN", null),
    ).rejects.toThrow();
    await expect(
      changeRole(ids.admin.id, ids.master.id, "ADMIN", null),
    ).rejects.toThrow("демонстрационного");
  });
});
describe("laundry", () => {
  test("concurrent requests produce a single booking", async () => {
    const result = await Promise.allSettled(
      [1, 2].map(() =>
        bookMachine(
          ids.resident.id,
          {
            machineId: ids.machines[0].id,
            startsAt: now.toISOString(),
            durationMinutes: 60,
          },
          now,
        ),
      ),
    );
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  test("three concurrent machines allowed, fourth rejected", async () => {
    for (const m of ids.machines.slice(1, 3))
      await bookMachine(
        ids.resident.id,
        { machineId: m.id, startsAt: now.toISOString(), durationMinutes: 60 },
        now,
      );
    await expect(
      bookMachine(
        ids.resident.id,
        {
          machineId: ids.machines[3].id,
          startsAt: now.toISOString(),
          durationMinutes: 60,
        },
        now,
      ),
    ).rejects.toThrow("трёх");
  });
  test("strangers cannot cancel; grace period expires without page visit", async () => {
    const b = await db.booking.findFirstOrThrow({
      where: { userId: ids.resident.id, status: "BOOKED" },
    });
    await expect(cancelBooking(ids.admin.id, b.id, now)).rejects.toThrow();
    await runScheduledJobs(new Date(now.getTime() + 600001));
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    ).toBe("EXPIRED");
    await expect(
      startBooking(ids.resident.id, b.id, new Date(now.getTime() + 600001)),
    ).rejects.toThrow();
  });
  test("adjacent intervals and sequential reservations work", async () => {
    const first = await bookMachine(
      ids.resident.id,
      {
        machineId: ids.machines[0].id,
        startsAt: now.toISOString(),
        durationMinutes: 60,
      },
      now,
    );
    await bookMachine(
      ids.resident.id,
      {
        machineId: ids.machines[0].id,
        startsAt: first.endsAt.toISOString(),
        durationMinutes: 60,
      },
      now,
    );
    await startBooking(ids.resident.id, first.id, now);
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: first.id } })).status,
    ).toBe("RUNNING");
  });
});
describe("requests complaints files announcements jobs demo", () => {
  test("only one matching master claims and completes", async () => {
    const r = await createRequest(ids.resident.id, {
      title: "Течёт кран",
      description: "Кран в комнате протекает",
      specialty: "PLUMBER",
      room: "412",
      attachmentIds: [],
    });
    const second = await db.user.create({
      data: {
        workspaceId: ids.workspaceId,
        email: "second@example.test",
        name: "Мастер",
        room: "",
        passwordHash: "-",
        role: "MASTER",
        specialty: "PLUMBER",
        status: "APPROVED",
      },
    });
    const results = await Promise.allSettled(
      [ids.master.id, second.id].map((id) => claimRequest(id, r.id)),
    );
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const claimed = await db.maintenanceRequest.findUniqueOrThrow({
      where: { id: r.id },
    });
    await expect(completeRequest(ids.resident.id, r.id)).rejects.toThrow();
    await completeRequest(claimed.assigneeId!, r.id);
    expect(
      (await db.maintenanceRequest.findUniqueOrThrow({ where: { id: r.id } }))
        .status,
    ).toBe("DONE");
  });
  test("complaints stay private and change status without chat", async () => {
    const c = await createComplaint(ids.resident.id, {
      title: "Шум в коридоре",
      description: "Постоянный шум после отбоя",
      attachmentIds: [],
    });
    const masterData = await getDashboard(ids.master.id);
    expect(masterData.complaints).toHaveLength(0);
    await setComplaintStatus(ids.admin.id, c.id, "REVIEWING");
    expect(
      (await db.complaint.findUniqueOrThrow({ where: { id: c.id } })).status,
    ).toBe("REVIEWING");
    expect(
      await canReadAttachment(ids.master.id, {
        userId: ids.resident.id,
        complaintId: c.id,
        requestId: null,
      }),
    ).toBe(false);
  });
  test("wrong specialty cannot claim; expired announcements hidden", async () => {
    const r = await createRequest(ids.resident.id, {
      title: "Не работает розетка",
      description: "Розетка не работает у окна",
      specialty: "ELECTRICIAN",
      room: "412",
      attachmentIds: [],
    });
    await expect(claimRequest(ids.master.id, r.id)).rejects.toThrow();
    await db.announcement.create({
      data: {
        workspaceId: ids.workspaceId,
        title: "Старое",
        body: "Архив",
        category: "INFO",
        endsAt: new Date(0),
      },
    });
    expect(
      (await getDashboard(ids.resident.id)).announcements.some(
        (a) => a.title === "Старое",
      ),
    ).toBe(false);
  });
  test("repeated jobs never duplicate notifications and demo workspaces isolated", async () => {
    const date = new Date(now.getTime() + 3600000);
    await Promise.all([runScheduledJobs(date), runScheduledJobs(date)]);
    const before = await db.notification.count({
      where: { userId: ids.resident.id },
    });
    await runScheduledJobs(date);
    expect(
      await db.notification.count({ where: { userId: ids.resident.id } }),
    ).toBe(before);
    const other = await createDemoWorkspace();
    try {
      await expect(
        bookMachine(
          ids.resident.id,
          {
            machineId: other.machines[0].id,
            startsAt: now.toISOString(),
            durationMinutes: 60,
          },
          now,
        ),
      ).rejects.toThrow();
    } finally {
      await db.workspace.delete({ where: { id: other.workspaceId } });
    }
  });
});
