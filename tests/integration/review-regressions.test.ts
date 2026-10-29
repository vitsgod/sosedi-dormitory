import { test, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { db } from "../../src/lib/db";
import { createDemoWorkspace, seedWorkspace } from "../../src/lib/demo";
import { loginUser } from "../../src/lib/accounts";
import { runScheduledJobs } from "../../src/features/notifications/service";
import { bookMachine } from "../../src/features/laundry/service";
if (!process.env.DATABASE_URL?.includes("/dormitory_test"))
  throw new Error("Dedicated test DB required");
test("public seed never creates known-password non-demo residents", async () => {
  const w = await db.workspace.create({ data: { demo: false } });
  try {
    await seedWorkspace(w.id, true);
    expect(
      await db.user.count({
        where: { workspaceId: w.id, isDemo: false, status: "APPROVED" },
      }),
    ).toBe(0);
    await expect(
      loginUser("maria@demo.test", "Demo-password-2026", w.id),
    ).rejects.toThrow();
  } finally {
    await db.workspace.delete({ where: { id: w.id } });
  }
});
test("cleanup removes all files before deleting expired demo workspaces", async () => {
  const d = await createDemoWorkspace();
  const root = path.resolve(".local/review-uploads");
  const oldDir = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = root;
  const keys = Array.from({ length: 205 }, () => `${randomUUID()}.webp`);
  try {
    await mkdir(root, { recursive: true });
    await Promise.all(keys.map((k) => writeFile(path.join(root, k), "test")));
    await db.attachment.createMany({
      data: keys.map((storageKey) => ({
        userId: d.resident.id,
        storageKey,
        mime: "image/webp",
        createdAt: new Date(),
      })),
    });
    await db.workspace.update({
      where: { id: d.workspaceId },
      data: { createdAt: new Date(Date.now() - 9 * 86400000) },
    });
    await runScheduledJobs();
    expect(
      await db.workspace.findUnique({ where: { id: d.workspaceId } }),
    ).toBeNull();
    for (const k of keys)
      await expect(access(path.join(root, k))).rejects.toThrow();
  } finally {
    process.env.UPLOAD_DIR = oldDir;
    await db.workspace.deleteMany({ where: { id: d.workspaceId } });
  }
});
test("booking-triggered expiry still creates an expiry notification", async () => {
  const d = await createDemoWorkspace();
  const now = new Date("2026-11-03T05:00:00Z");
  try {
    const b = await bookMachine(
      d.resident.id,
      {
        machineId: d.machines[0].id,
        startsAt: now.toISOString(),
        durationMinutes: 60,
      },
      now,
    );
    await bookMachine(
      d.resident.id,
      {
        machineId: d.machines[0].id,
        startsAt: new Date(now.getTime() + 660000).toISOString(),
        durationMinutes: 60,
      },
      new Date(now.getTime() + 660000),
    );
    await runScheduledJobs(new Date(now.getTime() + 660000));
    expect(
      await db.notification.count({ where: { eventKey: `expired:${b.id}` } }),
    ).toBe(1);
  } finally {
    await db.workspace.deleteMany({ where: { id: d.workspaceId } });
  }
});
test("worker catches up reminders within the start grace period", async () => {
  const d = await createDemoWorkspace();
  const now = new Date("2026-11-03T05:00:00Z");
  try {
    const b = await bookMachine(
      d.resident.id,
      {
        machineId: d.machines[0].id,
        startsAt: now.toISOString(),
        durationMinutes: 60,
      },
      now,
    );
    await runScheduledJobs(new Date(now.getTime() + 120000));
    expect(
      await db.notification.count({ where: { eventKey: `reminder:${b.id}` } }),
    ).toBe(1);
  } finally {
    await db.workspace.deleteMany({ where: { id: d.workspaceId } });
  }
});
